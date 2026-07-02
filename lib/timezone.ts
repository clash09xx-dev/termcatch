/**
 * Salon times are always interpreted in Poland's timezone (Europe/Warsaw),
 * regardless of the server's or visitor's local timezone.
 */

const TZ = "Europe/Warsaw";

/** Offset (ms) between Warsaw local time and UTC at a given instant. */
function warsawOffsetMs(utcDate: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(utcDate)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - utcDate.getTime();
}

/**
 * Convert a Warsaw-local date ("YYYY-MM-DD") and time ("HH:MM")
 * to the correct UTC Date instant. Handles DST transitions.
 */
export function warsawDateTimeToUtc(dateStr: string, timeStr: string): Date {
  const naive = new Date(`${dateStr}T${timeStr}:00Z`);
  const offset = warsawOffsetMs(naive);
  const utc = new Date(naive.getTime() - offset);
  const offset2 = warsawOffsetMs(utc);
  return offset2 === offset ? utc : new Date(naive.getTime() - offset2);
}

/** "YYYY-MM-DD" of a given instant, in Warsaw time. */
export function warsawDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "HH:MM" of a given instant, in Warsaw time. */
export function warsawTimeString(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Start of a Warsaw-local day as a UTC instant. */
export function warsawDayStartUtc(dateStr: string): Date {
  return warsawDateTimeToUtc(dateStr, "00:00");
}

/** End of a Warsaw-local day as a UTC instant. */
export function warsawDayEndUtc(dateStr: string): Date {
  const start = warsawDayStartUtc(dateStr);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}
