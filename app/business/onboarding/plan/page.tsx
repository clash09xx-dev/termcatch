export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { billingConfigured, normalizePlanKey } from "@/lib/subscription";
import { PlanSelectClient } from "./plan-select-client";

export default async function OnboardingPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  // Plan selection only makes sense once the business exists.
  if (!dbUser?.ownedBusinesses[0]) redirect("/business/onboarding");

  const { plan } = await searchParams;
  const preselect = normalizePlanKey(plan);

  return <PlanSelectClient billingReady={billingConfigured()} preselect={preselect} />;
}
