import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LOCALE_COOKIE, isLocale, type Locale } from "./config";

/**
 * Keeping `User.locale` and the locale cookie from drifting apart.
 *
 * THE BUG THIS EXISTS TO CLOSE
 * There were two stores and no rule tying them together:
 *
 *   the COOKIE  decided what the UI rendered (resolveLocale reads it)
 *   `User.locale` decided what transactional e-mail said (recipientLocale reads it)
 *
 * Nothing guaranteed they agreed, and two separate code paths guaranteed they
 * would not:
 *
 *   1. `setLocale` wrote the cookie, then attempted the DB write inside a
 *      `catch {}` that swallowed failures and still reported success.
 *   2. Login copied DB -> cookie ONLY when no cookie existed
 *      ("respect an explicit on-device choice"), and never the other way. So a
 *      browser holding `pl` against an account holding `tr` stayed split for
 *      good.
 *
 * The observable result: a Polish interface sending Turkish confirmation
 * e-mails. Both stores were behaving exactly as written; nothing owned the
 * relationship between them.
 *
 * THE RULE, in one place
 *   - `User.locale` is the CANONICAL persisted preference for a signed-in user.
 *     E-mail reads it, and it follows the account across devices.
 *   - The cookie is the per-device carrier. It exists so the UI can resolve a
 *     locale without a database round trip on every render, and so a signed-out
 *     visitor keeps a language at all.
 *   - They are reconciled at every session start, in whichever direction has
 *     the newer intent, and after that they are equal.
 *
 * WHY THE COOKIE WINS AT LOGIN WHEN THE TWO DISAGREE
 * A cookie value only exists because somebody picked it on this device (or a
 * previous reconciliation put it there). It is therefore the most recent
 * explicit statement of intent, and discarding it would silently undo a choice
 * the user just made on the login screen. So the cookie is promoted INTO the
 * canonical store rather than being overwritten by it. The store stays
 * canonical; it simply gets updated.
 *
 * NO REDIRECTS ARE INVOLVED
 * Reconciliation is a cookie write on a response that is already being sent, so
 * it cannot loop. And it never runs during a Server Component render, where
 * Next.js forbids setting cookies.
 */

export type LocaleReconcileResult = {
  /** The locale in force after reconciliation. Cookie and DB both hold this. */
  locale: Locale | null;
  /** What had to move for the two to agree. */
  action: "cookie-adopted-into-account" | "account-copied-to-cookie" | "already-in-sync" | "nothing-to-sync";
};

/**
 * Make the cookie and `User.locale` agree. Call once per session start, after
 * the account row is known.
 *
 * Post-condition: if either store held a usable locale, BOTH hold the same one.
 */
export async function reconcileLocaleOnLogin(
  userId: string | null | undefined,
  accountLocale: string | null | undefined
): Promise<LocaleReconcileResult> {
  const jar = await cookies();
  const plan = await planLocaleReconciliation(jar.get(LOCALE_COOKIE)?.value, userId, accountLocale);
  if (plan.cookieNeedsWrite && plan.locale) writeLocaleCookie(jar, plan.locale);
  return { locale: plan.locale, action: plan.action };
}

/**
 * The decision half, separated from writing the cookie.
 *
 * A Route Handler that answers with `NextResponse.redirect(...)` must attach
 * cookies to THAT response (`res.cookies.set`); a write through `cookies()` is
 * not reliably carried on a redirect. So the OAuth callback needs the decision
 * and the account write without the cookie write, and gets it here — one rule,
 * two carriers, no duplicated logic.
 *
 * Returns `cookieNeedsWrite` so the caller knows whether to bother.
 */
export async function planLocaleReconciliation(
  cookieLocale: string | null | undefined,
  userId: string | null | undefined,
  accountLocale: string | null | undefined
): Promise<{ locale: Locale | null; action: LocaleReconcileResult["action"]; cookieNeedsWrite: boolean }> {
  const cookieOk = isLocale(cookieLocale) ? cookieLocale : null;
  const accountOk = isLocale(accountLocale) ? accountLocale : null;

  // Nothing chosen anywhere yet. Accept-Language still drives the UI; there is
  // no preference to persist, and inventing one from a browser hint would turn
  // a guess into a stored decision.
  if (!cookieOk && !accountOk) return { locale: null, action: "nothing-to-sync", cookieNeedsWrite: false };

  if (cookieOk && accountOk && cookieOk === accountOk) {
    return { locale: cookieOk, action: "already-in-sync", cookieNeedsWrite: false };
  }

  // The device made a choice the account does not know about (or disagrees
  // with). Promote it into the canonical store.
  if (cookieOk) {
    if (userId) {
      try {
        await prisma.user.update({ where: { id: userId }, data: { locale: cookieOk } });
      } catch (err) {
        // Log loudly. A swallowed failure here is precisely how the two stores
        // drifted before, and it stays observable rather than silent.
        console.error("[locale-sync] could not persist cookie locale to account", { userId, locale: cookieOk, err });
      }
    }
    return { locale: cookieOk, action: "cookie-adopted-into-account", cookieNeedsWrite: false };
  }

  // Only the account has a preference — a fresh device, or cleared cookies.
  return { locale: accountOk!, action: "account-copied-to-cookie", cookieNeedsWrite: true };
}

/**
 * Set the cookie on a mutable cookie jar (server action / route handler).
 * A year, lax, root path: the same shape every caller used, in one place so the
 * flags cannot drift between them.
 */
export function writeLocaleCookie(
  jar: { set: (name: string, value: string, opts: Record<string, unknown>) => void },
  locale: Locale
): void {
  jar.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/**
 * The account's stored locale, or null. Used by resolveLocale ONLY when the
 * request carries no usable cookie, so the hot render path stays DB-free.
 */
export async function accountLocale(userId: string): Promise<Locale | null> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
    return isLocale(u?.locale) ? u.locale : null;
  } catch {
    // A locale lookup must never be able to fail a page render.
    return null;
  }
}
