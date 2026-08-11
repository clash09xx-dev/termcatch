import "server-only";

import { prisma } from "@/lib/prisma";
import { warsawDateString, warsawDayStartUtc } from "@/lib/timezone";
import type { AiTool } from "./registry";
import { int } from "./registry";
import { computeDemand, demandSummaryForModel } from "@/lib/analytics/demand";

const DAY_MS = 24 * 60 * 60 * 1000;

async function completedRevenue(businessId: string, gte: Date, lt: Date): Promise<{ revenue: number; count: number }> {
  const r = await prisma.appointment.aggregate({
    where: { businessId, status: "COMPLETED", startTime: { gte, lt } },
    _sum: { price: true },
    _count: { _all: true },
  });
  return { revenue: Math.round((r._sum.price ?? 0) * 100) / 100, count: r._count._all };
}

export const analyticsTools: AiTool[] = [
  {
    name: "revenue_summary",
    kind: "read",
    description:
      "Podsumowanie przychodu: ostatnie 7 dni vs poprzednie 7, ostatnie 30 vs poprzednie 30, oraz przychód miesiąca do dziś z SZACUNKOWĄ prognozą na koniec miesiąca (oznaczona jako szacunek). Liczone z wizyt ukończonych.",
    parameters: { properties: {} },
    async run(_args, { actor }) {
      const now = new Date();
      const bid = actor.businessId;
      const [w0, w1, m0, m1] = await Promise.all([
        completedRevenue(bid, new Date(now.getTime() - 7 * DAY_MS), now),
        completedRevenue(bid, new Date(now.getTime() - 14 * DAY_MS), new Date(now.getTime() - 7 * DAY_MS)),
        completedRevenue(bid, new Date(now.getTime() - 30 * DAY_MS), now),
        completedRevenue(bid, new Date(now.getTime() - 60 * DAY_MS), new Date(now.getTime() - 30 * DAY_MS)),
      ]);

      const ymd = warsawDateString(now);
      const [y, m] = ymd.split("-").map(Number);
      const monthStart = warsawDayStartUtc(`${ymd.slice(0, 7)}-01`);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const dayOfMonth = Number(ymd.slice(8, 10));
      const mtd = await completedRevenue(bid, monthStart, now);
      const projected = dayOfMonth > 0 ? Math.round((mtd.revenue / dayOfMonth) * daysInMonth) : mtd.revenue;

      const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
      return {
        currency: "PLN",
        last7: { revenue: w0.revenue, completed: w0.count, changePctVsPrev: pct(w0.revenue, w1.revenue) },
        last30: { revenue: m0.revenue, completed: m0.count, changePctVsPrev: pct(m0.revenue, m1.revenue) },
        monthToDate: {
          revenue: mtd.revenue,
          completed: mtd.count,
          dayOfMonth,
          daysInMonth,
          projectedMonthEnd: projected,
          projectionNote: "Szacunek liniowy na podstawie tempa z bieżącego miesiąca — nie jest gwarancją.",
        },
      };
    },
  },

  {
    name: "demand_analysis",
    kind: "read",
    description:
      "Analiza popytu / godzin szczytu z danych historycznych (domyślnie 90 dni): najbardziej i najmniej obłożone dni i godziny z szacunkowym obłożeniem %, szczyty anulowań i no-show, popyt na usługi i specjalistów. Zwraca PODSUMOWANE metryki (nie surowe wizyty). Gdy za mało danych — jasno o tym informuje.",
    parameters: {
      properties: { windowDays: { type: "integer", description: "Okno w dniach (domyślnie 90)" } },
    },
    async run(args, { actor }) {
      const days = Math.max(14, Math.min(365, int(args, "windowDays") ?? 90));
      const m = await computeDemand(actor.businessId, days);
      return {
        enough: m.enough,
        note: m.enough ? undefined : "Za mało danych do wiarygodnej analizy.",
        summary: demandSummaryForModel(m),
        busiest: m.busiest,
        quietest: m.quietest,
        busiestByWeekdayCounts: m.byWeekday,
        cancellationPeak: m.cancellationPeak,
        noShowPeak: m.noShowPeak,
        topServices: m.topServices,
        topEmployees: m.topEmployees,
      };
    },
  },
];
