export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./settings-client";

async function getSettingsData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: { take: 1 },
    },
  });
  return dbUser;
}

export default async function SettingsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getSettingsData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  return (
    <SettingsClient
      settings={{
        advanceBookingDays: business.advanceBookingDays,
        minAdvanceHours: business.minAdvanceHours,
        timeSlotDuration: business.timeSlotDuration,
        cancellationHours: business.cancellationHours,
        cancellationFeeType: business.cancellationFeeType ?? "",
        cancellationFeeValue: business.cancellationFeeValue ?? 0,
        emailNotifications: true,
        smsNotifications: false,
      }}
    />
  );
}
