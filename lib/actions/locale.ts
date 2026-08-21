"use server";

import { cookies } from "next/headers";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isLocale } from "@/lib/i18n/config";
import { writeLocaleCookie } from "@/lib/i18n/locale-sync";

export type SetLocaleResult = {
  /** The selection was applied to this device. */
  ok: boolean;
  /**
   * The selection also reached the account, so e-mail and other devices will
   * follow it. `false` for a signed-out visitor (nothing to persist to), and
   * `false` when the write was attempted and failed.
   */
  persisted: boolean;
  /** Set only when persistence was attempted and failed. */
  error?: "not_persisted";
};

/**
 * Manual language selection.
 *
 * WHAT CHANGED, AND WHY
 * This used to write the cookie first and then attempt the account write inside
 * `catch { /* best-effort *\/ }`, returning `{ ok: true }` either way. So a
 * failed database write produced a UI that had visibly changed language and an
 * account that had not — the exact split that sent Turkish e-mail to a user
 * reading a Polish interface, with nothing anywhere reporting a problem.
 *
 * Now:
 *   - the ACCOUNT is written first, because it is the canonical store
 *   - the cookie is written regardless, so the user is never stuck watching a
 *     language they did not choose because a database blipped
 *   - the caller is TOLD when persistence failed (`persisted: false`), so the UI
 *     can say "changed on this device, but we could not save it to your
 *     account" instead of implying success
 *
 * Writing the cookie even on failure is deliberate. Refusing the change would
 * be the only way to keep the two stores identical at all times, but it trades a
 * reported, recoverable inconsistency for a dead end where the user cannot
 * change language at all. The inconsistency is also self-healing: the next login
 * reconciles the two (lib/i18n/locale-sync), and it promotes the cookie, so the
 * user's choice is what survives.
 */
export async function setLocale(locale: string): Promise<SetLocaleResult> {
  if (!isLocale(locale)) return { ok: false, persisted: false };

  let persisted = false;
  let attempted = false;
  try {
    const user = await getServerUser();
    if (user) {
      attempted = true;
      const res = await prisma.user.updateMany({ where: { supabaseId: user.id }, data: { locale } });
      // updateMany reports 0 for "no such row" without throwing, which is a
      // failure to persist just as much as an exception is.
      persisted = res.count > 0;
    }
  } catch (err) {
    console.error("[setLocale] could not persist locale to account", { locale, err });
    persisted = false;
  }

  const jar = await cookies();
  writeLocaleCookie(jar, locale);

  if (attempted && !persisted) return { ok: true, persisted: false, error: "not_persisted" };
  return { ok: true, persisted };
}
