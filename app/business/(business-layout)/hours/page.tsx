export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { HoursClient } from "./hours-client";

const DAY_ORDER = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
] as const;

const DEFAULT_HOURS = DAY_ORDER.map((day, i) => ({
  dayOfWeek: day,
  isOpen: i < 5,
  openTime: "09:00",
  closeTime: "18:00",
}));

async function getHoursData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          workingHours: true,
        },
      },
    },
  });
  return dbUser;
}

export default async function HoursPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getHoursData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  // Merge DB hours with defaults
  const hoursMap = new Map(
    business.workingHours.map((h) => [h.dayOfWeek, h])
  );

  const hours = DEFAULT_HOURS.map((def) => {
    const existing = hoursMap.get(def.dayOfWeek);
    return existing
      ? {
          dayOfWeek: existing.dayOfWeek as typeof DAY_ORDER[number],
          isOpen: existing.isOpen,
          openTime: existing.openTime,
          closeTime: existing.closeTime,
        }
      : def;
  });

  return <HoursClient initialHours={hours} />;
}
