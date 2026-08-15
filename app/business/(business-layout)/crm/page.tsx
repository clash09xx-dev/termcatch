export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CrmClient } from "./crm-client";

export type CustomerVisit = {
  id: string;
  startTime: string;
  status: string;
  service: { name: string };
  price: number;
};

export type CustomerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  totalAppointments: number;
  completedCount: number;
  noShowCount: number;
  upcomingCount: number;
  lastVisit: string | null;
  firstVisit: string | null;
  totalSpent: number;
  /** avg days between completed visits, null if < 2 completed */
  cadenceDays: number | null;
  appointments: CustomerVisit[];
  /** Bookings still ahead, soonest first — the thing an owner looks for first. */
  upcoming: CustomerVisit[];
  /** Free-text card note, scoped to this business (CrmContact.notes). */
  notes: string | null;
};

async function getCrmData(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          appointments: {
            orderBy: { startTime: "desc" },
            include: { customer: true, service: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export default async function CrmPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getCrmData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const now = Date.now();
  const map = new Map<string, CustomerSummary & { _completedTimes: number[] }>();

  for (const apt of business.appointments) {
    const id = apt.customerId;
    const visit: CustomerVisit = {
      id: apt.id,
      startTime: apt.startTime.toISOString(),
      status: apt.status,
      service: { name: apt.service.name },
      price: apt.price,
    };
    let c = map.get(id);
    if (!c) {
      c = {
        id,
        firstName: apt.customer.firstName,
        lastName: apt.customer.lastName,
        email: apt.customer.email,
        phone: apt.customer.phone,
        totalAppointments: 0,
        completedCount: 0,
        noShowCount: 0,
        upcomingCount: 0,
        lastVisit: null,
        firstVisit: null,
        totalSpent: 0,
        cadenceDays: null,
        appointments: [],
        upcoming: [],
        notes: null,
        _completedTimes: [],
      };
      map.set(id, c);
    }
    c.totalAppointments++;
    c.appointments.push(visit);
    if (apt.status === "COMPLETED") {
      c.completedCount++;
      c.totalSpent += apt.price;
      c._completedTimes.push(apt.startTime.getTime());
    }
    if (apt.status === "NO_SHOW") c.noShowCount++;
    if ((apt.status === "PENDING" || apt.status === "CONFIRMED") && apt.startTime.getTime() > now) {
      c.upcomingCount++;
      c.upcoming.push(visit);
    }
    // appointments are desc → first seen is latest, keep updating earliest
    if (!c.lastVisit) c.lastVisit = visit.startTime;
    c.firstVisit = visit.startTime;
  }

  // Notes live on CrmContact, created lazily the first time an owner writes one.
  const noteRows = await prisma.crmContact.findMany({
    where: { businessId: business.id, userId: { in: Array.from(map.keys()) } },
    select: { userId: true, notes: true },
  });
  const notesByUser = new Map(noteRows.map((n) => [n.userId, n.notes]));

  const customers: CustomerSummary[] = Array.from(map.values()).map(({ _completedTimes, ...c }) => {
    let cadenceDays: number | null = null;
    if (_completedTimes.length >= 2) {
      const sorted = [..._completedTimes].sort((a, b) => a - b);
      let sum = 0;
      for (let i = 1; i < sorted.length; i++) sum += sorted[i] - sorted[i - 1];
      cadenceDays = Math.round(sum / (sorted.length - 1) / 86400_000);
    }
    // Appointments arrive newest-first; upcoming reads better soonest-first.
    return {
      ...c,
      cadenceDays,
      upcoming: [...c.upcoming].reverse(),
      notes: notesByUser.get(c.id) ?? null,
    };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  return <CrmClient customers={customers} />;
}
