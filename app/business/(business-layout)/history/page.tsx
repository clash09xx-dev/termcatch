export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth-user";
import { AppointmentStatus } from "@prisma/client";
import { HistoryClient } from "./history-client";

// Permanent, owner-scoped home for past appointments (completed / cancelled /
// no-show). Server-side filtered + PAGINATED — never loads a salon's entire
// lifetime history into one payload.
const PAGE_SIZE = 25;
const CANCELLED = [AppointmentStatus.CANCELLED_CUSTOMER, AppointmentStatus.CANCELLED_BUSINESS];
const ALL_PAST = [AppointmentStatus.COMPLETED, ...CANCELLED, AppointmentStatus.NO_SHOW];

const FILTER_STATUS: Record<string, AppointmentStatus[]> = {
  all: ALL_PAST,
  completed: [AppointmentStatus.COMPLETED],
  cancelled: CANCELLED,
  noshow: [AppointmentStatus.NO_SHOW],
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter && FILTER_STATUS[sp.filter] ? sp.filter : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const dbUser = await getOrCreateDbUser();
  const business = (
    await prisma.business.findMany({ where: { ownerId: dbUser.id }, take: 1, select: { id: true } })
  )[0];
  if (!business) redirect("/business/onboarding");

  const where = { businessId: business.id, status: { in: FILTER_STATUS[filter] } };
  const [total, appts] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

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

  return (
    <HistoryClient
      rows={rows}
      filter={filter}
      page={page}
      totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      total={total}
    />
  );
}
