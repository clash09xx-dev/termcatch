export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CalendarClient } from "./calendar-client";
import type { Appointment, Service, Employee, User } from "@prisma/client";

type AppointmentWithRelations = Appointment & {
  service: Service;
  employee: Employee | null;
  customer: User;
};

async function getCalendarData(supabaseId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          appointments: {
            where: {
              startTime: { gte: weekStart, lt: weekEnd },
              status: { not: "CANCELLED_CUSTOMER" },
            },
            orderBy: { startTime: "asc" },
            include: {
              service: true,
              employee: true,
              customer: true,
            },
          },
        },
      },
    },
  });

  return dbUser;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = 0 for Polish locale
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const weekParam = params.week;
  const weekStart = weekParam ? new Date(weekParam) : getWeekStart(new Date());

  const dbUser = await getCalendarData(user.id, weekStart);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  return (
    <CalendarClient
      appointments={business.appointments as AppointmentWithRelations[]}
      weekStart={weekStart.toISOString()}
    />
  );
}
