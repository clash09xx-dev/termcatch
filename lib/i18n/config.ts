/**
 * i18n configuration (client-safe, pure).
 *
 * Architecture: cookie + account-preference locale, NO URL prefix. This keeps
 * every existing production URL intact (no /pl//en/ rewrite), fits the App
 * Router's server-component-first layout, and reuses the existing User.locale
 * column for logged-in persistence. UI text only — country/timezone/phone/
 * currency stay separate (language ≠ country).
 */

export const LOCALES = ["pl", "en", "de", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pl";
export const FALLBACK_LOCALE: Locale = "pl";
export const LOCALE_COOKIE = "tc-locale";

export const LOCALE_LABEL: Record<Locale, string> = {
  pl: "Polski",
  en: "English",
  de: "Deutsch",
  tr: "Türkçe",
};

/** Small flag glyphs (emoji) — language ≠ country, purely decorative. */
export const LOCALE_FLAG: Record<Locale, string> = {
  pl: "🇵🇱",
  en: "🇬🇧",
  de: "🇩🇪",
  tr: "🇹🇷",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Coerce any value to a supported locale, else the default. */
export function toLocale(v: unknown): Locale {
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/**
 * Resolve a locale hint from a browser Accept-Language header. Only used as a
 * SECONDARY hint when there is no saved preference; unsupported → default (PL).
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.trim().split(";")[0].trim().toLowerCase();
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}

/**
 * The single resolution rule (pure, testable):
 *   1. explicit cookie — a manual selection (or its persisted value) ALWAYS wins
 *   2. account preference — beats the browser
 *   3. browser Accept-Language hint — else the default (Polish)
 */
export function pickLocale(input: { cookie?: string | null; userLocale?: string | null; acceptLanguage?: string | null }): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  if (isLocale(input.userLocale)) return input.userLocale;
  return localeFromAcceptLanguage(input.acceptLanguage);
}
