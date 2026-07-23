// ─── Server-side entitlement enforcement ────────────────────────────────────
// Counts ACTIVE resources under a row lock and throws a typed PlanLimitError
// when a plan limit would be exceeded. The FOR UPDATE lock on the business row
// serializes concurrent create/reactivate requests for the SAME business, so two
// simultaneous requests cannot both slip past the limit.

import type { Prisma } from "@prisma/client";
import { planKeyFromEnum, withinLimit, planLimitInfo, PlanLimitError } from "@/lib/entitlements";

async function lockAndPlan(tx: Prisma.TransactionClient, businessId: string) {
  // Row lock — serializes concurrent limit checks for this business.
  await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;
  const biz = await tx.business.findUnique({
    where: { id: businessId },
    select: { subscriptionPlan: true },
  });
  return planKeyFromEnum(biz?.subscriptionPlan ?? null);
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
  const plan = await lockAndPlan(tx, businessId);
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
  countActive: (tx: Prisma.TransactionClient) => Promise<number>,
  excludeId?: string
) {
  const plan = await lockAndPlan(tx, businessId);
  void excludeId;
  const activeCount = await countActive(tx);
  if (!withinLimit(plan, "location", activeCount + 1)) {
    throw new PlanLimitError(planLimitInfo("location", plan, activeCount));
  }
}
