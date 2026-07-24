// ─── Pure appointment scheduling rules (unit-tested) ────────────────────────
// The booking/reschedule/cancel actions run inside DB transactions, but these
// decision rules are pure functions so they can be tested deterministically and
// reused across the create/reschedule/cancel paths.

/** A booking start must be strictly in the future. */
export function isFutureStart(start: Date, now: Date = new Date()): boolean {
  return start.getTime() > now.getTime();
}

/** Hours remaining until `start` (negative if already passed). */
export function hoursUntil(start: Date, now: Date = new Date()): number {
  return (start.getTime() - now.getTime()) / 3_600_000;
}

/**
 * Whether a customer-initiated change (cancel/reschedule) is still allowed under
 * the salon's cancellation policy: at least `limitHours` before the start.
 */
export function changeAllowedByPolicy(start: Date, now: Date, limitHours: number): boolean {
  return hoursUntil(start, now) >= limitHours;
}

/**
 * Half-open interval overlap — the canonical rule mirrored by the double-booking
 * SQL guard (`startTime < newEnd AND endTime > newStart`). Two [start,end)
 * intervals overlap iff each starts before the other ends. Back-to-back slots
 * (a.end === b.start) do NOT overlap.
 */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
