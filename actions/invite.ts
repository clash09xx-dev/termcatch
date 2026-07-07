"use server";

import { getServerUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

export type InviteState = {
  error?: string;
  sent?: boolean;
};

export async function sendInvite(email: string): Promise<InviteState> {
  // Sprawdź czy nadawca jest zalogowany
  const user = await getServerUser();
  if (!user) return { error: "Nie jesteś zalogowany." };

  // Walidacja emaila
  const parsed = z.string().email().safeParse(email.trim());
  if (!parsed.success) return { error: "Podaj prawidłowy adres e-mail." };

  // Nie pozwól na zaproszenie samego siebie
  if (parsed.data.toLowerCase() === user.email?.toLowerCase()) {
    return { error: "Nie możesz zaprosić samego siebie." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"}/register`,
    });

    if (error) {
      // Użytkownik już istnieje — traktuj jako sukces (nie ujawniaj)
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("user already exists")
      ) {
        return { sent: true };
      }
      console.error("[invite] error:", error.message);
      return { error: "Nie udało się wysłać zaproszenia. Spróbuj ponownie." };
    }

    return { sent: true };
  } catch (err) {
    console.error("[invite] unexpected error:", err);
    return { error: "Wystąpił błąd. Spróbuj ponownie." };
  }
}
