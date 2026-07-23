export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FinalizeClient } from "./finalize-client";

// Neutral post-Checkout landing. We NEVER assign the plan from this redirect —
// the page waits for the Stripe webhook to confirm the subscription, then sends
// the owner to the dashboard.
export default async function FinalizePage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  if (!dbUser?.ownedBusinesses[0]) redirect("/business/onboarding");

  return <FinalizeClient />;
}
