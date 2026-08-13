/**
 * Deterministic transactional SMS bodies in all four launch languages. No AI,
 * no runtime translation — the recipient's resolved locale selects a fixed
 * template. The "TermCatch:" brand prefix is intentionally unchanged in every
 * language. Slot labels are formatted in the recipient's locale (see format.ts).
 */
import type { Locale } from "./config";
import { FALLBACK_LOCALE } from "./config";
import { formatDate, formatTime } from "./format";

export type BookingSmsKind =
  | "confirmed"
  | "rescheduledByCustomer"
  | "rescheduledByBusiness"
  | "cancelled"
  | "declined"
  | "reminder";

export type BookingSmsParams = {
  serviceName: string;
  businessName: string;
  slotLabel: string;
  oldSlotLabel?: string;
  reason?: string;
};

// Times are always shown in the salon's timezone (Poland launch) — language ≠
// country, so the clock stays Europe/Warsaw regardless of UI language.
const TZ = "Europe/Warsaw";

/** Recipient-locale slot label for SMS, e.g. pl "poniedziałek, 5 sierpnia, 14:00". */
export function smsSlotLabel(start: Date, locale: Locale): string {
  const date = formatDate(start, locale, { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  const time = formatTime(start, locale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
  return `${date}, ${time}`;
}

const TEMPLATES: Record<Locale, Record<BookingSmsKind, (p: BookingSmsParams) => string>> = {
  pl: {
    confirmed: (p) => `TermCatch: wizyta potwierdzona — ${p.serviceName} w ${p.businessName}, ${p.slotLabel}. Do zobaczenia!`,
    rescheduledByCustomer: (p) => `TermCatch: wizyta przełożona — ${p.serviceName} w ${p.businessName}, nowy termin: ${p.slotLabel}. Salon potwierdzi zmianę.`,
    rescheduledByBusiness: (p) => `TermCatch: salon ${p.businessName} zmienił godzinę wizyty ${p.serviceName} na ${p.slotLabel}${p.oldSlotLabel ? ` (poprzednio ${p.oldSlotLabel})` : ""}.`,
    cancelled: (p) => `TermCatch: Twoja wizyta ${p.serviceName} w ${p.businessName}, ${p.slotLabel} została anulowana.`,
    declined: (p) => `TermCatch: salon ${p.businessName} odwołał wizytę ${p.serviceName}, ${p.slotLabel}.${p.reason ? ` Powód: ${p.reason}.` : ""} Zarezerwuj inny termin w aplikacji.`,
    reminder: (p) => `TermCatch: przypomnienie — jutro ${p.serviceName} w ${p.businessName}, ${p.slotLabel}. Jeśli nie możesz przyjść, przełóż wizytę w panelu.`,
  },
  en: {
    confirmed: (p) => `TermCatch: appointment confirmed — ${p.serviceName} at ${p.businessName}, ${p.slotLabel}. See you there!`,
    rescheduledByCustomer: (p) => `TermCatch: appointment rescheduled — ${p.serviceName} at ${p.businessName}, new time: ${p.slotLabel}. The salon will confirm the change.`,
    rescheduledByBusiness: (p) => `TermCatch: ${p.businessName} moved your ${p.serviceName} appointment to ${p.slotLabel}${p.oldSlotLabel ? ` (previously ${p.oldSlotLabel})` : ""}.`,
    cancelled: (p) => `TermCatch: your ${p.serviceName} appointment at ${p.businessName}, ${p.slotLabel} has been cancelled.`,
    declined: (p) => `TermCatch: ${p.businessName} declined your ${p.serviceName} appointment, ${p.slotLabel}.${p.reason ? ` Reason: ${p.reason}.` : ""} Please book another time in the app.`,
    reminder: (p) => `TermCatch: reminder — tomorrow ${p.serviceName} at ${p.businessName}, ${p.slotLabel}. If you can't make it, reschedule in the app.`,
  },
  de: {
    confirmed: (p) => `TermCatch: Termin bestätigt — ${p.serviceName} bei ${p.businessName}, ${p.slotLabel}. Bis bald!`,
    rescheduledByCustomer: (p) => `TermCatch: Termin verschoben — ${p.serviceName} bei ${p.businessName}, neuer Termin: ${p.slotLabel}. Der Salon bestätigt die Änderung.`,
    rescheduledByBusiness: (p) => `TermCatch: ${p.businessName} hat Ihren Termin ${p.serviceName} auf ${p.slotLabel} verschoben${p.oldSlotLabel ? ` (zuvor ${p.oldSlotLabel})` : ""}.`,
    cancelled: (p) => `TermCatch: Ihr Termin ${p.serviceName} bei ${p.businessName}, ${p.slotLabel} wurde storniert.`,
    declined: (p) => `TermCatch: ${p.businessName} hat Ihren Termin ${p.serviceName}, ${p.slotLabel} abgelehnt.${p.reason ? ` Grund: ${p.reason}.` : ""} Bitte buchen Sie einen anderen Termin in der App.`,
    reminder: (p) => `TermCatch: Erinnerung — morgen ${p.serviceName} bei ${p.businessName}, ${p.slotLabel}. Falls Sie nicht können, verschieben Sie den Termin in der App.`,
  },
  tr: {
    confirmed: (p) => `TermCatch: randevu onaylandı — ${p.businessName} salonunda ${p.serviceName}, ${p.slotLabel}. Görüşmek üzere!`,
    rescheduledByCustomer: (p) => `TermCatch: randevu ertelendi — ${p.businessName} salonunda ${p.serviceName}, yeni saat: ${p.slotLabel}. Salon değişikliği onaylayacak.`,
    rescheduledByBusiness: (p) => `TermCatch: ${p.businessName}, ${p.serviceName} randevunuzu ${p.slotLabel} saatine aldı${p.oldSlotLabel ? ` (önceden ${p.oldSlotLabel})` : ""}.`,
    cancelled: (p) => `TermCatch: ${p.businessName} salonundaki ${p.serviceName} randevunuz (${p.slotLabel}) iptal edildi.`,
    declined: (p) => `TermCatch: ${p.businessName}, ${p.serviceName} randevunuzu (${p.slotLabel}) reddetti.${p.reason ? ` Sebep: ${p.reason}.` : ""} Lütfen uygulamadan başka bir saat seçin.`,
    reminder: (p) => `TermCatch: hatırlatma — yarın ${p.businessName} salonunda ${p.serviceName}, ${p.slotLabel}. Gelemeyecekseniz uygulamadan erteleyin.`,
  },
};

export function bookingSmsBody(locale: Locale, kind: BookingSmsKind, params: BookingSmsParams): string {
  const set = TEMPLATES[locale] ?? TEMPLATES[FALLBACK_LOCALE];
  return set[kind](params);
}
