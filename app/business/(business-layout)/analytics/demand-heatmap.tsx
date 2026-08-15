"use client";

import type { DemandMetrics } from "@/lib/analytics/demand";
import { GlassCard, CardHeader } from "@/components/ui/glass";
import { CHIP } from "@/components/ui/glass/tokens";
import { interpolate } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

// Labels are passed in (never imported from the server-only demand module) so
// this client component stays out of the server bundle AND out of Polish.
export function DemandHeatmap({
  metrics,
  t,
  weekdayShort,
}: {
  metrics: DemandMetrics;
  t: Dictionary["pages"]["analytics"];
  /** Monday-first short weekday names, from the dictionary. */
  weekdayShort: string[];
}) {
  const { enough, openFromHour, openToHour, heatmap, utilization, busiest, quietest, cancellationPeak, noShowPeak } = metrics;
  const hours: number[] = [];
  for (let h = openFromHour; h < openToHour; h++) hours.push(h);

  if (!enough) {
    return (
      <GlassCard className="overflow-hidden">
        <CardHeader title={t.demandTitle} />
        <div className="px-5 py-6">
          <p className="text-sm font-semibold text-slate-800">{t.demandThinTitle}</p>
          <p className="mt-1 text-xs text-slate-500">{interpolate(t.demandThinBody, { min: 20, current: metrics.totalCompleted })}</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      <CardHeader title={t.demandTitle} action={<span className="text-xs text-slate-400">{interpolate(t.demandWindow, { n: metrics.windowDays })}</span>} />
      <div className="px-5 py-4 space-y-4">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hour header */}
            <div className="flex items-center gap-1">
              <span className="w-9 flex-shrink-0" />
              {hours.map((h) => (
                <span key={h} className="w-6 flex-shrink-0 text-center text-[9px] tabular-nums text-slate-400">{h}</span>
              ))}
            </div>
            {/* Rows */}
            {weekdayShort.map((label, wd) => (
              <div key={wd} className="mt-1 flex items-center gap-1">
                <span className="w-9 flex-shrink-0 text-[11px] font-medium text-slate-500">{label}</span>
                {hours.map((h) => {
                  const u = utilization[wd][h];
                  const count = heatmap[wd][h];
                  return (
                    <span
                      key={h}
                      title={interpolate(t.demandCell, { day: label, hour: hh(h), pct: Math.round(u * 100), n: count })}
                      className="h-6 w-6 flex-shrink-0 rounded"
                      style={{ background: u <= 0 ? "rgba(203,213,225,0.18)" : `rgba(15,23,42,${0.12 + u * 0.82})` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400">{t.demandLegend}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {busiest && (
            <div className="rounded-2xl p-3.5" style={CHIP}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.demandBusiest}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{weekdayShort[busiest.weekday]} {hh(busiest.fromHour)}–{hh(busiest.toHour)}</p>
              <p className="text-xs text-slate-500">{interpolate(t.demandAvgLoad, { pct: busiest.utilizationPct })}</p>
            </div>
          )}
          {quietest && (
            <div className="rounded-2xl p-3.5" style={CHIP}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t.demandQuietest}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{weekdayShort[quietest.weekday]} {hh(quietest.fromHour)}–{hh(quietest.toHour)}</p>
              <p className="text-xs text-slate-500">{interpolate(t.demandQuietHint, { pct: quietest.utilizationPct })}</p>
            </div>
          )}
        </div>

        {(cancellationPeak || noShowPeak) && (
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            {cancellationPeak && <span className="rounded-full px-2.5 py-1" style={CHIP}>{interpolate(t.demandCancelPeak, { day: weekdayShort[cancellationPeak.weekday], hour: hh(cancellationPeak.hour) })}</span>}
            {noShowPeak && <span className="rounded-full px-2.5 py-1" style={CHIP}>{interpolate(t.demandNoShowPeak, { day: weekdayShort[noShowPeak.weekday], hour: hh(noShowPeak.hour) })}</span>}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
