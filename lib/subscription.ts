// ─── Business subscription + 7-day Stripe trial ─────────────────────────────
// The standard TermCatch offer is a 7-day free trial (TRIAL_DAYS). This module
// builds the Stripe subscription Checkout with a real trial and maps Stripe
// subscription status → our enum. Stripe is imported lazily so the pure helpers
// (trial days, status mapping, price resolution) stay importable in unit tests
// without loading the SDK. Never invents Price IDs — they come from env.

import type { SubscriptionStatus, SubscriptionPlan } from "@prisma/client";

/** The standard free-trial length, in days. Single source of truth. */
export const TRIAL_DAYS = 7;

export type PlanKey = "SOLO" | "TEAM" | "PRO" | "ULTIMATE";
export const PLAN_KEYS: PlanKey[] = ["SOLO", "TEAM", "PRO", "ULTIMATE"];

/**
 * Env var(s) holding each plan's Stripe Price ID. PRO reads STRIPE_PRICE_SALON_PRO
 * (canonical) with a STRIPE_PRICE_PRO fallback for backward compatibility.
 * Price IDs are ONLY ever read from env — never hardcoded/invented.
 */
const PLAN_PRICE_ENV: Record<PlanKey, string[]> = {
  SOLO: ["STRIPE_PRICE_SOLO"],
  TEAM: ["STRIPE_PRICE_TEAM"],
  PRO: ["STRIPE_PRICE_SALON_PRO", "STRIPE_PRICE_PRO"],
  ULTIMATE: ["STRIPE_PRICE_ULTIMATE"],
};

export function normalizePlanKey(raw?: string | null): PlanKey | null {
  const up = (raw ?? "").trim().toUpperCase();
  return (PLAN_KEYS as string[]).includes(up) ? (up as PlanKey) : null;
}

// The BusinessSubscription.plan enum (FREE/STARTER/PROFESSIONAL/ENTERPRISE) is
// coarser than the 4 marketing plans — the authoritative plan is stripePriceId.
// This lossy map only fills the required enum column.
const PLAN_ENUM: Record<PlanKey, SubscriptionPlan> = {
  SOLO: "STARTER",
  TEAM: "STARTER",
  PRO: "PROFESSIONAL",
  ULTIMATE: "ENTERPRISE",
};
export function planKeyToEnum(plan: PlanKey): SubscriptionPlan {
  return PLAN_ENUM[plan];
}

/** The configured Stripe Price ID for a plan, or null if not set (never invented). */
export function priceIdForPlan(plan: PlanKey): string | null {
  for (const name of PLAN_PRICE_ENV[plan]) {
    const v = process.env[name];
    if (v && v.startsWith("price_")) return v;
  }
  return null;
}

/** Reverse lookup: which plan a configured Stripe Price ID belongs to (or null). */
export function planKeyFromPriceId(priceId: string | null | undefined): PlanKey | null {
  if (!priceId) return null;
  return PLAN_KEYS.find((p) => priceIdForPlan(p) === priceId) ?? null;
}

function stripeKeyLive(): boolean {
  const k = process.env.STRIPE_SECRET_KEY ?? "";
  return k.startsWith("sk_") && !k.includes("placeholder");
}

/** Subscription billing is usable: a real Stripe key AND at least one Price ID. */
export function billingConfigured(): boolean {
  return stripeKeyLive() && PLAN_KEYS.some((p) => priceIdForPlan(p) !== null);
}

/**
 * Trial length for a checkout. First-time businesses get the full 7-day trial;
 * a business that has already used a trial gets 0 (no repeat free trial) — this
 * is the repeat-trial-abuse guard, applied on top of Stripe customer reuse.
 * Pure + unit-tested.
 */
export function trialDaysFor(hasUsedTrial: boolean): number {
  return hasUsedTrial ? 0 : TRIAL_DAYS;
}

/** Map a Stripe subscription.status to our SubscriptionStatus enum (honest states). */
export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED";
    case "paused":
      return "PAUSED";
    default:
      return "PAST_DUE";
  }
}

// ─── WELCOME promotion — first 3 months free, capped, server-enforced ───────
// The 100-redemption cap + per-business/owner/customer uniqueness are enforced
// by our own PromoRedemption ledger (see lib/billing/promo.ts), NEVER by a
// public Stripe promotion code. The 3-months-free DISCOUNT is applied with a
// Stripe COUPON whose id comes from env (created once in the Dashboard: 100%
// off, duration=repeating, duration_in_months=3). Never invented.

export const WELCOME_CODE = "WELCOME";
export const WELCOME_MAX_REDEMPTIONS = 100;
export const WELCOME_FREE_MONTHS = 3;

/** The configured WELCOME Stripe coupon id, or null (never invented). */
export function welcomeCouponId(): string | null {
  const v = (process.env.STRIPE_COUPON_WELCOME ?? "").trim();
  return v && !v.includes("...") ? v : null;
}

/** WELCOME is usable only when billing AND its coupon are configured. */
export function welcomeConfigured(): boolean {
  return billingConfigured() && welcomeCouponId() !== null;
}

/** Is the entered code the WELCOME code (case-insensitive, trimmed)? */
export function isWelcomeCode(raw?: string | null): boolean {
  return (raw ?? "").trim().toUpperCase() === WELCOME_CODE;
}

export type WelcomeEligibility =
  | { eligible: true }
  | { eligible: false; reason: "bad_code" | "not_configured" | "sold_out" | "already_redeemed" };

/**
 * Pure eligibility decision (no I/O) — unit-tested. The caller supplies the
 * current PENDING+REDEEMED slot count and whether this business/owner already
 * holds a slot; this function applies the rules deterministically.
 */
export function evaluateWelcomeEligibility(input: {
  configured: boolean;
  codeMatches: boolean;
  slotsUsed: number;
  cap: number;
  alreadyRedeemed: boolean;
}): WelcomeEligibility {
  if (!input.codeMatches) return { eligible: false, reason: "bad_code" };
  if (!input.configured) return { eligible: false, reason: "not_configured" };
  if (input.alreadyRedeemed) return { eligible: false, reason: "already_redeemed" };
  if (input.slotsUsed >= input.cap) return { eligible: false, reason: "sold_out" };
  return { eligible: true };
}
