// ─── Booking intent (survives a login / Google-OAuth round-trip) ─────────────
// When an unauthenticated visitor finishes picking a slot, we send them to log
// in and must bring the WHOLE selection back afterwards. We carry it in the URL
// as IDENTIFIERS ONLY — never price, discount, duration, or availability. Those
// are always re-derived and re-checked server-side at confirm, so a tampered
// URL cannot change what the customer is charged or double-book a taken slot.

export interface BookingIntentSelection {
  serviceId: string;
  employeeId?: string | null;
  /** Warsaw-local "YYYY-MM-DD". */
  date?: string | null;
  /** Warsaw-local "HH:MM". */
  time?: string | null;
}

export interface DecodedBookingIntent {
  resume: boolean;
  serviceId: string | null;
  employeeId: string | null;
  date: string;
  time: string;
}

/** Minimal shape shared by URLSearchParams and Next's ReadonlyURLSearchParams. */
type ParamGetter = { get(key: string): string | null };

/** Encode a selection as query params. `resume=1` marks a real resume so a plain
 *  deep-link with just ?serviceId= doesn't jump to the confirmation step. */
export function encodeBookingIntent(sel: BookingIntentSelection): URLSearchParams {
  const p = new URLSearchParams({ serviceId: sel.serviceId, resume: "1" });
  if (sel.employeeId) p.set("employeeId", sel.employeeId);
  if (sel.date) p.set("date", sel.date);
  if (sel.time) p.set("time", sel.time);
  return p;
}

/** The path to return to after login, carrying the full selection. */
export function bookingResumePath(slug: string, sel: BookingIntentSelection): string {
  return `/b/${slug}/book?${encodeBookingIntent(sel).toString()}`;
}

export function decodeBookingIntent(sp: ParamGetter): DecodedBookingIntent {
  return {
    resume: sp.get("resume") === "1",
    serviceId: sp.get("serviceId"),
    employeeId: sp.get("employeeId"),
    date: sp.get("date") ?? "",
    time: sp.get("time") ?? "",
  };
}
