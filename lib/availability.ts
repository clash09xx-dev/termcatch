// ─── Availability engine — the SINGLE source of truth ───────────────────────
// Both the public booking wizard (/api/availability) and the search
// "available today/tomorrow/date" filter compute slots through this module, so
// search and booking can never disagree.
//
// Rules honored (all from real data, never guessed):
//  • business working hours for the weekday (WorkingHours)
//  • SpecialDay overrides (closed / custom open-close) for that date
//  • WorkingHoursBreak windows (no slot during a break)
//  • existing appointments (non-cancelled) block their span
//  • business buffers (bufferTimeBefore/After) padded around existing appts
//  • past slots are never returned; Warsaw timezone throughout
//  • when a specific employee is requested, their EmployeeWorkingHours bound the
//    day (fallback: business hours if they have no per-day schedule configured),
//    and only that employee's appointments are treated as busy
//
// The 30-minute grid matches the historical engine so existing behavior/tests
// stay stable.

import { prisma } from "@/lib/prisma";
import { timeToMinutes, minutesToTime } from "@/lib/utils";
import { warsawDateTimeToUtc, warsawDayStartUtc, warsawDayEndUtc } from "@/lib/timezone";
import { AppointmentStatus, DayOfWeek } from "@prisma/client";

export const DOW_BY_INDEX: DayOfWeek[] = [
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY",
];

export const NON_BLOCKING_STATUSES = [
  AppointmentStatus.CANCELLED_CUSTOMER,
  AppointmentStatus.CANCELLED_BUSINESS,
];

export const SLOT_STEP_MIN = 30;

export type BusySpan = { startMs: number; endMs: number };
/** A within-day window in Warsaw minutes-since-midnight (e.g. lunch break). */
export type MinuteWindow = { startMin: number; endMin: number };

