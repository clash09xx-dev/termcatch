import "server-only";

import { getExternalBusy } from "./external-busy";

/**
 * Write-time guard against booking over an external commitment.
 *
 * Slot LISTS already exclude Google busy periods, but a list is a snapshot. A
 * customer can sit on a stale tab, follow a saved deep link, or simply be
 * unlucky in a race, and arrive at the write path with a time Google now says
 * is taken. The double-booking guarantee has to hold at the write, not only at
 * the render — the same reason the database carries an exclusion constraint for
 * TermCatch's own appointments.
 *
 * FAILURE POLICY, stated plainly:
 *   - a CONFIRMED overlap rejects the booking
 *   - an UNREACHABLE Google does NOT reject it
 *
 * The second half is a deliberate trade. Refusing every booking whenever Google
 * is slow would hand an external outage the power to close a salon, which is a
 * larger and more certain harm than the rare overlap it would prevent. The
 * connection is marked unhealthy by the read layer, so the business is told.
 */

export type ExternalConflict = { conflict: true } | { conflict: false; degraded: boolean };

export async function checkExternalConflict(input: {
  businessId: string;
  dateYmd: string;
  startMs: number;
  endMs: number;
  employeeId?: string | null;
}): Promise<ExternalConflict> {
  const result = await getExternalBusy({
    businessId: input.businessId,
    dateYmd: input.dateYmd,
    // Query only the appointment's own window rather than the whole day: this
    // runs on the booking path, so it asks for the least it can.
    fromMs: input.startMs,
    toMs: input.endMs,
    employeeId: input.employeeId ?? undefined,
  }).catch(() => ({ busy: [], degraded: true }));

  // Half-open comparison, matching computeDaySlots: an event ending at 11:00
  // does not collide with one starting at 11:00. Back-to-back appointments are
  // normal in a salon and must stay bookable.
  const overlaps = result.busy.some((b) => input.startMs < b.endMs && input.endMs > b.startMs);
  if (overlaps) return { conflict: true };

  return { conflict: false, degraded: result.degraded };
}
