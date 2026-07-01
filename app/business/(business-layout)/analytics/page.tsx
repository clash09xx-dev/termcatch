import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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
  week: "Ten tydzień",
  month: "Ten miesiąc",
  year: "Ten rok",
};

const DAY_LABELS = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"];

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

  // Busiest hours by day of week (0=Mon, 6=Sun)
  const dayCount = Array(7).fill(0) as number[];
  for (const apt of appointments) {
    const d = new Date(apt.startTime).getDay();
    // JS getDay: 0=Sun, convert to Mon=0
    const idx = d === 0 ? 6 : d - 1;
    dayCount[idx]++;
  }
  const maxDayCount = Math.max(...dayCount, 1);

  const stats = [
    {
      label: "Przychód",
      value: formatCurrency(totalRevenue),
      sub: `${completed.length} ukończonych wizyt`,
    },
    {
      label: "Wszystkich wizyt",
      value: String(total),
      sub: "w wybranym okresie",
    },
    {
      label: "Średnia wartość",
      value: formatCurrency(avgValue),
      sub: "za wizytę",
    },
    {
      label: "Wskaźnik ukończenia",
      value: `${completionRate.toFixed(0)}%`,
      sub: `${completed.length} z ${total} wizyt`,
    },
    {
      label: "No-show",
      value: `${noShowRate.toFixed(0)}%`,
      sub: `${noShows.length} wizyt`,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Analityka</h1>
          <p className="text-sm text-gray-700 mt-0.5">
            Przegląd wyników Twojego salonu
          </p>
        </div>
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          {validPeriods.map((p) => (
            <Link
              key={p}
              href={`/business/analytics?period=${p}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activePeriod === p
                  ? "bg-white text-gray-900 shadow-soft-sm"
                  : "text-gray-700 hover:text-gray-900"
              }`}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs font-medium text-gray-900 mt-0.5">{stat.label}</p>
            <p className="text-xs text-gray-700 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ChartIcon className="w-6 h-6 text-gray-700" />
          </div>
          <p className="text-sm font-medium text-gray-900">Brak danych</p>
          <p className="text-sm text-gray-700 mt-1 max-w-sm">
            Gdy klienci zarezerwują wizyty, pojawią się tutaj statystyki.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top services */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Najpopularniejsze usługi</h3>
            </div>
            {topServices.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-700">Brak danych</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topServices.map((svc, i) => (
                  <div key={svc.name} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="text-sm font-bold text-gray-700 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{svc.name}</p>
                      <p className="text-xs text-gray-700">{svc.count}x</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {formatCurrency(svc.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top clients */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Najlepsi klienci</h3>
            </div>
            {topClients.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-700">Brak danych</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {topClients.map((client, i) => (
                  <div key={client.name} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="text-sm font-bold text-gray-700 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                      <p className="text-xs text-gray-700">{client.count} wizyt</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {formatCurrency(client.spent)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Busiest days */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden lg:col-span-2">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Aktywność według dnia tygodnia</h3>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-end gap-3 h-32">
                {dayCount.map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs text-gray-700">{count}</span>
                    <div className="w-full rounded-t-lg bg-gray-900 transition-all" style={{ height: `${(count / maxDayCount) * 96}px`, minHeight: count > 0 ? 4 : 0 }} />
                    <span className="text-xs font-medium text-gray-700">{DAY_LABELS[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M15.5 2A1.5 1.5 0 0 0 14 3.5v13a1.5 1.5 0 0 0 3 0v-13A1.5 1.5 0 0 0 15.5 2ZM9.5 6A1.5 1.5 0 0 0 8 7.5v9a1.5 1.5 0 0 0 3 0v-9A1.5 1.5 0 0 0 9.5 6ZM3.5 10A1.5 1.5 0 0 0 2 11.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 3.5 10Z" />
    </svg>
  );
}
