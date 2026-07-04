import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import type { User } from "@prisma/client";

/**
 * Zwraca użytkownika z naszej bazy. Jeśli rekordu brakuje (np. rejestracja
 * odbyła się w momencie awarii bazy), tworzy go na podstawie danych
 * z Supabase Auth — zamiast odsyłać na /login i wywoływać pętlę
 * przekierowań (proxy odsyła zalogowanych z /login z powrotem).
 */
export async function getOrCreateDbUser(): Promise<User> {
  const authUser = await getServerUser();
  if (!authUser) redirect("/login");

  let dbUser = await prisma.user
    .findUnique({ where: { supabaseId: authUser.id } })
    .catch(() => null);

  if (!dbUser) {
    const md = authUser.user_metadata ?? {};
    dbUser = await prisma.user
      .upsert({
        where: { supabaseId: authUser.id },
        create: {
          supabaseId: authUser.id,
          email: authUser.email ?? `${authUser.id}@unknown.termcatch.com`,
          firstName:
            (md.firstName as string) ??
            (md.full_name as string)?.split(" ")[0] ??
            (md.given_name as string) ??
            "Użytkownik",
          lastName:
            (md.lastName as string) ??
            ((md.full_name as string)?.split(" ").slice(1).join(" ") || "") ??
            (md.family_name as string) ??
            "",
          avatarUrl: (md.avatar_url as string) ?? (md.picture as string) ?? null,
          role: (md.role as "CUSTOMER" | "BUSINESS_OWNER") ?? "CUSTOMER",
          isVerified: !!authUser.email_confirmed_at,
          lastLoginAt: new Date(),
        },
        update: { lastLoginAt: new Date() },
      })
      .catch(() => null);
  }

  if (!dbUser) {
    // Baza nie działa — wyloguj, żeby przerwać ewentualną pętlę przekierowań
    redirect("/auth/signout");
  }

  return dbUser;
}
