import "server-only";

import { prisma } from "@/lib/prisma";
import type { DayOfWeek, AppointmentStatus } from "@prisma/client";
import { warsawDateString, warsawDayStartUtc, warsawTimeString } from "@/lib/timezone";
import { planKeyFromEnum, PLAN_ENTITLEMENTS } from "@/lib/entitlements";
import { MAX_CONTEXT_CHARS } from "./config";

/**
 * Compact business context for the AI. Deliberately a SMALL set of aggregates —
 * never the full database, never another business's data. Everything is scoped
 * by businessId. Built once per assistant turn / insight refresh (cached), not
 * on ordinary page renders.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: "Pon", TUESDAY: "Wt", WEDNESDAY: "Śr", THURSDAY: "Czw", FRIDAY: "Pt", SATURDAY: "Sob", SUNDAY: "Nd",
};
// Appointment statuses that represent a cancellation (never count as demand/revenue).
const CANCELLED: AppointmentStatus[] = ["CANCELLED_CUSTOMER", "CANCELLED_BUSINESS"];

export type BusinessSnapshot = {
  businessId: string;
  name: string;
  category: string;
  city: string | null;
  currency: string;
  planLabel: string;
  aiTier: string;
  hours: { day: string; open: boolean; from?: string; to?: string }[];
  services: { name: string; duration: number; price: number; discounted: number | null }[];
  serviceCount: number;
  employees: { name: string; accepting: boolean }[];
  employeeCount: number;
  today: { date: string; booked: number; nextAt: string | null };
  stats: {
    revenue30: number;
    revenuePrev30: number;
    revenueChangePct: number | null;
    completed30: number;
    avgTicket: number | null;
    noShow30: number;
    noShowRatePct: number | null;
    upcoming: number;
    clients90: number;
    inactive60: number;
  };
  reviews: { avg: number; total: number; unanswered: number };
};

export async function buildBusinessSnapshot(businessId: string): Promise<BusinessSnapshot> {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * DAY_MS);
  const d60 = new Date(now.getTime() - 60 * DAY_MS);
  const d90 = new Date(now.getTime() - 90 * DAY_MS);
  const todayYmd = warsawDateString(now);
  const todayStart = warsawDayStartUtc(todayYmd);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);

  const [
    business,
    services,
    employees,
    todayAppts,
    rev30,
    revPrev30,
    completed30,
    noShow30,
    total30,
    upcomingCount,
    nextAppt,
    clients90Rows,
    recentClientRows,
    everCompletedRows,
    unansweredReviews,
  ] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: {
        name: true, category: true, city: true, currency: true,
        subscriptionPlan: true, averageRating: true, totalReviews: true,
        workingHours: { select: { dayOfWeek: true, isOpen: true, openTime: true, closeTime: true } },
      },
    }),
    prisma.service.findMany({
      where: { businessId, isActive: true },
      select: { name: true, duration: true, price: true, discountedPrice: true },
      orderBy: { displayOrder: "asc" },
      take: 50,
    }),
    prisma.employee.findMany({
      where: { businessId, isActive: true },
      select: { firstName: true, lastName: true, isAccepting: true },
      orderBy: { displayOrder: "asc" },
      take: 50,
    }),
    prisma.appointment.count({
      where: { businessId, startTime: { gte: todayStart, lt: todayEnd }, status: { notIn: CANCELLED } },
    }),
    prisma.appointment.aggregate({
      where: { businessId, status: "COMPLETED", startTime: { gte: d30, lte: now } },
      _sum: { price: true }, _count: { _all: true },
    }),
    prisma.appointment.aggregate({
      where: { businessId, status: "COMPLETED", startTime: { gte: d60, lt: d30 } },
      _sum: { price: true },
    }),
    prisma.appointment.count({ where: { businessId, status: "COMPLETED", startTime: { gte: d30, lte: now } } }),
    prisma.appointment.count({ where: { businessId, status: "NO_SHOW", startTime: { gte: d30, lte: now } } }),
    prisma.appointment.count({ where: { businessId, startTime: { gte: d30, lte: now }, status: { notIn: CANCELLED } } }),
    prisma.appointment.count({ where: { businessId, startTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.appointment.findFirst({
      where: { businessId, startTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: { startTime: "asc" }, select: { startTime: true },
    }),
    prisma.appointment.findMany({
      where: { businessId, startTime: { gte: d90 }, status: { notIn: CANCELLED } },
      select: { customerId: true }, distinct: ["customerId"],
    }),
    prisma.appointment.findMany({
      where: { businessId, startTime: { gte: d60 }, status: { notIn: CANCELLED } },
      select: { customerId: true }, distinct: ["customerId"],
    }),
    prisma.appointment.findMany({
      where: { businessId, status: "COMPLETED" },
      select: { customerId: true }, distinct: ["customerId"],
    }),
    prisma.review.count({ where: { businessId, status: "PUBLISHED", replyText: null } }),
  ]);

  if (!business) throw new Error("Business not found for snapshot");

  const revenue30 = rev30._sum.price ?? 0;
  const revenuePrev30 = revPrev30._sum.price ?? 0;
  const revenueChangePct = revenuePrev30 > 0 ? Math.round(((revenue30 - revenuePrev30) / revenuePrev30) * 100) : null;
  const avgTicket = completed30 > 0 ? Math.round((revenue30 / completed30) * 100) / 100 : null;
  const noShowRatePct = total30 > 0 ? Math.round((noShow30 / total30) * 100) : null;

  const recentSet = new Set(recentClientRows.map((r) => r.customerId));
  const inactive60 = everCompletedRows.filter((r) => !recentSet.has(r.customerId)).length;

  const hoursByDay = new Map(business.workingHours.map((h) => [h.dayOfWeek, h]));
  const hours = DAY_ORDER.map((d) => {
    const h = hoursByDay.get(d);
    return h && h.isOpen
      ? { day: DAY_SHORT[d], open: true, from: h.openTime, to: h.closeTime }
      : { day: DAY_SHORT[d], open: false };
  });

  const planKey = planKeyFromEnum(business.subscriptionPlan);

  return {
    businessId,
    name: business.name,
    category: business.category,
    city: business.city,
    currency: business.currency,
    planLabel: PLAN_ENTITLEMENTS[planKey].label,
    aiTier: PLAN_ENTITLEMENTS[planKey].aiAssistant,
    hours,
    services: services.map((s) => ({ name: s.name, duration: s.duration, price: s.price, discounted: s.discountedPrice })),
    serviceCount: services.length,
    employees: employees.map((e) => ({ name: `${e.firstName} ${e.lastName}`.trim(), accepting: e.isAccepting })),
    employeeCount: employees.length,
    today: {
      date: todayYmd,
      booked: todayAppts,
      nextAt: nextAppt ? warsawTimeString(nextAppt.startTime) : null,
    },
    stats: {
      revenue30: Math.round(revenue30 * 100) / 100,
      revenuePrev30: Math.round(revenuePrev30 * 100) / 100,
      revenueChangePct,
      completed30,
      avgTicket,
      noShow30,
      noShowRatePct,
      upcoming: upcomingCount,
      clients90: clients90Rows.length,
      inactive60,
    },
    reviews: {
      avg: Math.round((business.averageRating ?? 0) * 10) / 10,
      total: business.totalReviews ?? 0,
      unanswered: unansweredReviews,
    },
  };
}

/** Serialize the snapshot into a compact, token-bounded text block for the model. */
export function serializeSnapshot(s: BusinessSnapshot): string {
  const cur = s.currency || "PLN";
  const money = (n: number) => `${n.toFixed(0)} ${cur}`;
  const lines: string[] = [];
  lines.push(`SALON: ${s.name} (${s.category}${s.city ? `, ${s.city}` : ""})`);
  lines.push(`PLAN: ${s.planLabel} | AI tier: ${s.aiTier} | waluta: ${cur}`);
  lines.push(`GODZINY: ${s.hours.map((h) => (h.open ? `${h.day} ${h.from}-${h.to}` : `${h.day} zamk.`)).join(", ")}`);
  lines.push(
    `USŁUGI (${s.serviceCount}): ${s.services
      .slice(0, 30)
      .map((x) => `${x.name} ${x.duration}min ${money(x.discounted ?? x.price)}`)
      .join("; ")}${s.serviceCount > 30 ? " …" : ""}`
  );
  lines.push(
    `ZESPÓŁ (${s.employeeCount}): ${s.employees.slice(0, 30).map((e) => `${e.name}${e.accepting ? "" : " (nie przyjmuje)"}`).join(", ")}`
  );
  lines.push(`DZIŚ (${s.today.date}): ${s.today.booked} wizyt${s.today.nextAt ? `, najbliższa ${s.today.nextAt}` : ""}`);
  lines.push(
    `30 DNI: przychód ${money(s.stats.revenue30)} (poprz. ${money(s.stats.revenuePrev30)}${
      s.stats.revenueChangePct != null ? `, ${s.stats.revenueChangePct >= 0 ? "+" : ""}${s.stats.revenueChangePct}%` : ""
    }); ukończone ${s.stats.completed30}; śr. wizyta ${s.stats.avgTicket != null ? money(s.stats.avgTicket) : "—"}; no-show ${s.stats.noShow30}${
      s.stats.noShowRatePct != null ? ` (${s.stats.noShowRatePct}%)` : ""
    }`
  );
  lines.push(
    `KLIENCI: ${s.stats.clients90} aktywnych (90 dni), ${s.stats.inactive60} nieaktywnych (>60 dni bez wizyty), ${s.stats.upcoming} nadchodzących rezerwacji`
  );
  lines.push(`OPINIE: ${s.reviews.avg}/5 z ${s.reviews.total}, bez odpowiedzi: ${s.reviews.unanswered}`);
  const text = lines.join("\n");
  return text.length > MAX_CONTEXT_CHARS ? text.slice(0, MAX_CONTEXT_CHARS) + "\n…(skrócono)" : text;
}
