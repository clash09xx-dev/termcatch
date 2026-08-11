import "server-only";

import { prisma } from "@/lib/prisma";
import { warsawTimeString } from "@/lib/timezone";
import type { AppointmentStatus } from "@prisma/client";
import {
  MIN_TOTAL, MIN_BUCKET, WEEKDAY_PL, argmax,
  type DemandMetrics, type PeakBlock,
} from "./demand-shared";

/**
 * Deterministic demand / peak-hours analytics computed SERVER-SIDE from real
 * historical appointments. The AI receives only the SUMMARY (never thousands of
 * raw rows). Enforces minimum-data thresholds so we never fabricate a trend.
 */

// Re-export the pure surface so existing importers keep working.
export * from "./demand-shared";

const DAY_MS = 24 * 60 * 60 * 1000;
const NON_DEMAND: AppointmentStatus[] = ["CANCELLED_CUSTOMER", "CANCELLED_BUSINESS", "RESCHEDULED"];

const WD_FMT = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", weekday: "short" });
const WD_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function warsawWeekdayIdx(d: Date): number {
  return WD_ORDER.indexOf(WD_FMT.format(d));
}
function warsawHour(d: Date): number {
  return parseInt(warsawTimeString(d).slice(0, 2), 10) % 24;
}

export async function computeDemand(businessId: string, windowDays = 90): Promise<DemandMetrics> {
  const since = new Date(Date.now() - windowDays * DAY_MS);

  const [appts, employeesActive, workingHours] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId, startTime: { gte: since } },
      select: {
        startTime: true, status: true, price: true,
        service: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
      take: 8000,
    }),
    prisma.employee.count({ where: { businessId, isActive: true, isAccepting: true } }),
    prisma.workingHours.findMany({ where: { businessId, isOpen: true }, select: { openTime: true, closeTime: true } }),
  ]);

  const capacity = Math.max(1, employeesActive);
  const weeks = Math.max(1, windowDays / 7);

  let openFromHour = 24, openToHour = 0;
  for (const wh of workingHours) {
    openFromHour = Math.min(openFromHour, parseInt(wh.openTime.slice(0, 2), 10) || 0);
    openToHour = Math.max(openToHour, parseInt(wh.closeTime.slice(0, 2), 10) || 0);
  }
  if (openFromHour >= openToHour) { openFromHour = 9; openToHour = 19; }

  const byWeekday = Array(7).fill(0);
  const byHour = Array(24).fill(0);
  const revenueByWeekday = Array(7).fill(0);
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const cancHeat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const noShowHeat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const svc = new Map<string, number>();
  const emp = new Map<string, { count: number; hours: number[] }>();
  let totalCompleted = 0, totalDemand = 0;

  for (const a of appts) {
    const wd = warsawWeekdayIdx(a.startTime);
    const h = warsawHour(a.startTime);
    if (wd < 0) continue;
    if (a.status === "NO_SHOW") noShowHeat[wd][h]++;
    if (NON_DEMAND.includes(a.status)) { cancHeat[wd][h]++; continue; }
    totalDemand++;
    byWeekday[wd]++; byHour[h]++; heatmap[wd][h]++;
    if (a.status === "COMPLETED") {
      totalCompleted++;
      revenueByWeekday[wd] += a.price;
      const name = a.service?.name ?? "Inne";
      svc.set(name, (svc.get(name) ?? 0) + 1);
      const eName = a.employee ? `${a.employee.firstName} ${a.employee.lastName}`.trim() : "Bez przypisania";
      const e = emp.get(eName) ?? { count: 0, hours: Array(24).fill(0) };
      e.count++; e.hours[h]++; emp.set(eName, e);
    }
  }

  const utilization = heatmap.map((row) => row.map((c) => Math.min(1, c / (weeks * capacity))));
  const enough = totalCompleted >= MIN_TOTAL;

  const busiest = enough ? bestBlock(heatmap, utilization, openFromHour, openToHour, "max") : null;
  const quietest = enough ? bestBlock(heatmap, utilization, openFromHour, openToHour, "min") : null;
  const cancellationPeak = peakBucket(cancHeat, 3);
  const noShowPeak = peakBucket(noShowHeat, 3);

  const topServices = [...svc.entries()].map(([name, bookings]) => ({ name, bookings })).sort((a, b) => b.bookings - a.bookings).slice(0, 5);
  const topEmployees = [...emp.entries()]
    .map(([name, v]) => ({ name, bookings: v.count, peakHour: v.count >= MIN_BUCKET ? argmax(v.hours) : null }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  return {
    windowDays, enough, totalCompleted, totalDemand, capacity,
    byWeekday, byHour, revenueByWeekday, heatmap, utilization,
    openFromHour, openToHour, busiest, quietest, cancellationPeak, noShowPeak, topServices, topEmployees,
  };
}

function bestBlock(heatmap: number[][], util: number[][], openFrom: number, openTo: number, mode: "max" | "min"): PeakBlock | null {
  let best: PeakBlock | null = null;
  for (let wd = 0; wd < 7; wd++) {
    for (let h = openFrom; h <= openTo - 3; h++) {
      const bookings = heatmap[wd][h] + heatmap[wd][h + 1] + heatmap[wd][h + 2];
      if (mode === "max" && bookings < MIN_BUCKET) continue;
      const u = (util[wd][h] + util[wd][h + 1] + util[wd][h + 2]) / 3;
      const block: PeakBlock = { weekday: wd, weekdayLabel: WEEKDAY_PL[wd], fromHour: h, toHour: h + 3, bookings, utilizationPct: Math.round(u * 100) };
      if (!best) best = block;
      else if (mode === "max" && bookings > best.bookings) best = block;
      else if (mode === "min" && bookings < best.bookings) best = block;
    }
  }
  return best;
}

function peakBucket(heat: number[][], min: number): { weekday: number; weekdayLabel: string; hour: number; count: number } | null {
  let best: { weekday: number; weekdayLabel: string; hour: number; count: number } | null = null;
  for (let wd = 0; wd < 7; wd++) {
    for (let h = 0; h < 24; h++) {
      if (heat[wd][h] >= min && (!best || heat[wd][h] > best.count)) {
        best = { weekday: wd, weekdayLabel: WEEKDAY_PL[wd], hour: h, count: heat[wd][h] };
      }
    }
  }
  return best;
}
