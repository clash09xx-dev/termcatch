// ─── Server-side entitlement enforcement ────────────────────────────────────
// Counts ACTIVE resources under a row lock and throws a typed PlanLimitError
// when a plan limit would be exceeded. The FOR UPDATE lock on the business row
// serializes concurrent create/reactivate requests for the SAME business, so two
// simultaneous requests cannot both slip past the limit.

import type { Prisma, PrismaPromise } from "@prisma/client";
import { entitlementsEnforced, planKeyFromEnum, withinLimit, planLimitInfo, PlanLimitError, type PlanKey } from "@/lib/entitlements";
import { planKeyFromPriceId } from "@/lib/subscription";

/**
 * The plan to enforce for this business, or `null` to SKIP enforcement entirely.
 * Enforcement is skipped unless (1) the ENTITLEMENTS_ENFORCED flag is on AND
 * (2) the business has an explicitly-assigned Stripe subscription. This is the
 * billing-safety guard: existing FREE salons (no subscription) are never blocked.
 * Only acquires the row lock when it will actually enforce.
 */
async function planToEnforce(tx: Prisma.TransactionClient, businessId: string): Promise<PlanKey | null> {
  if (!entitlementsEnforced()) return null;
  // Row lock — serializes concurrent limit checks for this business.
  await (tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE` as PrismaPromise<unknown>);
  const biz = await tx.business.findUnique({
    where: { id: businessId },
    select: {
      subscriptionPlan: true,
      // An explicitly-assigned plan == a LIVE Stripe subscription. A cancelled
      // subscription no longer constrains limits (data is preserved regardless).
      subscriptions: {
        where: { NOT: { stripeSubscriptionId: null }, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
        select: { stripePriceId: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const live = biz?.subscriptions[0];
  if (!biz || !live) return null; // no live assigned plan → grandfathered
  // Precise plan from the Price ID (distinguishes SOLO vs TEAM); enum fallback.
  return planKeyFromPriceId(live.stripePriceId) ?? planKeyFromEnum(biz.subscriptionPlan);
}

/**
 * Assert the business can have one MORE active specialist. Pass `excludeId` when
 * reactivating an existing employee (so it isn't double-counted). Throws
 * PlanLimitError if the active count would exceed the plan limit.
 */
export async function assertCanAddEmployee(
  tx: Prisma.TransactionClient,
  businessId: string,
  excludeId?: string
) {
  const plan = await planToEnforce(tx, businessId);
  if (!plan) return; // enforcement skipped (flag off or no assigned plan)
  const activeCount = await tx.employee.count({
    where: { businessId, isActive: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (!withinLimit(plan, "employee", activeCount + 1)) {
    throw new PlanLimitError(planLimitInfo("employee", plan, activeCount));
  }
}

/**
 * Assert the business can have one MORE active location (Wave 4 / multi-location
 * — used once the Location model + flag are live). Same locking discipline.
 */
export async function assertCanAddLocation(
  tx: Prisma.TransactionClient,
  businessId: string,
  countActive: (tx: Prisma.TransactionClient) => Promise<number>
) {
  const plan = await planToEnforce(tx, businessId);
  if (!plan) return; // enforcement skipped (flag off or no assigned plan)
  const activeCount = await countActive(tx);
  if (!withinLimit(plan, "location", activeCount + 1)) {
    throw new PlanLimitError(planLimitInfo("location", plan, activeCount));
  }
}