/** Warsaw "YYYY-MM-DD" for today + offset days (offset 0 = today). */
export function warsawYmdPlusDays(baseYmd: string, offset: number): string {
  const base = new Date(baseYmd + "T00:00:00Z");
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

/** DayOfWeek enum name for a Warsaw-local "YYYY-MM-DD" (noon avoids DST edges). */
export function dowForYmd(dateYmd: string): DayOfWeek {
  return DOW_BY_INDEX[new Date(dateYmd + "T12:00:00Z").getUTCDay()];
}

/**
 * Pure slot generator — the shared core. All inputs are trusted server values.
 * Returns Warsaw-local "HH:MM" starts that fit [openMin, closeMin), avoid every
 * break window and (buffer-padded) busy span, and never start in the past.
 */
export function computeDaySlots(args: {
  dateYmd: string;
  openMin: number;
  closeMin: number;
  durationMin: number;
  breaks?: MinuteWindow[];
  busy: BusySpan[];
  nowMs: number;
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
  stepMin?: number;
}): string[] {
  const step = args.stepMin ?? SLOT_STEP_MIN;
  const duration = Math.max(1, Math.round(args.durationMin));
  const breaks = args.breaks ?? [];
  const bufBeforeMs = (args.bufferBeforeMin ?? 0) * 60_000;
  const bufAfterMs = (args.bufferAfterMin ?? 0) * 60_000;
  const slots: string[] = [];

  for (let start = args.openMin; start + duration <= args.closeMin; start += step) {
    const end = start + duration;
    // No slot straddling a break.
    if (breaks.some((b) => start < b.endMin && end > b.startMin)) continue;

    const startMs = warsawDateTimeToUtc(args.dateYmd, minutesToTime(start)).getTime();
    const endMs = warsawDateTimeToUtc(args.dateYmd, minutesToTime(end)).getTime();
    if (startMs <= args.nowMs) continue; // never the past

    // Buffers belong to the appointment: it effectively occupies
    // [start − bufferBefore, end + bufferAfter], so the next booking keeps its gap.
    const overlaps = args.busy.some(
      (b) => startMs < b.endMs + bufAfterMs && endMs > b.startMs - bufBeforeMs
    );
    if (!overlaps) slots.push(minutesToTime(start));
  }
  return slots;
}

/** Resolved open window for a business on a date, after SpecialDay + weekly hours. */
export type ResolvedDayHours = { open: boolean; openMin: number; closeMin: number; breaks: MinuteWindow[] };

type WorkingHoursRow = {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks?: { startTime: string; endTime: string }[];
};
type SpecialDayRow = { isClosed: boolean; openTime: string | null; closeTime: string | null };

/** Combine weekly hours + a SpecialDay override into the effective open window. */
export function resolveDayHours(
  weekly: WorkingHoursRow | null | undefined,
  special: SpecialDayRow | null | undefined
): ResolvedDayHours {
  const closed: ResolvedDayHours = { open: false, openMin: 0, closeMin: 0, breaks: [] };
  // A SpecialDay that closes the business wins outright.
  if (special?.isClosed) return closed;

  let openMin: number, closeMin: number;
  if (special && special.openTime && special.closeTime) {
    openMin = timeToMinutes(special.openTime);
    closeMin = timeToMinutes(special.closeTime);
  } else {
    if (!weekly || !weekly.isOpen) return closed;
    openMin = timeToMinutes(weekly.openTime);
    closeMin = timeToMinutes(weekly.closeTime);
  }
  if (closeMin <= openMin) return closed;

  const breaks = (weekly?.breaks ?? []).map((b) => ({
    startMin: timeToMinutes(b.startTime),
    endMin: timeToMinutes(b.endTime),
  }));
  return { open: true, openMin, closeMin, breaks };
}

/**
 * Single-business slot list for a service on a date — the engine behind
 * /api/availability. Honors employee schedule when an employee is requested.
 */
export async function getBusinessDaySlots(input: {
  businessId: string;
  serviceDurationMin: number;
  dateYmd: string;
  employeeId?: string;
  nowMs?: number;
}): Promise<{ open: boolean; slots: string[] }> {
  const { businessId, serviceDurationMin, dateYmd } = input;
  const nowMs = input.nowMs ?? Date.now();
  const dow = dowForYmd(dateYmd);

  const [weekly, special, business] = await Promise.all([
    prisma.workingHours.findUnique({
      where: { businessId_dayOfWeek: { businessId, dayOfWeek: dow } },
      include: { breaks: { select: { startTime: true, endTime: true } } },
    }),
    prisma.specialDay.findFirst({
      where: { businessId, date: new Date(dateYmd + "T00:00:00.000Z") },
      select: { isClosed: true, openTime: true, closeTime: true },
    }),
    prisma.business.findUnique({
      where: { id: businessId },
      select: { bufferTimeBefore: true, bufferTimeAfter: true },
    }),
  ]);

  let hours = resolveDayHours(weekly, special);
  if (!hours.open) return { open: false, slots: [] };

  // When a specific employee is chosen, bound the window by their schedule.
  // If they have no per-day schedule at all, fall back to business hours.
  if (input.employeeId) {
    const empHours = await prisma.employeeWorkingHours.findMany({
      where: { employeeId: input.employeeId },
      select: { dayOfWeek: true, isWorking: true, startTime: true, endTime: true },
    });
    if (empHours.length > 0) {
      const today = empHours.find((e) => e.dayOfWeek === dow);
      if (!today || !today.isWorking) return { open: true, slots: [] };
      const eOpen = timeToMinutes(today.startTime);
      const eClose = timeToMinutes(today.endTime);
      hours = {
        ...hours,
        openMin: Math.max(hours.openMin, eOpen),
        closeMin: Math.min(hours.closeMin, eClose),
      };
      if (hours.closeMin <= hours.openMin) return { open: true, slots: [] };
    }
  }

  const dayStart = warsawDayStartUtc(dateYmd);
  const dayEnd = warsawDayEndUtc(dateYmd);
  const appts = await prisma.appointment.findMany({
    where: {
      businessId,
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      status: { notIn: NON_BLOCKING_STATUSES },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  const slots = computeDaySlots({
    dateYmd,
    openMin: hours.openMin,
    closeMin: hours.closeMin,
    durationMin: serviceDurationMin,
    breaks: hours.breaks,
    busy: appts.map((a) => ({ startMs: a.startTime.getTime(), endMs: a.endTime.getTime() })),
    nowMs,
    bufferBeforeMin: business?.bufferTimeBefore ?? 0,
    bufferAfterMin: business?.bufferTimeAfter ?? 0,
  });
  return { open: true, slots };
}

export type BusinessEarliest = { open: boolean; earliest: string | null };

/**
 * Batch "does each business have a real free slot on this date, and when?" —
 * the engine behind the search availability filter. Uses each business's
 * SHORTEST active service as the probe duration (the finest booking granularity
 * that business offers). A business with no active service is never available.
 * Mirrors getBusinessDaySlots exactly, batched for many businesses.
 */
export async function getBusinessesEarliest(
  businessIds: string[],
  dateYmd: string,
  nowMs: number = Date.now()
): Promise<Map<string, BusinessEarliest>> {
  const result = new Map<string, BusinessEarliest>();
  if (businessIds.length === 0) return result;

  const dow = dowForYmd(dateYmd);
  const dayStart = warsawDayStartUtc(dateYmd);
  const dayEnd = warsawDayEndUtc(dateYmd);

  const [weeklyRows, specialRows, serviceRows, apptRows, businessRows] = await Promise.all([
    prisma.workingHours.findMany({
      where: { businessId: { in: businessIds }, dayOfWeek: dow },
      include: { breaks: { select: { startTime: true, endTime: true } } },
    }),
    prisma.specialDay.findMany({
      where: { businessId: { in: businessIds }, date: new Date(dateYmd + "T00:00:00.000Z") },
      select: { businessId: true, isClosed: true, openTime: true, closeTime: true },
    }),
    prisma.service.findMany({
      where: { businessId: { in: businessIds }, isActive: true },
      select: { businessId: true, duration: true },
    }),
    prisma.appointment.findMany({
      where: {
        businessId: { in: businessIds },
        status: { notIn: NON_BLOCKING_STATUSES },
        startTime: { gte: dayStart, lte: dayEnd },
      },
      select: { businessId: true, startTime: true, endTime: true },
    }),
    prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { id: true, bufferTimeBefore: true, bufferTimeAfter: true },
    }),
  ]);

  const weeklyBy = new Map(weeklyRows.map((w) => [w.businessId, w]));
  const specialBy = new Map(specialRows.map((s) => [s.businessId, s]));
  const busyBy = new Map<string, BusySpan[]>();
  for (const a of apptRows) {
    const list = busyBy.get(a.businessId) ?? [];
    list.push({ startMs: a.startTime.getTime(), endMs: a.endTime.getTime() });
    busyBy.set(a.businessId, list);
  }
  const shortestBy = new Map<string, number>();
  for (const s of serviceRows) {
    const cur = shortestBy.get(s.businessId);
    if (cur === undefined || s.duration < cur) shortestBy.set(s.businessId, s.duration);
  }
  const bufferBy = new Map(businessRows.map((b) => [b.id, b]));

  for (const id of businessIds) {
    const probe = shortestBy.get(id);
    if (probe === undefined) {
      result.set(id, { open: false, earliest: null }); // no active service → not bookable
      continue;
    }
    const hours = resolveDayHours(weeklyBy.get(id), specialBy.get(id));
    if (!hours.open) {
      result.set(id, { open: false, earliest: null });
      continue;
    }
    const buf = bufferBy.get(id);
    const slots = computeDaySlots({
      dateYmd,
      openMin: hours.openMin,
      closeMin: hours.closeMin,
      durationMin: probe,
      breaks: hours.breaks,
      busy: busyBy.get(id) ?? [],
      nowMs,
      bufferBeforeMin: buf?.bufferTimeBefore ?? 0,
      bufferAfterMin: buf?.bufferTimeAfter ?? 0,
    });
    result.set(id, { open: true, earliest: slots[0] ?? null });
  }
  return result;
}
