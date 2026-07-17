// Client-safe phone helpers — no server imports, usable in any bundle.

/** Normalizuje polski numer do formatu E.164 (+48...). */
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[\s\-()]/g, "");
  if (/^\+\d{9,15}$/.test(digits)) return digits;
  if (/^\d{9}$/.test(digits)) return `+48${digits}`;
  if (/^48\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}
