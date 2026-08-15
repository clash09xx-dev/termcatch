import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { currentUserOwnsBusiness } from "@/lib/ownership";

/**
 * The one authenticated entry point.
 *
 * Chrome that needs to link "to your dashboard" used to guess the destination
 * from `user_metadata.role`, which is self-writable by any authenticated user
 * (see lib/is-admin.ts) and goes stale the moment someone registers a salon
 * after signing up as a customer. Guessing produced a link to the wrong panel.
 *
 * This route resolves the destination server-side from the same ownership
 * helper the panels themselves use, so the navbar can link here unconditionally
 * and never has to know the caller's role.
 */
export const dynamic = "force-dynamic";

export default async function DashboardRouter() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Employees resolve to ownsBusiness=false and land in the customer panel,
  // which is the same behaviour they get from every other entry point.
  redirect((await currentUserOwnsBusiness()) ? "/business/dashboard" : "/customer/dashboard");
}
