import "server-only";

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, pickLocale, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

/**
 * Resolve the request locale server-side.
 *
 * ORDER (the same rule pickLocale documents):
 *   1. the cookie — a manual selection, or a reconciliation that put it there
 *   2. the signed-in account's `User.locale`
 *   3. the browser Accept-Language hint, else Polish
 *
 * WHY STEP 2 ONLY RUNS WITHOUT A COOKIE
 * `pickLocale` has always supported `userLocale`, but nothing ever passed it, so
 * step 2 did not exist: `User.locale` was written by the language selector and
 * then never read for the UI. A signed-in user on a fresh device — or after
 * clearing cookies — got their BROWSER language instead of the preference saved
 * on their account, and had to pick it again.
 *
 * This function runs on nearly every server render, so it must not add a query
 * to the hot path. It does not: a valid cookie short-circuits before any I/O,
 * which is the overwhelmingly common case because login reconciliation
 * (lib/i18n/locale-sync) guarantees the cookie exists whenever the account has
 * a preference. The account lookup happens only in the genuinely
 * cookie-less case, which is exactly where it is the right answer.
 *
 * READ-ONLY BY CONSTRUCTION. It never writes the cookie, because Next.js
 * forbids setting cookies during a Server Component render. Convergence is the
 * job of the login path, not of a render.
 */
export async function resolveLocale(): Promise<Locale> {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  const cookie = jar.get(LOCALE_COOKIE)?.value;
  const acceptLanguage = h.get("accept-language");

  // Fast path: an explicit/reconciled cookie decides, with no I/O at all.
  const fromCookie = pickLocale({ cookie });
  if (cookie && fromCookie === cookie) return fromCookie;

  // No usable cookie — fall back to the account preference before the browser
  // hint. Imported lazily so a render that took the fast path never even loads
  // Prisma or the Supabase server client.
  try {
    const [{ getServerUser }, { prisma }, { accountLocale }] = await Promise.all([
      import("@/lib/supabase/server"),
      import("@/lib/prisma"),
      import("./locale-sync"),
    ]);
    const authUser = await getServerUser();
    if (authUser) {
      const dbUser = await prisma.user.findUnique({
        where: { supabaseId: authUser.id },
        select: { id: true },
      });
      const fromAccount = dbUser ? await accountLocale(dbUser.id) : null;
      if (fromAccount) return fromAccount;
    }
  } catch {
    // Never let locale resolution break a render; fall through to the hint.
  }

  return pickLocale({ acceptLanguage });
}

export async function getServerI18n(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await resolveLocale();
  return { locale, dict: getDictionary(locale) };
}
