import { prisma } from "@/lib/prisma";
import {
  WELCOME_CODE,
  WELCOME_MAX_REDEMPTIONS,
  evaluateWelcomeEligibility,
  type WelcomeEligibility,
} from "@/lib/subscription";
import type { Prisma } from "@prisma/client";

// A slot counts against the cap while held (PENDING) or consumed (REDEEMED).
// RELEASED (abandoned checkout) frees it.
const HELD = ["PENDING", "REDEEMED"] as const;

/**
 * Preliminary, NON-consuming eligibility check for the UI and pre-checkout.
 * Reading the ledger never reserves a slot — entering the code in a form does
 * not consume it. `configured` is passed in (welcomeConfigured()).
 */
export async function checkWelcomeEligibility(input: {
  code: string;
  businessId: string;
  ownerId: string;
  configured: boolean;
}): Promise<WelcomeEligibility> {
  const codeMatches = input.code.trim().toUpperCase() === WELCOME_CODE;
  if (!codeMatches) return { eligible: false, reason: "bad_code" };

  const [slotsUsed, mine] = await Promise.all([
    prisma.promoRedemption.count({ where: { code: WELCOME_CODE, status: { in: [...HELD] } } }),
    prisma.promoRedemption.findFirst({
      where: {
        code: WELCOME_CODE,
        status: { in: [...HELD] },
        OR: [{ businessId: input.businessId }, { ownerId: input.ownerId }],
      },
      select: { id: true },
    }),
  ]);

  return evaluateWelcomeEligibility({
    configured: input.configured,
    codeMatches,
    slotsUsed,
    cap: WELCOME_MAX_REDEMPTIONS,
    alreadyRedeemed: Boolean(mine),
  });
}

export type ReserveResult =
  | { ok: true; reservationId: string }
  | { ok: false; reason: "not_configured" | "sold_out" | "already_redeemed" };

/**
 * Concurrency-safe RESERVE of a WELCOME slot, called right before creating the
 * Checkout session. A transaction-scoped Postgres advisory lock serializes ALL
 * WELCOME reservations, so the count-then-insert cannot race — two users can
 * never both claim the final slot. Idempotent per business (reuses an existing
 * non-released reservation), so retrying a failed Checkout does not consume a
 * second slot.
 */
export async function reserveWelcomeSlot(input: {
  businessId: string;
  ownerId: string;
  stripeCustomerId: string;
  configured: boolean;
}): Promise<ReserveResult> {
  if (!input.configured) return { ok: false, reason: "not_configured" };

  return prisma.$transaction(async (tx) => {
    // Serialize every WELCOME reservation (advisory lock released at tx end).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"promo:" + WELCOME_CODE}))`;

    // Idempotent per business: reuse a still-held reservation (retry-safe).
    const existing = await tx.promoRedemption.findUnique({
      where: { code_businessId: { code: WELCOME_CODE, businessId: input.businessId } },
    });
    if (existing && existing.status !== "RELEASED") {
      return { ok: true, reservationId: existing.id };
    }

    // One redemption per owner.
    const ownerHeld = await tx.promoRedemption.findFirst({
      where: { code: WELCOME_CODE, ownerId: input.ownerId, status: { in: [...HELD] } },
      select: { id: true },
    });
    if (ownerHeld) return { ok: false, reason: "already_redeemed" };

    // Cap check under the lock — safe against the final-slot race.
    const used = await tx.promoRedemption.count({ where: { code: WELCOME_CODE, status: { in: [...HELD] } } });
    if (used >= WELCOME_MAX_REDEMPTIONS) return { ok: false, reason: "sold_out" };

    const row = existing
      ? await tx.promoRedemption.update({
          where: { id: existing.id },
          data: { status: "PENDING", ownerId: input.ownerId, stripeCustomerId: input.stripeCustomerId },
        })
      : await tx.promoRedemption.create({
          data: {
            code: WELCOME_CODE,
            businessId: input.businessId,
            ownerId: input.ownerId,
            stripeCustomerId: input.stripeCustomerId,
            status: "PENDING",
          },
        });
    return { ok: true, reservationId: row.id };
  });
}

/** Link the Checkout session to the reservation so an expired session frees it. */
export async function attachCheckoutSession(businessId: string, sessionId: string): Promise<void> {
  await prisma.promoRedemption.updateMany({
    where: { code: WELCOME_CODE, businessId, status: "PENDING" },
    data: { checkoutSessionId: sessionId },
  });
}

/**
 * REDEEM the reservation once Stripe confirms the subscription (webhook only).
 * Idempotent: only a PENDING row transitions, so replays are no-ops. Never
 * consumes an extra slot.
 */
export async function redeemWelcome(businessId: string, stripeSubscriptionId: string): Promise<void> {
  await prisma.promoRedemption.updateMany({
    where: { code: WELCOME_CODE, businessId, status: "PENDING" },
    data: { status: "REDEEMED", stripeSubscriptionId },
  });
}

/** RELEASE a PENDING reservation whose Checkout expired/failed — frees the slot. */
export async function releaseWelcomeBySession(checkoutSessionId: string): Promise<void> {
  await prisma.promoRedemption.updateMany({
    where: { checkoutSessionId, status: "PENDING" },
    data: { status: "RELEASED" },
  });
}

/** Remaining WELCOME slots (for UI messaging). */
export async function welcomeSlotsRemaining(): Promise<number> {
  const used = await prisma.promoRedemption.count({ where: { code: WELCOME_CODE, status: { in: [...HELD] } } });
  return Math.max(0, WELCOME_MAX_REDEMPTIONS - used);
}

// Re-export the where-narrowing type helper spot (kept for future tx callers).
export type PromoTx = Prisma.TransactionClient;
