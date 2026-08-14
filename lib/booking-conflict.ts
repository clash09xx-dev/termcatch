// ─── Booking conflict / double-booking protection ───────────────────────────
// Pure, testable helpers for slot-conflict detection and the concurrency guard.
// Kept OUT of the "use server" action file so constants + sync helpers can be
// exported and unit-tested with a mock transaction client (that file may only
// export async server actions).
//
// Defence in depth — THREE layers stop a double-booking:
//   1. Advisory transaction lock (lockBusinessForBooking) serialises the
//      "is the slot free? → insert" sequence per business, so the check + write
//      are atomic even under READ COMMITTED (a plain SELECT-then-INSERT is not).
//   2. assertSlotAvailable re-checks inside that lock and returns a friendly
//      SLOT_TAKEN error to the losing request BEFORE writing.
//   3. A Postgres EXCLUSION CONSTRAINT (see
//      prisma/manual-migrations/2026-08-appointment-overlap-exclusion.sql) makes
//      two overlapping non-cancelled appointments for the SAME employee
//      physically impossible at the database level — the hard, path-independent
//      backstop that holds even for a code path that forgets the lock or a raw
//      SQL insert. isExclusionViolation()/mapBookingWriteError() translate its
//      23P01 violation back into the same friendly SLOT_TAKEN error.
//
// The "any specialist" (employeeId = null) capacity rule can't be an exclusion
// constraint (NULLs never conflict in EXCLUDE), so layers 1+2 own that case.

import { AppointmentStatus, Prisma } from "@prisma/client";

/**
 * Stable sentinel thrown when a slot is no longer bookable. Clients map it to a
 * localized "this slot is no longer available" message; it is intentionally NOT
 * human copy so the UI language is decided client-side. */
export const SLOT_TAKEN = "SLOT_TAKEN";

/** Name of the DB exclusion constraint (kept in sync with the migration SQL). */
export const OVERLAP_CONSTRAINT = "appointments_no_employee_overlap";

/** Half-open interval overlap: [aStart,aEnd) intersects [bStart,bEnd).
 * Adjacent slots (10–11 and 11–12) do NOT overlap; 10–11 and 10:30–11:30 do. */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

/** Statuses that free the slot (a cancelled appointment no longer blocks it). */
const FREEING_STATUSES = [AppointmentStatus.CANCELLED_CUSTOMER, AppointmentStatus.CANCELLED_BUSINESS];

/**
 * Serialize slot writes for one business so the "is the slot free? → insert"
 * sequence is atomic across concurrent requests. Must be the FIRST statement
 * inside the transaction; the advisory lock auto-releases at transaction end.
 */
export async function lockBusinessForBooking(
  tx: Prisma.TransactionClient,
  businessId: string
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${businessId}, 0))`;
}

/**
 * Throw SLOT_TAKEN if the [start,end) slot isn't bookable. A SPECIFIC employee
 * is one chair (blocked by any overlap of theirs). "Dowolny specjalista"
 * (employeeId null) is blocked only when EVERY chair is taken — capacity =
 * active accepting employees (min 1, so a solo salon still books). Call inside
 * the locked transaction so the count + insert are atomic.
 */
export async function assertSlotAvailable(
  tx: Prisma.TransactionClient,
  args: { businessId: string; employeeId: string | null; start: Date; end: Date; excludeId?: string }
): Promise<void> {
  const overlap = {
    ...(args.excludeId ? { id: { not: args.excludeId } } : {}),
    businessId: args.businessId,
    status: { notIn: FREEING_STATUSES },
    startTime: { lt: args.end },
    endTime: { gt: args.start },
  };
  if (args.employeeId) {
    const conflict = await tx.appointment.findFirst({
      where: { ...overlap, employeeId: args.employeeId },
      select: { id: true },
    });
    if (conflict) throw new Error(SLOT_TAKEN);
    return;
  }
  const capacity = Math.max(
    1,
    await tx.employee.count({ where: { businessId: args.businessId, isActive: true, isAccepting: true } })
  );
  const concurrent = await tx.appointment.count({ where: overlap });
  if (concurrent >= capacity) throw new Error(SLOT_TAKEN);
}

/**
 * True when an error is the Postgres exclusion-constraint violation (23P01)
 * from the overlap constraint — i.e. a concurrent racer beat us past the
 * advisory-lock check. Prisma surfaces raw DB errors without a dedicated code,
 * so we match on the SQLSTATE and the constraint name defensively. */
export function isExclusionViolation(err: unknown): boolean {
  if (err instanceof Error && err.message === SLOT_TAKEN) return true;
  const text = ((): string => {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = err.meta as Record<string, unknown> | undefined;
      return `${err.code} ${err.message} ${meta ? JSON.stringify(meta) : ""}`;
    }
    if (err instanceof Error) return `${err.message}`;
    return String(err);
  })();
  return text.includes("23P01") || text.includes(OVERLAP_CONSTRAINT) || text.includes("exclusion");
}

/**
 * Normalise any booking write failure: an overlap/exclusion violation becomes
 * the friendly SLOT_TAKEN sentinel; everything else is re-thrown unchanged so
 * genuine programming errors stay observable. */
export function mapBookingWriteError(err: unknown): never {
  if (isExclusionViolation(err)) throw new Error(SLOT_TAKEN);
  throw err;
}
