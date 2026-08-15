import "server-only";

import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Who may touch which calendar connection.
 *
 * Two rules, and every entry point goes through them:
 *
 *   1. TENANT ISOLATION — a connection is reachable only from the business that
 *      owns it. Business A can never read, change or disconnect business B's
 *      calendar, no matter what id it submits.
 *
 *   2. PRIVACY BETWEEN COLLEAGUES — a specialist's calendar is their own. An
 *      employee may manage only their own connection. The owner may see that a
 *      colleague is connected and may disconnect them (it is the salon's
 *      integration), but no code path ever hands one employee another
 *      employee's busy details or tokens.
 */

export type CalendarActor = {
  /** Prisma User id. */
  userId: string;
  businessId: string;
  /** Set when this person is a specialist at the business. */
  employeeId: string | null;
  isOwner: boolean;
};

/**
 * Resolve the caller's position at a salon.
 *
 * An owner is resolved from Business.ownerId; a specialist from an Employee row
 * linked to their User. Someone who is neither gets null and every caller
 * refuses. Deliberately does NOT read user_metadata: that field is writable by
 * the user themselves (see lib/is-admin.ts) and must never gate access.
 */
export async function resolveCalendarActor(businessId?: string): Promise<CalendarActor | null> {
  const authUser = await getServerUser();
  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: {
      id: true,
      ownedBusinesses: { select: { id: true }, take: 1 },
      employeeProfiles: {
        where: { isActive: true },
        select: { id: true, businessId: true },
      },
    },
  });
  if (!dbUser) return null;

  const owned = dbUser.ownedBusinesses[0]?.id ?? null;

  // Owner first: an owner who is also listed as staff still acts as the owner.
  if (owned && (!businessId || businessId === owned)) {
    const selfEmployee = dbUser.employeeProfiles.find((e) => e.businessId === owned);
    return { userId: dbUser.id, businessId: owned, employeeId: selfEmployee?.id ?? null, isOwner: true };
  }

  const emp = businessId
    ? dbUser.employeeProfiles.find((e) => e.businessId === businessId)
    : dbUser.employeeProfiles[0];
  if (!emp) return null;

  return { userId: dbUser.id, businessId: emp.businessId, employeeId: emp.id, isOwner: false };
}

/**
 * Load a connection the actor is allowed to act on, or null.
 *
 * The business filter is part of the WHERE clause rather than a check
 * afterwards, so a mismatched id simply finds nothing — there is no branch
 * where a foreign row is loaded and then rejected.
 */
export async function connectionForActor(
  actor: CalendarActor,
  connectionId: string,
): Promise<{ id: string; employeeId: string | null; calendarId: string | null } | null> {
  const conn = await prisma.calendarConnection.findFirst({
    where: { id: connectionId, businessId: actor.businessId },
    select: { id: true, employeeId: true, calendarId: true },
  });
  if (!conn) return null;

  // An employee may only manage their own. An owner may manage any in their salon.
  if (!actor.isOwner && conn.employeeId !== actor.employeeId) return null;

  return conn;
}

/** May this actor connect a calendar for this employee (or salon-wide)? */
export function canConnectFor(actor: CalendarActor, employeeId: string | null): boolean {
  if (actor.isOwner) return true;
  // A specialist connects their own calendar and nothing else — in particular
  // they cannot create the salon-wide connection.
  return employeeId !== null && employeeId === actor.employeeId;
}
