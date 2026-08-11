import "server-only";

import { prisma } from "@/lib/prisma";
import { getBusinessDaySlots, warsawYmdPlusDays } from "@/lib/availability";
import { warsawDateString } from "@/lib/timezone";
import { buildBusinessSnapshot } from "./context";
import { computeDemand } from "@/lib/analytics/demand";
import type { Insight } from "./insights-types";

export type { Insight } from "./insights-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const INSIGHT_TTL_MS = 30 * 60 * 1000; // 30 min cache
const AI_ASSISTANT = "/business/ai";
const promptLink = (q: string) => `${AI_ASSISTANT}?prompt=${encodeURIComponent(q)}`;

/**
 * Deterministic, data-backed insights (NO OpenAI call — safe to compute on
 * demand). Forecasts are labelled as estimates. Results are cached in the
 * ai_insights table (type "digest") with a freshness window.
 */
export async function computeInsights(businessId: string): Promise<Insight[]> {
  const snap = await buildBusinessSnapshot(businessId);
  const insights: Insight[] = [];
  const now = new Date();

  // 1) Empty slots tomorrow (opportunity)
  const services = await prisma.service.findMany({
    where: { businessId, isActive: true },
    select: { duration: true },
  });
  if (services.length > 0) {
    const dur = Math.min(...services.map((s) => s.duration));
    const tomorrow = warsawYmdPlusDays(warsawDateString(now), 1);
    const { open, slots } = await getBusinessDaySlots({ businessId, serviceDurationMin: dur, dateYmd: tomorrow });
    if (open && slots.length >= 3) {
      insights.push({
        id: "free-slots-tomorrow",
        category: "calendar",
        severity: "opportunity",
        title: "Wolne terminy jutro",
        metric: `${slots.length}`,
        body: `Masz jutro ${slots.length} wolnych terminów. Rozważ kampanię last-minute lub przypomnienie klientom.`,
        cta: { label: "Zapytaj asystenta", href: promptLink("Zaproponuj, jak wypełnić jutrzejsze wolne terminy.") },
      });
    }
  }

  // 2) Inactive clients >60d (opportunity)
  if (snap.stats.inactive60 >= 5) {
    insights.push({
      id: "inactive-clients",
      category: "clients",
      severity: "opportunity",
      title: "Klienci do odzyskania",
      metric: `${snap.stats.inactive60}`,
      body: `${snap.stats.inactive60} klientów nie wróciło od ponad 60 dni. Kampania reaktywacyjna może ich przywrócić.`,
      cta: { label: "Przygotuj kampanię", href: promptLink("Przygotuj kampanię reaktywacyjną do klientów nieaktywnych od 60 dni.") },
    });
  }

  // 3) Revenue vs previous 30 days
  if (snap.stats.revenueChangePct != null) {
    const pct = snap.stats.revenueChangePct;
    if (pct <= -10) {
      insights.push({
        id: "revenue-down",
        category: "revenue",
        severity: "warning",
        title: "Przychód spada",
        metric: `${pct}%`,
        body: `Przychód z ostatnich 30 dni jest o ${Math.abs(pct)}% niższy niż w poprzednich 30. Sprawdź obłożenie i rozważ działania marketingowe.`,
        cta: { label: "Jak zwiększyć przychód?", href: promptLink("Jak zwiększyć przychód w przyszłym tygodniu?") },
      });
    } else if (pct >= 10) {
      insights.push({
        id: "revenue-up",
        category: "revenue",
        severity: "info",
        title: "Przychód rośnie",
        metric: `+${pct}%`,
        body: `Przychód z ostatnich 30 dni jest o ${pct}% wyższy niż w poprzednich 30. Dobra passa — utrzymaj tempo.`,
      });
    }
  }

  // 4) No-show rate warning
  if (snap.stats.noShowRatePct != null && snap.stats.noShowRatePct >= 15 && snap.stats.noShow30 >= 3) {
    insights.push({
      id: "no-show-rate",
      category: "calendar",
      severity: "warning",
      title: "Wysoki wskaźnik no-show",
      metric: `${snap.stats.noShowRatePct}%`,
      body: `W ostatnich 30 dniach ${snap.stats.noShowRatePct}% wizyt zakończyło się nieobecnością. Rozważ przypomnienia SMS lub zadatki.`,
    });
  }

  // 5) Unanswered negative reviews
  const negUnanswered = await prisma.review.count({
    where: { businessId, status: "PUBLISHED", replyText: null, rating: { lte: 3 } },
  });
  if (negUnanswered > 0) {
    insights.push({
      id: "negative-reviews",
      category: "reviews",
      severity: "warning",
      title: "Negatywne opinie bez odpowiedzi",
      metric: `${negUnanswered}`,
      body: `${negUnanswered} negatywn${negUnanswered === 1 ? "a opinia nie ma" : "e opinie nie mają"} odpowiedzi. Szybka, empatyczna reakcja robi różnicę.`,
      cta: { label: "Odpowiedz z pomocą AI", href: "/business/reviews" },
    });
  }

  // 6) Employee imbalance
  const employees = await prisma.employee.findMany({
    where: { businessId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
  });
  if (employees.length >= 2) {
    const since = new Date(now.getTime() - 30 * DAY_MS);
    const counts = await Promise.all(
      employees.map((e) =>
        prisma.appointment.count({
          where: { businessId, employeeId: e.id, startTime: { gte: since }, status: { notIn: ["CANCELLED_CUSTOMER", "CANCELLED_BUSINESS"] } },
        })
      )
    );
    const withCounts = employees.map((e, i) => ({ e, c: counts[i] }));
    const avg = counts.reduce((s, c) => s + c, 0) / counts.length;
    const lowest = withCounts.reduce((a, b) => (b.c < a.c ? b : a));
    if (avg >= 3 && lowest.c < avg * 0.62) {
      const pct = Math.round((1 - lowest.c / avg) * 100);
      insights.push({
        id: "employee-imbalance",
        category: "employees",
        severity: "info",
        title: "Nierówne obłożenie zespołu",
        body: `${lowest.e.firstName} ${lowest.e.lastName} ma o ${pct}% mniej rezerwacji niż średnia zespołu (ostatnie 30 dni). Może warto wypromować jej/jego terminy.`,
      });
    }
  }

  // 7) Top revenue service (last 30 days)
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const grouped = await prisma.appointment.groupBy({
    by: ["serviceId"],
    where: { businessId, status: "COMPLETED", startTime: { gte: since30 } },
    _sum: { price: true },
  });
  if (grouped.length > 0) {
    const top = grouped.reduce((a, b) => ((b._sum.price ?? 0) > (a._sum.price ?? 0) ? b : a));
    const svc = await prisma.service.findUnique({ where: { id: top.serviceId }, select: { name: true } });
    if (svc && (top._sum.price ?? 0) > 0) {
      insights.push({
        id: "top-service",
        category: "services",
        severity: "info",
        title: "Najbardziej dochodowa usługa",
        metric: `${Math.round(top._sum.price ?? 0)} ${snap.currency}`,
        body: `„${svc.name}” wygenerowała najwięcej przychodu w ostatnich 30 dniach. Rozważ pakiet lub promocję wokół niej.`,
      });
    }
  }

  // 8) Demand — weakest open block (opportunity), only with enough real data.
  try {
    const demand = await computeDemand(businessId, 90);
    if (demand.enough && demand.quietest && demand.quietest.utilizationPct < 45) {
      const q = demand.quietest;
      const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
      insights.push({
        id: "quiet-block",
        category: "calendar",
        severity: "opportunity",
        title: "Słaby przedział w kalendarzu",
        metric: `${q.utilizationPct}%`,
        body: `${q.weekdayLabel} ${hh(q.fromHour)}–${hh(q.toHour)} ma średnio ${q.utilizationPct}% obłożenia (ostatnie 90 dni). Dobry moment na promocję lub kampanię.`,
        cta: { label: "Przygotuj kampanię", href: promptLink(`Przygotuj kampanię na słaby przedział: ${q.weekdayLabel} ${hh(q.fromHour)}–${hh(q.toHour)}.`) },
      });
    }
  } catch {
    /* demand insight is best-effort */
  }

  // Order: warnings first, then opportunities, then info.
  const rank: Record<string, number> = { warning: 0, opportunity: 1, info: 2 };
  insights.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return insights;
}

/** Cached insights read. Recomputes when the cached digest is stale. */
export async function getInsights(businessId: string, opts?: { force?: boolean }): Promise<Insight[]> {
  if (!opts?.force) {
    try {
      const cached = await prisma.aiInsight.findFirst({
        where: { businessId, type: "digest", validUntil: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      });
      if (cached && Array.isArray(cached.content)) {
        return cached.content as unknown as Insight[];
      }
    } catch {
      /* fall through to compute */
    }
  }

  const insights = await computeInsights(businessId);
  try {
    await prisma.aiInsight.deleteMany({ where: { businessId, type: "digest" } });
    await prisma.aiInsight.create({
      data: {
        businessId,
        type: "digest",
        title: "Podsumowanie operacyjne",
        content: insights as unknown as object,
        validUntil: new Date(Date.now() + INSIGHT_TTL_MS),
      },
    });
  } catch {
    /* caching is best-effort */
  }
  return insights;
}
