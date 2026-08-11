import "server-only";

import { prisma } from "@/lib/prisma";
import { buildAudience, type AudienceAppointment } from "@/lib/marketing";
import { warsawDateString } from "@/lib/timezone";
import type { AiTool } from "./registry";
import { str, int } from "./registry";

const AUDIENCE_SELECT = {
  customerId: true,
  status: true,
  startTime: true,
  customer: {
    select: {
      firstName: true, lastName: true, email: true, phone: true,
      marketingEmails: true, smsNotifications: true, whatsappNotifications: true,
    },
  },
} as const;

async function loadAudience(businessId: string) {
  const appts = (await prisma.appointment.findMany({
    where: { businessId },
    select: AUDIENCE_SELECT,
    orderBy: { startTime: "desc" },
    take: 5000,
  })) as unknown as AudienceAppointment[];
  return buildAudience(appts);
}

export const clientTools: AiTool[] = [
  {
    name: "find_inactive_clients",
    kind: "read",
    roles: ["owner"],
    description:
      "Znajdź klientów, którzy nie byli w salonie od co najmniej N dni (domyślnie 60) i nie mają nadchodzącej wizyty. Do reaktywacji / kampanii. Zwraca liczbę + listę (maks. 60).",
    parameters: {
      properties: { days: { type: "integer", description: "Minimalna liczba dni bez wizyty (domyślnie 60)" } },
    },
    async run(args, { actor }) {
      const days = Math.max(1, int(args, "days") ?? 60);
      const recipients = await loadAudience(actor.businessId);
      const dormant = recipients.filter(
        (r) => r.upcomingCount === 0 && r.completedCount >= 1 && r.lastCompletedAgeDays !== null && r.lastCompletedAgeDays >= days
      );
      dormant.sort((a, b) => (b.lastCompletedAgeDays ?? 0) - (a.lastCompletedAgeDays ?? 0));
      return {
        thresholdDays: days,
        total: dormant.length,
        reachableEmail: dormant.filter((r) => r.email && r.emailOptIn).length,
        reachableSms: dormant.filter((r) => r.phone && r.smsOptIn).length,
        clients: dormant.slice(0, 60).map((r) => ({
          id: r.id,
          name: `${r.firstName} ${r.lastName}`.trim(),
          daysSinceVisit: r.lastCompletedAgeDays,
          lastVisit: r.lastVisitISO ? warsawDateString(new Date(r.lastVisitISO)) : null,
          completedVisits: r.completedCount,
          hasEmail: Boolean(r.email),
          hasPhone: Boolean(r.phone),
        })),
      };
    },
  },

  {
    name: "search_clients",
    kind: "read",
    roles: ["owner"],
    description: "Wyszukaj klientów salonu po imieniu, nazwisku, e-mailu lub telefonie. Min. 2 znaki. Maks. 20 wyników.",
    parameters: {
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    async run(args, { actor }) {
      const q = str(args, "query");
      if (!q || q.length < 2) return { error: "Podaj co najmniej 2 znaki." };
      const users = await prisma.user.findMany({
        where: {
          appointments: { some: { businessId: actor.businessId } },
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        take: 20,
      });
      return {
        count: users.length,
        clients: users.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          email: u.email.endsWith("termcatch.local") ? null : u.email,
          phone: u.phone,
        })),
      };
    },
  },
];
