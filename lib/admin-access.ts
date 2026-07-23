import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Server gate for admin PAGES. Authorized when the DB role is ADMIN/SUPERADMIN
 * or the email is in ADMIN_EMAILS (identical rule to the admin dashboard).
 * Redirects to login (unauthenticated) or home (authenticated non-admin).
 */
export async function requireAdminPage(returnTo: string): Promise<void> {
  const authUser = await getServerUser();
  if (!authUser) redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);

  const email = (authUser.email ?? "").toLowerCase();
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { role: true },
  });
  const isAdmin =
    dbUser?.role === "ADMIN" ||
    dbUser?.role === "SUPERADMIN" ||
    parseAdminEmails().includes(email);
  if (!isAdmin) redirect("/");
}
