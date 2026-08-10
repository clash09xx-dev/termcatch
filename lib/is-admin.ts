import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Is the current user a platform admin?
 *
 * SECURITY: authorization is based on the DB role (User.role) or ADMIN_EMAILS —
 * NEVER on Supabase `user_metadata.role`. `user_metadata` is self-writable by
 * any authenticated user via `supabase.auth.updateUser({ data })`, so trusting
 * it let a normal customer escalate to admin and invoke admin mutations. The DB
 * role can only be set server-side (never during signup, which is restricted to
 * CUSTOMER/BUSINESS_OWNER), so it is the authoritative source — same rule as the
 * admin page gate (lib/admin-access.ts requireAdminPage).
 */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const user = await getServerUser();
    if (!user) return false;
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const email = (user.email ?? "").toLowerCase();
    if (email && adminEmails.includes(email)) return true;
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { role: true },
    });
    return dbUser?.role === "ADMIN" || dbUser?.role === "SUPERADMIN";
  } catch {
    return false;
  }
}
