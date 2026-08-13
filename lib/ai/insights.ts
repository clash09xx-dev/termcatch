import "server-only";

import { prisma } from "@/lib/prisma";
import { getBusinessDaySlots, warsawYmdPlusDays } from "@/lib/availability";
import { warsawDateString } from "@/lib/timezone";
import { buildBusinessSnapshot } from "./context";
import { getDemand } from "@/lib/analytics/demand";
import type { Insight, StructuredInsight, InsightType, InsightCtaKey } from "./insights-types";
import { interpolate, type Dictionary } from "@/lib/i18n/dictionaries";

export type { Insight } from "./insights-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const INSIGHT_TTL_MS = 30 * 60 * 1000; // 30 min cache
const AI_ASSISTANT = "/business/ai";
const promptLink = (q: string) => `${AI_ASSISTANT}?prompt=${encodeURIComponent(q)}`;

/**
 * Deterministic, data-backed insights (NO OpenAI call). Produces LANGUAGE-NEUTRAL
 * structured insights (type + vars) — never rendered Polish — so the cache is
 * locale-agnostic and each reader renders in its own language via the dictionary.
 * Forecasts are labelled as estimates.
 */
export async function computeInsights(businessId: string): Promise<StructuredInsight[]> {
  const snap = await buildBusinessSnapshot(businessId);
  const insights: StructuredInsight[] = [];
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
        id: "free-slots-tomorrow", type: "free-slots-tomorrow", category: "calendar", severity: "opportunity",
        metric: `${slots.length}`, vars: { count: slots.length },
        ctaKey: "askAssistant", ctaHref: promptLink("Zaproponuj, jak wypełnić jutrzejsze wolne terminy."),
      });
    }
  }

  // 2) Inactive clients >60d (opportunity)
  if (snap.stats.inactive60 >= 5) {
    insights.push({
      id: "inactive-clients", type: "inactive-clients", category: "clients", severity: "opportunity",
      metric: `${snap.stats.inactive60}`, vars: { count: snap.stats.inactive60 },
      ctaKey: "prepareCampaign", ctaHref: promptLink("Przygotuj kampanię reaktywacyjną do klientów nieaktywnych od 60 dni."),
    });
  }

  // 3) Revenue vs previous 30 days
  if (snap.stats.revenueChangePct != null) {
    const pct = snap.stats.revenueChangePct;
    if (pct <= -10) {
      insights.push({
        id: "revenue-down", type: "revenue-down", category: "revenue", severity: "warning",
        metric: `${pct}%`, vars: { abs: Math.abs(pct) },
        ctaKey: "howRevenue", ctaHref: promptLink("Jak zwiększyć przychód w przyszłym tygodniu?"),
      });
    } else if (pct >= 10) {
      insights.push({
        id: "revenue-up", type: "revenue-up", category: "revenue", severity: "info",
        metric: `+${pct}%`, vars: { pct }, ctaHref: "",
      });
    }
  }

  // 4) No-show rate warning
  if (snap.stats.noShowRatePct != null && snap.stats.noShowRatePct >= 15 && snap.stats.noShow30 >= 3) {
    insights.push({
      id: "no-show-rate", type: "no-show-rate", category: "calendar", severity: "warning",
      metric: `${snap.stats.noShowRatePct}%`, vars: { pct: snap.stats.noShowRatePct }, ctaHref: "",
    });
  }

  // 5) Unanswered negative reviews
  const negUnanswered = await prisma.review.count({
    where: { businessId, status: "PUBLISHED", replyText: null, rating: { lte: 3 } },
  });
  if (negUnanswered > 0) {
    insights.push({
      id: "negative-reviews", type: "negative-reviews", category: "reviews", severity: "warning",
      metric: `${negUnanswered}`, vars: { count: negUnanswered },
      ctaKey: "replyAi", ctaHref: "/business/reviews",
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
        id: "employee-imbalance", type: "employee-imbalance", category: "employees", severity: "info",
        vars: { name: `${lowest.e.firstName} ${lowest.e.lastName}`.trim(), pct }, ctaHref: "",
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
        id: "top-service", type: "top-service", category: "services", severity: "info",
        metric: `${Math.round(top._sum.price ?? 0)} ${snap.currency}`, vars: { service: svc.name }, ctaHref: "",
      });
    }
  }

  // 8) Demand — weakest open block (opportunity), only with enough real data.
  try {
    const demand = await getDemand(businessId, 90);
    if (demand.enough && demand.quietest && demand.quietest.utilizationPct < 45) {
      const q = demand.quietest;
      const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
      const block = `${q.weekdayLabel} ${hh(q.fromHour)}–${hh(q.toHour)}`;
      insights.push({
        id: "quiet-block", type: "quiet-block", category: "calendar", severity: "opportunity",
        metric: `${q.utilizationPct}%`, vars: { block, pct: q.utilizationPct },
        ctaKey: "prepareCampaign", ctaHref: promptLink(`Przygotuj kampanię na słaby przedział: ${block}.`),
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

/** Render language-neutral insights into localized cards for the UI. */
export function renderInsights(items: StructuredInsight[], dict: Dictionary): Insight[] {
  const t = dict.insights;
  const TITLE: Record<InsightType, string> = {
    "free-slots-tomorrow": t.freeSlotsTitle, "inactive-clients": t.inactiveTitle,
    "revenue-down": t.revenueDownTitle, "revenue-up": t.revenueUpTitle,
    "no-show-rate": t.noShowTitle, "negative-reviews": t.negReviewsTitle,
    "employee-imbalance": t.imbalanceTitle, "top-service": t.topServiceTitle, "quiet-block": t.quietBlockTitle,
  };
  const BODY: Record<InsightType, string> = {
    "free-slots-tomorrow": t.freeSlotsBody, "inactive-clients": t.inactiveBody,
    "revenue-down": t.revenueDownBody, "revenue-up": t.revenueUpBody,
    "no-show-rate": t.noShowBody, "negative-reviews": t.negReviewsBody,
    "employee-imbalance": t.imbalanceBody, "top-service": t.topServiceBody, "quiet-block": t.quietBlockBody,
  };
  const CTA: Record<InsightCtaKey, string> = {
    askAssistant: t.ctaAskAssistant, prepareCampaign: t.ctaPrepareCampaign,
    howRevenue: t.ctaHowRevenue, replyAi: t.ctaReplyAi,
  };
  return items.map((s) => ({
    id: s.id,
    category: s.category,
    severity: s.severity,
    metric: s.metric,
    title: TITLE[s.type],
    body: interpolate(BODY[s.type], s.vars),
    cta: s.ctaKey && s.ctaHref ? { label: CTA[s.ctaKey], href: s.ctaHref } : undefined,
  }));
}

/**
 * Cached insights, rendered in `dict`'s language. The cache stores the neutral
 * structured form (type + vars) — never rendered Polish — so any language reads
 * the same cache and renders locally.
 */
export async function getInsights(businessId: string, dict: Dictionary, opts?: { force?: boolean }): Promise<Insight[]> {
  if (!opts?.force) {
    try {
      const cached = await prisma.aiInsight.findFirst({
        where: { businessId, type: "digest_v2", validUntil: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      });
      if (cached && Array.isArray(cached.content)) {
        return renderInsights(cached.content as unknown as StructuredInsight[], dict);
      }
    } catch {
      /* fall through to compute */
    }
  }

  const structured = await computeInsights(businessId);
  try {
    await prisma.aiInsight.deleteMany({ where: { businessId, type: { in: ["digest", "digest_v2"] } } });
    await prisma.aiInsight.create({
      data: {
        businessId,
        type: "digest_v2",
        title: "operational_digest",
        content: structured as unknown as object,
        validUntil: new Date(Date.now() + INSIGHT_TTL_MS),
      },
    });
  } catch {
    /* caching is best-effort */
  }
  return renderInsights(structured, dict);
}
