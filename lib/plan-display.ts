import "server-only";

import { prisma } from "@/lib/prisma";
import { PLAN_ENTITLEMENTS, planKeyFromEnum, type PlanKey } from "@/lib/entitlements";
import { planKeyFromPriceId } from "@/lib/subscription";

/**
 * The plan a business is actually on, for DISPLAY.
 *
 * Read-only twin of `planToEnforce` in lib/entitlement-guard: same resolution
 * order (live Stripe price id → the coarser DB enum), no row lock, no
 * enforcement flag. Kept separate on purpose — the enforcement path must stay
 * the one that decides whether a write is allowed, and a display helper that
 * could be mistaken for it is exactly how a limit check ends up bypassed.
 *
 * Used where a message has to NAME the plan rather than test it: "your salon
 * has reached the specialist limit on the Professional plan" is actionable in a
 * way that "on your plan" is not, and hardcoding "Professional" would go stale
 * the moment the salon upgrades.
 */
export async function businessPlanKey(businessId: string): Promise<PlanKey> {
  const biz = await prisma.business
    .findUnique({
      where: { id: businessId },
      select: {
        subscriptionPlan: true,
        subscriptions: {
          where: { NOT: { stripeSubscriptionId: null }, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
          select: { stripePriceId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })
    .catch(() => null);
  if (!biz) return "FREE";
  const live = biz.subscriptions[0];
  return (live && planKeyFromPriceId(live.stripePriceId)) || planKeyFromEnum(biz.subscriptionPlan);
}

/** Human plan name ("Professional") for the business, for user-facing copy. */
export async function businessPlanLabel(businessId: string): Promise<string> {
  return PLAN_ENTITLEMENTS[await businessPlanKey(businessId)].label;
}
