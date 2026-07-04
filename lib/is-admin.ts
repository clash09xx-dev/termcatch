import { getServerUser } from "@/lib/supabase/server";

/** Czy aktualnie zalogowany użytkownik jest adminem platformy (ADMIN_EMAILS)? */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const user = await getServerUser();
    if (!user) return false;
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const email = (user.email ?? "").toLowerCase();
    if (adminEmails.includes(email)) return true;
    const role = user.user_metadata?.role as string | undefined;
    return role === "ADMIN" || role === "SUPERADMIN";
  } catch {
    return false;
  }
}
