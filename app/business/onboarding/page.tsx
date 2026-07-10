import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Konfiguracja salonu — Termcatch",
};

// Focused full-screen flow — deliberately OUTSIDE the dashboard shell:
// no sidebar, no topbar, no escape hatches until the salon exists.
export default async function OnboardingPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  // Already onboarded? Straight to the panel.
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      firstName: true,
      lastName: true,
      ownedBusinesses: { take: 1, select: { id: true } },
    },
  });
  if (dbUser?.ownedBusinesses[0]) redirect("/business/dashboard");

  const ownerName = [dbUser?.firstName, dbUser?.lastName].filter(Boolean).join(" ")
    || (user.user_metadata?.first_name as string | undefined)
    || "";

  return <OnboardingClient ownerName={ownerName} />;
}
