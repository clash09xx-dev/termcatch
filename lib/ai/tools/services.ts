import "server-only";

import { prisma } from "@/lib/prisma";
import type { AiTool } from "./registry";
import { int } from "./registry";

const DAY_MS = 24 * 60 * 60 * 1000;

export const serviceTools: AiTool[] = [
  {
    name: "service_performance",
    kind: "read",
    roles: ["owner"],
    description:
      "Ranking usług w oknie N dni (domyślnie 30) po przychodzie i liczbie wizyt ukończonych. Do pytań o najbardziej dochodowe / najczęściej wybierane usługi.",
    parameters: {
      properties: { days: { type: "integer", description: "Okno w dniach (domyślnie 30)" } },
    },
    async run(args, { actor }) {
      const days = Math.max(1, int(args, "days") ?? 30);
      const gte = new Date(Date.now() - days * DAY_MS);
      const grouped = await prisma.appointment.groupBy({
        by: ["serviceId"],
        where: { businessId: actor.businessId, status: "COMPLETED", startTime: { gte } },
        _sum: { price: true },
        _count: { _all: true },
      });
      if (grouped.length === 0) return { windowDays: days, services: [] };
      const services = await prisma.service.findMany({
        where: { businessId: actor.businessId, id: { in: grouped.map((g) => g.serviceId) } },
        select: { id: true, name: true },
      });
      const nameById = new Map(services.map((s) => [s.id, s.name]));
      const rows = grouped
        .map((g) => ({
          name: nameById.get(g.serviceId) ?? "Usunięta usługa",
          completed: g._count._all,
          revenue: Math.round((g._sum.price ?? 0) * 100) / 100,
        }))
        .sort((a, b) => b.revenue - a.revenue);
      return { windowDays: days, services: rows.slice(0, 15) };
    },
  },
];
