export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { StaffClient } from "./staff-client";

async function getStaffData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          employees: {
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            include: {
              services: {
                include: { service: true },
              },
            },
          },
          services: {
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });
  return dbUser;
}

export default async function StaffPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getStaffData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  // Honest load: appointments in the next 7 days per employee
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86400_000);
  const upcoming = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      startTime: { gte: now, lt: weekAhead },
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      employeeId: { not: null },
    },
    select: { employeeId: true },
  });
  const weekLoad: Record<string, number> = {};
  for (const a of upcoming) if (a.employeeId) weekLoad[a.employeeId] = (weekLoad[a.employeeId] ?? 0) + 1;

  return (
    <StaffClient
      employees={business.employees}
      availableServices={business.services}
      weekLoad={weekLoad}
    />
  );
}
