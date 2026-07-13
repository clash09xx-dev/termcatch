export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";
import {
  PageHeader,
  GlassCard,
  CardHeader,
  StatCard,
  EmptyState,
  InkLink,
  ChromeAvatar,
  HAIRLINE,
  CHIP,
  INK_GRADIENT,
} from "@/components/ui/glass";

type Period = "week" | "month" | "year";

async function getAnalyticsData(supabaseId: string, period: Period) {
  const now = new Date();
  let startDate: Date;

  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startDate = new Date(now);
    startDate.setDate(now.getDate() + diff);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          appointments: {
            where: {
              startTime: { gte: startDate, lte: now },
            },
            include: {
              service: { select: { id: true, name: true } },
              customer: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { startTime: "asc" },
          },
        },
      },
    },
  });

  return { dbUser, startDate };
}

const PERIOD_LABELS: Record<Period, string> = {
  week: "Tydzień",
  month: "Miesiąc",
  year: "Rok",
};

const DAY_LABELS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"];

// Ghost bars for the honest empty state — clearly a sample, not data
const GHOST_BARS = [3, 5, 4, 7, 8, 6, 2];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const period = (params.period as Period) ?? "month";
  const validPeriods: Period[] = ["week", "month", "year"];
  const activePeriod = validPeriods.includes(period) ? period : "month";

  const { dbUser } = await getAnalyticsData(user.id, activePeriod);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const appointments = business.appointments;
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const noShows = appointments.filter((a) => a.status === "NO_SHOW");
  const total = appointments.length;

  const totalRevenue = completed.reduce((acc, a) => acc + a.price, 0);
  const avgValue = completed.length > 0 ? totalRevenue / completed.length : 0;
  const completionRate = total > 0 ? (completed.length / total) * 100 : 0;
  const noShowRate = total > 0 ? (noShows.length / total) * 100 : 0;

  // Top services
  const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const apt of completed) {
    const existing = serviceMap.get(apt.service.id);
    if (existing) {
      existing.count++;
      existing.revenue += apt.price;
    } else {
      serviceMap.set(apt.service.id, {
        name: apt.service.name,
        count: 1,
        revenue: apt.price,
      });
    }
  }
  const topServices = Array.from(serviceMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxServiceRevenue = Math.max(...topServices.map((s) => s.revenue), 1);

  // Top clients
  const clientMap = new Map<string, { name: string; count: number; spent: number }>();
  for (const apt of completed) {
    const existing = clientMap.get(apt.customer.id);
    if (existing) {
      existing.count++;
      existing.spent += apt.price;
    } else {
      clientMap.set(apt.customer.id, {
        name: `${apt.customer.firstName} ${apt.customer.lastName}`,
        count: 1,
        spent: apt.price,
      });
    }
  }
  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  // Busiest days (0=Mon … 6=Sun)
  const dayCount = Array(7).fill(0) as number[];
  for (const apt of appointments) {
    const d = new Date(apt.startTime).getDay();
    const idx = d === 0 ? 6 : d - 1;
    dayCount[idx]++;
  }
  const maxDayCount = Math.max(...dayCount, 1);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Analityka"
        subtitle="Przegląd wyników Twojego salonu"
        actions={
          <div
            className="inline-flex items-center gap-0.5 p-0.5 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(203,213,225,0.45)",
              boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
            role="group"
            aria-label="Okres"
          >
            {validPeriods.map((p) => {
              const active = activePeriod === p;
              return (
                <Link
                  key={p}
                  href={`/business/analytics?period=${p}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors",
                    active ? "text-white" : "text-slate-500 hover:text-slate-800"
                  )}
                  style={active ? { background: INK_GRADIENT, boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" } : undefined}
                >
                  {PERIOD_LABELS[p]}
                </Link>
              );
            })}
          </div>
        }
      />

      {/* Stats */}
      <div className="fade-rise fade-rise-d1 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Przychód" value={formatCurrency(totalRevenue)} sub={`${completed.length} ukończonych`} />
        <StatCard label="Wszystkich wizyt" value={total} sub="w wybranym okresie" />
        <StatCard label="Średnia wartość" value={formatCurrency(avgValue)} sub="za wizytę" />
        <StatCard label="Ukończone" value={`${completionRate.toFixed(0)}%`} sub={`${completed.length} z ${total} wizyt`} />
        <StatCard label="No-show" value={`${noShowRate.toFixed(0)}%`} sub={`${noShows.length} wizyt`} />
      </div>

      {total === 0 ? (
        <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
          {/* Ghost sample chart — data appears after first visits */}
          <div className="px-6 pt-8 pb-2 opacity-40 pointer-events-none select-none" aria-hidden="true">
            <div className="flex items-end gap-3 h-28 max-w-lg mx-auto">
              {GHOST_BARS.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-lg"
                    style={{
                      height: `${(v / 8) * 88}px`,
                      background: "linear-gradient(180deg, rgba(148,163,184,0.45) 0%, rgba(203,213,225,0.30) 100%)",
                      border: "1px solid rgba(203,213,225,0.40)",
                      borderBottom: "none",
                    }}
                  />
                  <span className="text-[10px] text-slate-400">{DAY_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <EmptyState
            className="pt-2 pb-10"
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
              </svg>
            }
            title="Dane pojawią się po pierwszych wizytach"
            body="Udostępnij link do rezerwacji albo zapisz klienta ręcznie — statystyki zbudują się same."
            action={<InkLink href="/business/calendar?action=new" size="sm">Zapisz pierwszą wizytę</InkLink>}
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d2 grid lg:grid-cols-2 gap-5">
          {/* Top services */}
          <GlassCard className="overflow-hidden">
            <CardHeader title="Najpopularniejsze usługi" />
            {topServices.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-500">Brak ukończonych wizyt w tym okresie</p>
              </div>
            ) : (
              <div className="px-5 py-3">
                {topServices.map((svc, i) => (
                  <div key={svc.name} className="py-2.5" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0"
                        style={CHIP}
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-900 truncate flex-1">{svc.name}</p>
                      <p className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">
                        {formatCurrency(svc.revenue)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pl-8">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(203,213,225,0.30)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(svc.revenue / maxServiceRevenue) * 100}%`, background: INK_GRADIENT }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums flex-shrink-0">{svc.count}×</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Top clients */}
          <GlassCard className="overflow-hidden">
            <CardHeader title="Najlepsi klienci" />
            {topClients.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-500">Brak ukończonych wizyt w tym okresie</p>
              </div>
            ) : (
              <div>
                {topClients.map((client, i) => (
                  <div
                    key={client.name}
                    className="flex items-center gap-3 px-5 py-3"
                    style={i > 0 ? { borderTop: HAIRLINE } : undefined}
                  >
                    <ChromeAvatar
                      size="sm"
                      initials={client.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{client.name}</p>
                      <p className="text-xs text-slate-500 tabular-nums">{client.count} wizyt</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">
                      {formatCurrency(client.spent)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Busiest days — silver bars, ink peak */}
          <GlassCard className="overflow-hidden lg:col-span-2">
            <CardHeader title="Aktywność według dnia tygodnia" />
            <div className="px-6 py-5">
              <div className="flex items-end gap-3 h-36">
                {dayCount.map((count, i) => {
                  const isPeak = count === maxDayCount && count > 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className={cn("text-xs tabular-nums", isPeak ? "font-bold text-slate-900" : "text-slate-500")}>
                        {count}
                      </span>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${(count / maxDayCount) * 96}px`,
                          minHeight: count > 0 ? 4 : 0,
                          background: isPeak
                            ? INK_GRADIENT
                            : "linear-gradient(180deg, rgba(148,163,184,0.50) 0%, rgba(203,213,225,0.35) 100%)",
                          border: count > 0 ? "1px solid rgba(148,163,184,0.35)" : "none",
                          borderBottom: "none",
                          boxShadow: count > 0 ? "inset 0 1px 0 rgba(255,255,255,0.30)" : "none",
                        }}
                      />
                      <span className={cn("text-xs", isPeak ? "font-semibold text-slate-800" : "font-medium text-slate-500")}>
                        {DAY_LABELS[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
