import "server-only";

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, pickLocale, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

/**
 * Resolve the request locale server-side: the persisted cookie (manual selection)
 * wins, else the browser Accept-Language hint, else Polish. The cookie is written
 * by setLocale and synced from the account preference at login, so this stays a
 * fast, DB-free read on every render.
 */
export async function resolveLocale(): Promise<Locale> {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  return pickLocale({ cookie: jar.get(LOCALE_COOKIE)?.value, acceptLanguage: h.get("accept-language") });
}

export async function getServerI18n(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await resolveLocale();
  return { locale, dict: getDictionary(locale) };
}
