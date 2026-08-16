"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getServerI18n } from "@/lib/i18n/server";
import {
  generateJoinCode,
  isWellFormedJoinCode,
  normalizeJoinCode,
} from "@/lib/employee/join-code";

/**
 * Salon join codes — the specialist-initiated half of team building.
 *
 * The e-mail invitation flow (lib/actions/employee-invitations.ts) is
 * owner-initiated: the owner already knows the person's address and creates the
 * Employee row for them. This flow is the other direction — the specialist
 * already has a TermCatch account and types the salon's code to attach
 * themselves. Both end in the same place: an Employee row linked to a User,
 * which is the only membership record the product has.
 *
 * Authorization rules that this file exists to enforce:
 *   - only a salon OWNER can read or regenerate their own code
 *   - joining grants the EMPLOYEE role and nothing more; it can never make
 *     someone an owner, and it never touches an existing owner/admin role
 *   - nothing about the salon is revealed before the code validates
 */

// ── Owner side ───────────────────────────────────────────────

type OwnerCtx = { userId: string; businessId: string; businessName: string };

async function ownerCtx(): Promise<OwnerCtx | null> {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, ownedBusinesses: { take: 1, select: { id: true, name: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!dbUser || !business) return null;
  return { userId: dbUser.id, businessId: business.id, businessName: business.name };
}

/**
 * Mint a code that is not already taken.
 *
 * `joinCode` is unique, so a collision is a write error rather than a silent
 * overwrite. Collisions are vanishingly unlikely at 26^8, but retrying a few
 * times costs nothing and turns "astronomically unlikely" into "handled".
 */
async function mintUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode();
    const taken = await prisma.business.findUnique({ where: { joinCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error("join_code_mint_failed");
}

export type JoinCodeResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

/**
 * The salon's current code, minted on first read.
 *
 * Lazy creation means existing salons do not need a backfill: the first owner
 * who opens the team page gets a code, and salons that never use the feature
 * never carry one.
 */
export async function getJoinCode(): Promise<JoinCodeResult> {
  const { dict } = await getServerI18n();
  const ctx = await ownerCtx();
  if (!ctx) return { ok: false, error: dict.errors.forbidden };

  const business = await prisma.business.findUnique({
    where: { id: ctx.businessId },
    select: { joinCode: true },
  });
  if (business?.joinCode) return { ok: true, code: business.joinCode };

  try {
    const code = await mintUniqueCode();
    await prisma.business.update({
      where: { id: ctx.businessId },
      data: { joinCode: code, joinCodeUpdatedAt: new Date() },
    });
    return { ok: true, code };
  } catch {
    return { ok: false, error: dict.errors.generic };
  }
}

/**
 * Replace the code. The previous value stops working the moment this returns —
 * anyone still holding it gets "unknown code", which is exactly the point of
 * the confirmation the UI shows before calling this.
 */
export async function regenerateJoinCode(): Promise<JoinCodeResult> {
  const { dict } = await getServerI18n();
  const ctx = await ownerCtx();
  if (!ctx) return { ok: false, error: dict.errors.forbidden };

  try {
    const code = await mintUniqueCode();
    await prisma.business.update({
      where: { id: ctx.businessId },
      data: { joinCode: code, joinCodeUpdatedAt: new Date() },
    });
    revalidatePath("/business/staff");
    return { ok: true, code };
  } catch {
    return { ok: false, error: dict.errors.generic };
  }
}

// ── Specialist side ──────────────────────────────────────────

/**
 * Attempt throttling.
 *
 * The window is per authenticated user, not per IP, because the action is only
 * reachable with a session — so an attacker has to burn an account to spend
 * attempts, and one account buys 8 guesses an hour against a 2.1e11 space.
 *
 * Deliberately in-process: the project has no shared rate-limit store, and
 * inventing a Redis dependency for this one call would be a bigger change than
 * the feature. On a multi-instance deploy each instance keeps its own counter,
 * which loosens the limit by the instance count and still leaves guessing
 * hopeless. If a shared limiter is ever added, this is the one call site to move.
 */
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(userId: string): boolean {
  const now = Date.now();
  const rec = attempts.get(userId);
  if (!rec || now > rec.resetAt) {
    attempts.set(userId, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

/** A successful join clears the counter — the user proved they had a real code. */
function clearAttempts(userId: string): void {
  attempts.delete(userId);
}

export type JoinResult =
  | { ok: true; businessName: string }
  | { ok: false; error: string };

/**
 * Join a salon with a code.
 *
 * Deliberate behaviours:
 *   - an unknown code and a malformed code return the SAME message, so the
 *     response cannot be used to tell "this code exists" from "it does not"
 *   - the salon's name is only returned once the join has actually happened
 *   - an existing Employee row for this user is reused (re-joining is a no-op,
 *     and a row the owner pre-created by e-mail gets linked rather than
 *     duplicated)
 *   - the role becomes EMPLOYEE only when the account is currently a plain
 *     CUSTOMER: an owner who also works at another salon keeps BUSINESS_OWNER,
 *     and an admin is never demoted
 */
export async function joinBusinessByCode(rawCode: string): Promise<JoinResult> {
  const { dict } = await getServerI18n();
  const T = dict.pages.joinSalon;

  const user = await getServerUser();
  if (!user) return { ok: false, error: dict.errors.forbidden };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
  });
  if (!dbUser) return { ok: false, error: dict.errors.forbidden };

  if (tooManyAttempts(dbUser.id)) return { ok: false, error: T.errTooMany };

  const code = normalizeJoinCode(String(rawCode ?? ""));
  // Shape and existence failures are indistinguishable to the caller on purpose.
  if (!isWellFormedJoinCode(code)) return { ok: false, error: T.errUnknown };

  const business = await prisma.business.findUnique({
    where: { joinCode: code },
    select: { id: true, name: true, ownerId: true },
  });
  if (!business) return { ok: false, error: T.errUnknown };

  // The owner does not "join" their own salon; they already own it.
  if (business.ownerId === dbUser.id) return { ok: false, error: T.errOwnSalon };

  const existing = await prisma.employee.findFirst({
    where: { businessId: business.id, userId: dbUser.id },
    select: { id: true },
  });
  if (existing) {
    clearAttempts(dbUser.id);
    return { ok: true, businessName: business.name };
  }

  // An owner may have already created the person by e-mail. Adopt that row
  // instead of creating a second one for the same human.
  const pending = dbUser.email
    ? await prisma.employee.findFirst({
        where: { businessId: business.id, userId: null, email: dbUser.email },
        select: { id: true },
      })
    : null;

  await prisma.$transaction(async (tx) => {
    if (pending) {
      await tx.employee.update({
        where: { id: pending.id },
        data: { userId: dbUser.id, isActive: true },
      });
    } else {
      await tx.employee.create({
        data: {
          businessId: business.id,
          userId: dbUser.id,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          email: dbUser.email,
          phone: dbUser.phone,
          // A new joiner is visible in the team but not yet taking bookings —
          // the owner decides that after assigning services and hours.
          isActive: true,
          isAccepting: false,
        },
      });
    }

    // Only ever an upgrade from plain customer. Never a demotion, never owner.
    if (dbUser.role === "CUSTOMER") {
      await tx.user.update({ where: { id: dbUser.id }, data: { role: "EMPLOYEE" } });
    }
  });

  clearAttempts(dbUser.id);
  // Joining changes what the SHELL may show, not just what a page renders: the
  // Client/Salon switch lives in the customer and employee LAYOUTS, and the
  // employee routes only became reachable a moment ago. Revalidating the pages
  // alone left the cached layouts in place, which is why the account looked
  // untouched after a successful join — the membership row existed and nothing
  // on screen knew about it.
  revalidatePath("/business/staff");
  revalidatePath("/customer", "layout");
  revalidatePath("/employee", "layout");
  return { ok: true, businessName: business.name };
}
