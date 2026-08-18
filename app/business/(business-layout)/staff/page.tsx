export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { effectiveStatus } from "@/lib/employee/invite-status";
import { StaffClient } from "./staff-client";

async function getStaffData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        select: {
          id: true,
          name: true,
          joinCode: true,
          employees: {
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            include: {
              services: {
                include: { service: true },
              },
              // The owner edits these in the team modal; the availability engine
              // reads them to narrow each specialist's bookable window.
              workingHours: {
                select: { dayOfWeek: true, isWorking: true, startTime: true, endTime: true },
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

  // Latest invitation status per employee (for the "Zaproś / status" controls).
  const invites = await prisma.employeeInvitation.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    select: { employeeId: true, status: true, expiresAt: true, acceptedAt: true },
  });
  const inviteStatus: Record<string, string> = {};
  for (const inv of invites) if (!(inv.employeeId in inviteStatus)) inviteStatus[inv.employeeId] = effectiveStatus(inv);

  // People who typed the salon's join code and are waiting on this owner. They
  // are NOT members yet — there is no Employee row until the owner approves —
  // so they are a separate list, never mixed into the team grid.
  const pendingRequests = (
    await prisma.employeeJoinRequest.findMany({
      where: { businessId: business.id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        blockedAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    })
  ).map((r) => ({
    id: r.id,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    email: r.user.email,
    // Serialized for the client boundary; the UI renders it relatively.
    createdAt: r.createdAt.toISOString(),
    blocked: r.blockedAt !== null,
  }));

  return (
    <StaffClient
      employees={business.employees}
      availableServices={business.services}
      weekLoad={weekLoad}
      inviteStatus={inviteStatus}
      salonName={business.name}
      joinCode={business.joinCode}
      pendingRequests={pendingRequests}
    />
  );
}
