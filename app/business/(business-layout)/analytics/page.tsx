export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency, cn } from "@/lib/utils";
import {
  PageHeader, GlassCard, CardHeader, StatCard, EmptyState, InkLink, ChromeAvatar,
  Overline, HAIRLINE, CHIP, INK_GRADIENT,
} from "@/components/ui/glass";
import { Segmented } from "@/components/ui/segmented";
import { RevenueArea, WeekdayBars } from "./charts";

type Period = "week" | "month" | "year";
const PERIOD_LABEL: Record<Period, string> = { week: "Tydzień", month: "Miesiąc", year: "Rok" };
const D_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"];
const M_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

async function getData(supabaseId: string, startDate: Date) {
  return prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          appointments: {
            where: { startTime: { gte: startDate } },
            include: { service: { select: { id: true, name: true } }, customer: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { startTime: "asc" },
          },
        },
      },
    },
  });
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const period: Period = params.period === "week" || params.period === "year" ? params.period : "month";

  const now = new Date();
  let startDate: Date;
  if (period === "week") { startDate = new Date(now); startDate.setDate(now.getDate() - 6); startDate.setHours(0, 0, 0, 0); }
  else if (period === "year") startDate = new Date(now.getFullYear(), 0, 1);
  else startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const dbUser = await getData(user.id, startDate);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const appts = business.appointments;
  const completed = appts.filter((a) => a.status === "COMPLETED");
  const noShows = appts.filter((a) => a.status === "NO_SHOW");
  const total = appts.length;
  const totalRevenue = completed.reduce((s, a) => s + a.price, 0);
  const avgValue = completed.length > 0 ? totalRevenue / completed.length : 0;
  const noShowRate = total > 0 ? (noShows.length / total) * 100 : 0;

  // Revenue time-series appropriate to the period
  let series: { label: string; value: number }[] = [];
  if (period === "week") {
    series = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate); d.setDate(startDate.getDate() + i);
      const v = completed.filter((a) => { const t = new Date(a.startTime); return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate(); }).reduce((s, a) => s + a.price, 0);
      return { label: D_SHORT[(d.getDay() + 6) % 7], value: v };
    });
  } else if (period === "month") {
    const days = now.getDate();
    series = Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const v = completed.filter((a) => new Date(a.startTime).getDate() === day && new Date(a.startTime).getMonth() === now.getMonth()).reduce((s, a) => s + a.price, 0);
      return { label: String(day), value: v };
    });
  } else {
    series = Array.from({ length: now.getMonth() + 1 }, (_, m) => {
      const v = completed.filter((a) => new Date(a.startTime).getMonth() === m).reduce((s, a) => s + a.price, 0);
      return { label: M_SHORT[m], value: v };
    });
  }

  // Weekday rhythm
  const dayCount = Array(7).fill(0) as number[];
  for (const a of appts) { const idx = (new Date(a.startTime).getDay() + 6) % 7; dayCount[idx]++; }
  const weekdaySeries = dayCount.map((v, i) => ({ label: D_SHORT[i], value: v }));
  const busiestIdx = dayCount.indexOf(Math.max(...dayCount));
  const busiestDay = dayCount[busiestIdx] > 0 ? ["poniedziałki", "wtorki", "środy", "czwartki", "piątki", "soboty", "niedziele"][busiestIdx] : null;

  // Top services
  const svcMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const a of completed) { const e = svcMap.get(a.service.id); if (e) { e.count++; e.revenue += a.price; } else svcMap.set(a.service.id, { name: a.service.name, count: 1, revenue: a.price }); }
  const topServices = [...svcMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxSvc = Math.max(...topServices.map((s) => s.revenue), 1);

  // Top clients
  const cliMap = new Map<string, { name: string; count: number; spent: number }>();
  for (const a of completed) { const e = cliMap.get(a.customer.id); if (e) { e.count++; e.spent += a.price; } else cliMap.set(a.customer.id, { name: `${a.customer.firstName} ${a.customer.lastName}`, count: 1, spent: a.price }); }
  const topClients = [...cliMap.values()].sort((a, b) => b.spent - a.spent).slice(0, 5);

  const periodOpts = (["week", "month", "year"] as Period[]).map((p) => ({ value: p, label: PERIOD_LABEL[p], href: `/business/analytics?period=${p}` }));

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Analityka"
        subtitle="Zdrowie Twojego biznesu w jednym miejscu"
        actions={<Segmented ariaLabel="Okres" idBase="an-period" size="sm" value={period} options={periodOpts} />}
      />

      {total === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
          <div className="px-6 pt-8 pb-2 opacity-40 pointer-events-none select-none" aria-hidden="true">
            <div className="flex items-end gap-3 h-24 max-w-lg mx-auto">
              {[3, 5, 4, 7, 8, 6, 4].map((v, i) => (
                <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${(v / 8) * 84}px`, background: "linear-gradient(180deg,rgba(148,163,184,0.4),rgba(203,213,225,0.25))" }} />
              ))}
            </div>
          </div>
          <EmptyState
            className="pt-2 pb-10"
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M4 20V4M4 20h16M8 16v-3M12.5 16V9M17 16v-5" /></svg>}
            title="Dane pojawią się po pierwszych wizytach"
            body="Udostępnij link do rezerwacji albo zapisz klienta ręcznie — analityka zbuduje się sama."
            action={<InkLink href="/business/calendar?action=new" size="sm">Zapisz pierwszą wizytę</InkLink>}
          />
        </GlassCard>
      ) : (
        <>
          {/* Summary sentence — honest, rule-based */}
          <p className="fade-rise fade-rise-d1 text-[15px] text-slate-600 leading-relaxed">
            W wybranym okresie <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(totalRevenue)}</span> przychodu z <span className="font-semibold text-slate-900 tabular-nums">{completed.length}</span> ukończonych wizyt{busiestDay && <>, najwięcej w <span className="font-semibold text-slate-900">{busiestDay}</span></>}.
          </p>

          {/* Focal: revenue chart */}
          <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
            <CardHeader title="Przychód w czasie" action={<span className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(totalRevenue)}</span>} />
            <div className="p-5 pt-4"><RevenueArea data={series} /></div>
          </GlassCard>

          {/* Stat ticker */}
          <div className="fade-rise fade-rise-d2 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Ukończone" value={completed.length} sub={`z ${total} wizyt`} />
            <StatCard label="Średnia wartość" value={formatCurrency(avgValue)} sub="za wizytę" />
            <StatCard label="No-show" value={`${noShowRate.toFixed(0)}%`} sub={`${noShows.length} wizyt`} />
            <StatCard label="Klienci" value={cliMap.size} sub="w okresie" />
          </div>

          <div className="fade-rise fade-rise-d3 grid lg:grid-cols-2 gap-5 items-start">
            {/* Weekday rhythm */}
            <GlassCard className="overflow-hidden">
              <CardHeader title="Rytm tygodnia" />
              <div className="p-5"><WeekdayBars data={weekdaySeries} /></div>
            </GlassCard>

            {/* Revenue structure */}
            <GlassCard className="overflow-hidden">
              <CardHeader title="Z czego przychód" />
              {topServices.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Brak ukończonych wizyt.</p> : (
                <div className="px-5 py-3">
                  {topServices.map((s, i) => (
                    <div key={s.name} className="py-2.5" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                        <p className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">{formatCurrency(s.revenue)}</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(203,213,225,0.3)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(s.revenue / maxSvc) * 100}%`, background: INK_GRADIENT }} />
                        </div>
                        <span className="text-[11px] text-slate-500 tabular-nums flex-shrink-0">{s.count}×</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Top clients */}
            <GlassCard className="overflow-hidden lg:col-span-2">
              <CardHeader title="Najlepsi klienci" action={<InkLink href="/business/crm" size="sm">Wszyscy klienci</InkLink>} />
              {topClients.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">Brak danych.</p> : (
                <div>
                  {topClients.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-3 px-5 py-3" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                      <span className="text-xs font-bold text-slate-400 w-4 tabular-nums">{i + 1}</span>
                      <ChromeAvatar size="sm" initials={c.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                        <p className="text-xs text-slate-500 tabular-nums">{c.count} wizyt</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">{formatCurrency(c.spent)}</p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
