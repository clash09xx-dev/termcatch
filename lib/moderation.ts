import { prisma } from "@/lib/prisma";

/**
 * Blocking, on the read side.
 *
 * A block is only worth having if the rest of the product honours it, so this
 * module is the single place that answers "what has this person blocked?" and
 * every surface that shows businesses calls it:
 *
 *   - app/search/page.tsx      filters blocked salons out of results
 *   - lib/actions/appointments booking a blocked salon is refused
 *
 * Kept separate from the server actions so server components can import it
 * without pulling in "use server".
 */

/** Business ids this user has blocked. Empty for guests. */
export async function blockedBusinessIds(userId: string | null | undefined): Promise<string[]> {
  if (!userId) return [];
  const rows = await prisma.blockedBusiness.findMany({
    where: { userId },
    select: { businessId: true },
  });
  return rows.map((r) => r.businessId);
}

/** Has this user blocked this specific business? */
export async function hasBlockedBusiness(userId: string | null | undefined, businessId: string): Promise<boolean> {
  if (!userId) return false;
  const row = await prisma.blockedBusiness.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** The reasons a report can carry. Kept in sync with dict.moderation.reason*. */
export const REPORT_REASONS = ["spam", "inappropriate", "wrong_info", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export function isReportReason(v: unknown): v is ReportReason {
  return typeof v === "string" && (REPORT_REASONS as readonly string[]).includes(v);
}
