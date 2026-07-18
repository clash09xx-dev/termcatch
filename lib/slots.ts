// ─── Earliest-free-slot computation (pure, testable) ─────────────────────────
// Mirrors the semantics of /api/availability (30-minute grid, overlap check,
// past slots skipped) so the customer assistant can show REAL earliest
// availability. Inputs are trusted server-fetched values; output is a
// Warsaw-local "HH:MM" or null when nothing fits.

import { timeToMinutes, minutesToTime } from "@/lib/utils";
import { warsawDateTimeToUtc } from "@/lib/timezone";

export type BusySpan = { startMs: number; endMs: number };

export function earliestFreeSlot(args: {
  /** Warsaw-local date "YYYY-MM-DD" */
  dateYmd: string;
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
  durationMin: number;
  busy: BusySpan[];
  nowMs: number;
  /** Only slots starting at/after this Warsaw-local minute (e.g. 17:00 → 1020). */
  afterMinutes?: number;
}): string | null {
  const open = timeToMinutes(args.openTime);
  const close = timeToMinutes(args.closeTime);
  const duration = Math.max(1, Math.round(args.durationMin));
  const from = Math.max(open, args.afterMinutes ?? 0);

  // Align the first candidate to the 30-minute grid used across the product.
  let slot = open + Math.ceil(Math.max(0, from - open) / 30) * 30;

  for (; slot + duration <= close; slot += 30) {
    const startMs = warsawDateTimeToUtc(args.dateYmd, minutesToTime(slot)).getTime();
    const endMs = warsawDateTimeToUtc(args.dateYmd, minutesToTime(slot + duration)).getTime();
    if (startMs <= args.nowMs) continue; // never offer the past
    const overlaps = args.busy.some((b) => startMs < b.endMs && endMs > b.startMs);
    if (!overlaps) return minutesToTime(slot);
  }
  return null;
}
