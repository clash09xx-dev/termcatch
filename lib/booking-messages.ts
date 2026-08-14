// Friendly, localized copy for the outcomes a booking write can produce. The
// server actions throw the stable SLOT_TAKEN sentinel (see lib/booking-conflict)
// rather than human text, so every surface can render it in the viewer's
// language. Owner-facing (Polish-primary) callers can omit the locale.

import type { Locale } from "@/lib/i18n/config";
import { SLOT_TAKEN } from "@/lib/booking-conflict";

export const SLOT_TAKEN_MESSAGE: Record<Locale, string> = {
  pl: "Ten termin został właśnie zajęty. Wybierz inną godzinę.",
  en: "This slot is no longer available. Please choose another time.",
  de: "Dieser Termin ist nicht mehr verfügbar. Bitte wählen Sie eine andere Zeit.",
  tr: "Bu saat artık müsait değil. Lütfen başka bir saat seçin.",
};

export const GENERIC_BOOKING_ERROR: Record<Locale, string> = {
  pl: "Wystąpił błąd. Spróbuj ponownie.",
  en: "Something went wrong. Please try again.",
  de: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
  tr: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
};

/** Map a thrown booking error message to display copy in the given language.
 * SLOT_TAKEN → the friendly "slot no longer available"; anything else falls
 * back to its own message (or a generic localized error when empty). */
export function bookingErrorText(message: string | undefined | null, locale: Locale = "pl"): string {
  if (message && message.includes(SLOT_TAKEN)) return SLOT_TAKEN_MESSAGE[locale] ?? SLOT_TAKEN_MESSAGE.pl;
  return message || GENERIC_BOOKING_ERROR[locale] || GENERIC_BOOKING_ERROR.pl;
}
