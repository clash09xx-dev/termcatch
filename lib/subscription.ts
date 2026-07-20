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

/** Map a ?plan= query value / plan key to the env var holding its Stripe Price ID. */
const PLAN_PRICE_ENV: Record<PlanKey, string> = {
  SOLO: "STRIPE_PRICE_SOLO",
  TEAM: "STRIPE_PRICE_TEAM",
  PRO: "STRIPE_PRICE_PRO",
  ULTIMATE: "STRIPE_PRICE_ULTIMATE",
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
  const v = process.env[PLAN_PRICE_ENV[plan]];
  return v && v.startsWith("price_") ? v : null;
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

export type CheckoutResult = { url?: string; error?: "unconfigured" | "stripe_error" };

/**
 * Create a Stripe Checkout Session for a 7-day-trial subscription.
 * - Reuses one Stripe customer per owner email (no duplicate customers).
 * - Applies trial_period_days only for a first-time trial (abuse guard).
 * Returns { error: "unconfigured" } when billing/Price IDs are not set up yet
 * (honest fallback — never a fake success). Stripe is loaded lazily.
 */
export async function createSubscriptionCheckout(input: {
  businessId: string;
  ownerEmail: string;
  plan: PlanKey;
  hasUsedTrial: boolean;
  appUrl: string;
}): Promise<CheckoutResult> {
  const priceId = priceIdForPlan(input.plan);
  if (!priceId || !stripeKeyLive()) return { error: "unconfigured" };

  try {
    const { stripe } = await import("@/lib/stripe");

    // Reuse an existing Stripe customer for this owner, else create one.
    const found = await stripe.customers.list({ email: input.ownerEmail, limit: 1 });
    const customerId =
      found.data[0]?.id ??
      (await stripe.customers.create({ email: input.ownerEmail, metadata: { businessId: input.businessId } })).id;

    const trialDays = trialDaysFor(input.hasUsedTrial);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: { businessId: input.businessId, plan: input.plan },
      },
      metadata: { businessId: input.businessId, plan: input.plan },
      success_url: `${input.appUrl}/business/payments?subscription=success`,
      cancel_url: `${input.appUrl}/business/payments?subscription=cancelled`,
    });
    return { url: session.url ?? undefined };
  } catch {
    return { error: "stripe_error" };
  }
}
