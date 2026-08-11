"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries/pl";
import type { Locale } from "@/lib/i18n/config";

/**
 * Holds the resolved locale + its dictionary, seeded once from the server layout.
 * Only ONE locale's dictionary is shipped to the client (passed as a prop in the
 * RSC payload) — the other three never reach the browser bundle.
 */
type I18nValue = { locale: Locale; t: Dictionary };
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: dict }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const v = useContext(I18nContext);
  // Fallback keeps the app usable even if a client tree renders outside the
  // provider — never throws in production, never shows raw keys.
  if (!v) throw new Error("useI18n must be used within <I18nProvider>");
  return v;
}

export function useT(): Dictionary {
  return useI18n().t;
}
export function useLocale(): Locale {
  return useI18n().locale;
}
