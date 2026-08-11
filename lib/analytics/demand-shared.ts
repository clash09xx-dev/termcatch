/**
 * Pure, client-safe demand types + thresholds + summariser.
 * No prisma, no server-only — so the heatmap UI and tests can import it.
 * The DB-backed computeDemand() lives in ./demand (server-only).
 */

export const MIN_TOTAL = 20; // overall completed threshold for reliable conclusions
export const MIN_BUCKET = 5; // per weekday/hour bucket threshold

export const WEEKDAY_PL = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
export const WEEKDAY_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

export type PeakBlock = {
  weekday: number;
  weekdayLabel: string;
  fromHour: number;
  toHour: number;
  bookings: number;
  utilizationPct: number;
};

export type DemandMetrics = {
  windowDays: number;
  enough: boolean;
  totalCompleted: number;
  totalDemand: number;
  capacity: number;
  byWeekday: number[]; // 7 (Mon..Sun)
  byHour: number[]; // 24
  revenueByWeekday: number[]; // 7
  heatmap: number[][]; // [7][24] demand counts
  utilization: number[][]; // [7][24] fraction 0..1
  openFromHour: number;
  openToHour: number;
  busiest: PeakBlock | null;
  quietest: PeakBlock | null;
  cancellationPeak: { weekday: number; weekdayLabel: string; hour: number; count: number } | null;
  noShowPeak: { weekday: number; weekdayLabel: string; hour: number; count: number } | null;
  topServices: { name: string; bookings: number }[];
  topEmployees: { name: string; bookings: number; peakHour: number | null }[];
};

export function argmax(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
}
export function argmin(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[idx]) idx = i;
  return idx;
}

/** Compact text summary for the AI (never raw appointments). Enforces min-data. */
export function demandSummaryForModel(m: DemandMetrics): string {
  if (!m.enough) {
    return `DEMAND: Za mało danych do wiarygodnej analizy (ukończonych wizyt: ${m.totalCompleted}, wymagane min. ${MIN_TOTAL}).`;
  }
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const lines = [`DEMAND (ostatnie ${m.windowDays} dni, ${m.totalCompleted} ukończonych, ${m.capacity} stanowisk):`];
  if (m.busiest) lines.push(`- Największy ruch: ${m.busiest.weekdayLabel} ${hh(m.busiest.fromHour)}–${hh(m.busiest.toHour)}, obłożenie ~${m.busiest.utilizationPct}%`);
  if (m.quietest) lines.push(`- Najmniejszy ruch: ${m.quietest.weekdayLabel} ${hh(m.quietest.fromHour)}–${hh(m.quietest.toHour)}, obłożenie ~${m.quietest.utilizationPct}%`);
  lines.push(`- Najbardziej obłożony dzień: ${WEEKDAY_PL[argmax(m.byWeekday)]}; najsłabszy: ${WEEKDAY_PL[argmin(m.byWeekday)]}`);
  if (m.cancellationPeak) lines.push(`- Najwięcej anulowań: ${m.cancellationPeak.weekdayLabel} ~${hh(m.cancellationPeak.hour)}`);
  if (m.noShowPeak) lines.push(`- Najwięcej no-show: ${m.noShowPeak.weekdayLabel} ~${hh(m.noShowPeak.hour)}`);
  if (m.topEmployees[0]?.peakHour != null) lines.push(`- Największy popyt na osobę: ${m.topEmployees[0].name} ~${hh(m.topEmployees[0].peakHour)}`);
  return lines.join("\n");
}
