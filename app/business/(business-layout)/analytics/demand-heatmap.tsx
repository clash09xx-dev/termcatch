"use client";

import type { DemandMetrics } from "@/lib/analytics/demand";
import { GlassCard, CardHeader } from "@/components/ui/glass";
import { CHIP } from "@/components/ui/glass/tokens";

// Defined locally (not imported) so this client component never pulls the
// server-only demand module into the browser bundle.
const WEEKDAY_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export function DemandHeatmap({ metrics }: { metrics: DemandMetrics }) {
  const { enough, openFromHour, openToHour, heatmap, utilization, busiest, quietest, cancellationPeak, noShowPeak } = metrics;
  const hours: number[] = [];
  for (let h = openFromHour; h < openToHour; h++) hours.push(h);

  if (!enough) {
    return (
      <GlassCard className="overflow-hidden">
        <CardHeader title="Godziny szczytu i popyt" />
        <div className="px-5 py-6">
          <p className="text-sm font-semibold text-slate-800">Za mało danych do wiarygodnej analizy.</p>
          <p className="mt-1 text-xs text-slate-500">Potrzebujemy co najmniej {20} ukończonych wizyt (obecnie {metrics.totalCompleted}). Analiza pojawi się automatycznie, gdy przybędzie danych.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      <CardHeader title="Godziny szczytu i popyt" action={<span className="text-xs text-slate-400">ostatnie {metrics.windowDays} dni</span>} />
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
            {WEEKDAY_SHORT.map((label, wd) => (
              <div key={wd} className="mt-1 flex items-center gap-1">
                <span className="w-9 flex-shrink-0 text-[11px] font-medium text-slate-500">{label}</span>
                {hours.map((h) => {
                  const u = utilization[wd][h];
                  const count = heatmap[wd][h];
                  return (
                    <span
                      key={h}
                      title={`${label} ${hh(h)} · ${Math.round(u * 100)}% · ${count} wizyt`}
                      className="h-6 w-6 flex-shrink-0 rounded"
                      style={{ background: u <= 0 ? "rgba(203,213,225,0.18)" : `rgba(15,23,42,${0.12 + u * 0.82})` }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-slate-400">Intensywność = szacunkowe obłożenie (rezerwacje ÷ liczba stanowisk × tygodnie). Najedź na komórkę po szczegóły.</p>

        <div className="grid gap-3 sm:grid-cols-2">
          {busiest && (
            <div className="rounded-2xl p-3.5" style={CHIP}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Największy ruch</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{busiest.weekdayLabel} {hh(busiest.fromHour)}–{hh(busiest.toHour)}</p>
              <p className="text-xs text-slate-500">Średnie obłożenie ~{busiest.utilizationPct}%</p>
            </div>
          )}
          {quietest && (
            <div className="rounded-2xl p-3.5" style={CHIP}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Najmniejszy ruch</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{quietest.weekdayLabel} {hh(quietest.fromHour)}–{hh(quietest.toHour)}</p>
              <p className="text-xs text-slate-500">Średnie obłożenie ~{quietest.utilizationPct}% — dobry moment na promocję</p>
            </div>
          )}
        </div>

        {(cancellationPeak || noShowPeak) && (
          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
            {cancellationPeak && <span className="rounded-full px-2.5 py-1" style={CHIP}>Najwięcej anulowań: {cancellationPeak.weekdayLabel} ~{hh(cancellationPeak.hour)}</span>}
            {noShowPeak && <span className="rounded-full px-2.5 py-1" style={CHIP}>Najwięcej no-show: {noShowPeak.weekdayLabel} ~{hh(noShowPeak.hour)}</span>}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
