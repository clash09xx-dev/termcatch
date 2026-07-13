export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CalendarClient } from "./calendar-client";
import type { Appointment, Service, Employee, User, WorkingHours } from "@prisma/client";

type AppointmentWithRelations = Appointment & {
  service: Service;
  employee: Employee | null;
  customer: User;
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-first
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getCalendarData(supabaseId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          workingHours: true,
          services: { where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true, duration: true, price: true, discountedPrice: true } },
          employees: { where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, firstName: true, lastName: true, color: true } },
          appointments: {
            where: { startTime: { gte: weekStart, lt: weekEnd }, status: { not: "CANCELLED_CUSTOMER" } },
            orderBy: { startTime: "asc" },
            include: { service: true, employee: true, customer: true },
          },
        },
      },
    },
  });
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; date?: string; action?: string; time?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  // Focus date drives the week we fetch; day view centres on it.
  const focusDate = params.date ? new Date(params.date) : params.week ? new Date(params.week) : new Date();
  const weekStart = getWeekStart(focusDate);

  const dbUser = await getCalendarData(user.id, weekStart);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  return (
    <CalendarClient
      appointments={business.appointments as AppointmentWithRelations[]}
      weekStart={weekStart.toISOString()}
      focusDate={(params.date ? focusDate : new Date()).toISOString()}
      businessId={business.id}
      services={business.services}
      employees={business.employees}
      workingHours={business.workingHours as WorkingHours[]}
      openNewOnLoad={params.action === "new"}
      prefillDate={params.date}
      prefillTime={params.time}
    />
  );
}
