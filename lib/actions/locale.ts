"use server";

import { cookies } from "next/headers";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

/**
 * Manual language selection. Persists to the cookie (survives reloads/navigation
 * and logout) AND, for logged-in users, to User.locale (follows the account).
 * A manual selection always wins over the browser hint.
 */
export async function setLocale(locale: string): Promise<{ ok: boolean }> {
  if (!isLocale(locale)) return { ok: false };
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  try {
    const user = await getServerUser();
    if (user) await prisma.user.updateMany({ where: { supabaseId: user.id }, data: { locale } });
  } catch {
    /* account persistence is best-effort — the cookie already applied */
  }
  return { ok: true };
}
