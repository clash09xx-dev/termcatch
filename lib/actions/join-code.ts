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
import { notifyOwnerNewRequest } from "@/lib/employee/join-notifications";

/**
 * Salon join codes — the specialist-initiated half of team building.
 *
 * WHAT A CODE IS WORTH
 * A code buys exactly one capability: the right to ASK to join. It used to buy
 * membership outright — type the string, get an Employee row, a role change, a
 * seat in the salon panel and a place in the public team list, with no owner in
 * the loop. Codes get forwarded, photographed off a printout and kept by people
 * who left, so "holds the code" was standing in for a claim it cannot support.
 *
 *     join code  → a PENDING EmployeeJoinRequest
 *     owner approval → the Employee row, and only then a salon context
 *
 * Nothing between those two steps grants anything: no Employee row exists, the
 * account role is untouched, and lib/ownership resolveBusinessAccess (which
 * requires an ACTIVE Employee row) keeps returning "none". The guarantee is
 * structural rather than a check someone has to remember to write.
 *
 * Authorization rules that this file exists to enforce:
 *   - only a salon OWNER can read or regenerate their own code
 *   - applying can never make someone an owner, and never touches an existing
 *     owner/admin role
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
  | { ok: true; businessName: string; status: "pending" | "already_member" }
  | { ok: false; error: string };

/**
 * Apply to a salon with a code. Creates a PENDING request — never a membership.
 *
 * Deliberate behaviours:
 *   - an unknown code and a malformed code return the SAME message, so the
 *     response cannot be used to tell "this code exists" from "it does not"
 *   - the salon's name is only returned once the code has actually validated
 *   - NO Employee row is created and the account role is NOT changed; both of
 *     those are what approval does
 *   - re-applying reuses the one request row per (salon, person), so a person
 *     tapping twice does not fill the owner's queue with duplicates
 *   - someone already on the team is told so instead of being queued again
 */
export async function requestJoinByCode(rawCode: string): Promise<JoinResult> {
  const { dict } = await getServerI18n();
  const T = dict.pages.joinSalon;

  const user = await getServerUser();
  if (!user) return { ok: false, error: dict.errors.forbidden };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, firstName: true, lastName: true },
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

  // Already on the team (however they got there) — nothing to request.
  const existing = await prisma.employee.findFirst({
    where: { businessId: business.id, userId: dbUser.id, isActive: true },
    select: { id: true },
  });
  if (existing) {
    clearAttempts(dbUser.id);
    return { ok: true, businessName: business.name, status: "already_member" };
  }

  // One row per (salon, person). Re-applying after a rejection resets it to
  // PENDING and clears the previous decision, so the owner sees a fresh
  // request rather than a stale "rejected" they have to reason about.
  const existingRequest = await prisma.employeeJoinRequest.findUnique({
    where: { businessId_userId: { businessId: business.id, userId: dbUser.id } },
    select: { status: true },
  });

  await prisma.employeeJoinRequest.upsert({
    where: { businessId_userId: { businessId: business.id, userId: dbUser.id } },
    create: { businessId: business.id, userId: dbUser.id, status: "PENDING" },
    update: { status: "PENDING", decidedAt: null, decidedBy: null, blockedAt: null },
  });

  clearAttempts(dbUser.id);

  // Only ping the owner on a genuinely new application. Someone re-opening the
  // settings page and re-submitting the same code should not re-notify.
  if (existingRequest?.status !== "PENDING") {
    await notifyOwnerNewRequest({
      ownerUserId: business.ownerId,
      businessId: business.id,
      businessName: business.name,
      applicantName: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
    });
  }

  // The owner's team page gains a pending row; the applicant's settings gain a
  // status. Nothing about the SHELL changes yet — that happens at approval.
  revalidatePath("/business/staff");
  revalidatePath("/customer/profile");
  return { ok: true, businessName: business.name, status: "pending" };
}
