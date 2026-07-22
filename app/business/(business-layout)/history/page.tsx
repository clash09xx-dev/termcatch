export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth-user";
import { AppointmentStatus } from "@prisma/client";
import { HistoryClient } from "./history-client";

// Permanent home for past appointments (completed / cancelled / no-show) — the
// calendar is date-focused and the CRM is per-client; neither is a filterable
// history list. Read-only, real appointment data.
const HISTORY_STATUSES = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED_CUSTOMER,
  AppointmentStatus.CANCELLED_BUSINESS,
  AppointmentStatus.NO_SHOW,
];

export default async function HistoryPage() {
  const dbUser = await getOrCreateDbUser();
  const business = (
    await prisma.business.findMany({ where: { ownerId: dbUser.id }, take: 1, select: { id: true } })
  )[0];
  if (!business) redirect("/business/onboarding");

  const appts = await prisma.appointment.findMany({
    where: { businessId: business.id, status: { in: HISTORY_STATUSES } },
    orderBy: { startTime: "desc" },
    take: 200,
    include: {
      customer: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  const rows = appts.map((a) => ({
    id: a.id,
    status: a.status,
    startTime: a.startTime.toISOString(),
    price: a.price,
    duration: a.duration,
    customer: `${a.customer.firstName} ${a.customer.lastName}`.trim() || "Klient",
    service: a.service.name,
    employee: a.employee ? `${a.employee.firstName} ${a.employee.lastName}`.trim() : null,
  }));

  return <HistoryClient rows={rows} />;
}
