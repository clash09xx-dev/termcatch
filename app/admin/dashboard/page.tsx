export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { AdminViewSwitcher } from "@/components/admin-view-switcher";
import { TestSmsForm } from "@/components/admin/test-sms-form";
import {
  adminBanBusiness,
  adminRestoreBusiness,
  adminDeleteBusiness,
  adminSuspendBusiness,
} from "@/lib/actions/admin";
import { STATUS_LABELS } from "@/lib/publication";

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

type RawCount = { count: bigint }[];
type RawSource = { src: string; visitors: bigint }[];
type RawDaily = { day: Date; views: bigint }[];

export default async function AdminDashboardPage() {
  // ── Dostęp: rola ADMIN/SUPERADMIN albo e-mail z ADMIN_EMAILS ──
  const authUser = await getServerUser();
  if (!authUser) redirect("/login?redirect=/admin/dashboard");

  const adminEmails = parseAdminEmails();
  const email = (authUser.email ?? "").toLowerCase();
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { role: true },
  });
  const isAdmin =
    dbUser?.role === "ADMIN" ||
    dbUser?.role === "SUPERADMIN" ||
    adminEmails.includes(email);
  if (!isAdmin) redirect("/");

  const now = Date.now();
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const d14 = new Date(now - 14 * 24 * 60 * 60 * 1000);

  // ── Metryki ──────────────────────────────────────────────────
  const [
    views30,
    uniquesRaw,
    signups30,
    totalUsers,
    activeBusinesses,
    newBusinesses30,
    subsByStatus,
    bookings30,
    gmv30Agg,
    cancelledSubs30,
    cancelledBookings30,
    sourcesRaw,
    dailyRaw,
    recentBookings,
    recentBusinesses,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { event: "page_view", createdAt: { gte: d30 } },
    }),
    prisma.$queryRaw<RawCount>`
      SELECT COUNT(DISTINCT properties->>'vid') AS count
      FROM analytics_events
      WHERE event = 'page_view' AND created_at >= ${d30}`,
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    prisma.user.count(),
    prisma.business.count({ where: { status: "ACTIVE" } }),
    prisma.business.count({ where: { createdAt: { gte: d30 } } }),
    prisma.businessSubscription.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.appointment.count({ where: { createdAt: { gte: d30 } } }),
    prisma.appointment.aggregate({
      where: { status: "COMPLETED", startTime: { gte: d30 } },
      _sum: { price: true },
    }),
    prisma.businessSubscription.count({
      where: { cancelledAt: { gte: d30 } },
    }),
    prisma.appointment.count({
      where: {
        cancelledAt: { gte: d30 },
      },
    }),
    prisma.$queryRaw<RawSource>`
      SELECT properties->>'ref_domain' AS src, COUNT(DISTINCT properties->>'vid') AS visitors
      FROM analytics_events
      WHERE event = 'page_view' AND created_at >= ${d30}
        AND properties->>'ref_domain' IS NOT NULL
        AND properties->>'ref_domain' != 'internal'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
    prisma.$queryRaw<RawDaily>`
      SELECT date_trunc('day', created_at) AS day, COUNT(*) AS views
      FROM analytics_events
      WHERE event = 'page_view' AND created_at >= ${d14}
      GROUP BY 1 ORDER BY 1`,
    prisma.appointment.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        business: { select: { name: true } },
        service: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        city: true,
        createdAt: true,
        status: true,
        _count: { select: { appointments: true } },
      },
    }),
  ]);

  const uniques30 = Number(uniquesRaw[0]?.count ?? 0);
  const gmv30 = gmv30Agg._sum.price ?? 0;
  const activeSubs =
    subsByStatus.find((s) => s.status === "ACTIVE")?._count._all ?? 0;
  const trialSubs =
    subsByStatus.find((s) => s.status === "TRIALING")?._count._all ?? 0;
  const conversion =
    uniques30 > 0 ? ((signups30 / uniques30) * 100).toFixed(1) : "—";

  const daily = dailyRaw.map((d) => ({
    day: d.day,
    views: Number(d.views),
  }));
  const maxDaily = Math.max(1, ...daily.map((d) => d.views));

  const stats: { label: string; value: string; sub: string }[] = [
    { label: "Odsłony (30 dni)", value: views30.toLocaleString("pl-PL"), sub: "bez odświeżeń i adminów" },
    { label: "Unikalni odwiedzający", value: uniques30.toLocaleString("pl-PL"), sub: "ostatnie 30 dni" },
    { label: "Nowe rejestracje", value: signups30.toLocaleString("pl-PL"), sub: `${totalUsers} kont łącznie` },
    { label: "Konwersja", value: conversion === "—" ? "—" : `${conversion}%`, sub: "rejestracje / unikalni" },
    { label: "Aktywne salony", value: activeBusinesses.toLocaleString("pl-PL"), sub: `+${newBusinesses30} w 30 dni` },
    { label: "Subskrypcje płatne", value: activeSubs.toLocaleString("pl-PL"), sub: `${trialSubs} na okresie próbnym` },
    { label: "Rezerwacje (30 dni)", value: bookings30.toLocaleString("pl-PL"), sub: `${cancelledBookings30} anulowanych` },
    { label: "GMV (30 dni)", value: formatCurrency(gmv30), sub: "wartość zakończonych wizyt" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminViewSwitcher />
      <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4">
        <Link href="/" className="flex items-center">
          <Wordmark className="text-base" />
        </Link>
        <span className="text-xs font-semibold text-white bg-gray-900 px-2 py-0.5 rounded-full">
          Panel właściciela
        </span>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily views */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Odsłony dziennie — ostatnie 14 dni
            </h3>
            {daily.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">
                Brak danych — statystyki pojawią się po pierwszych wizytach ze zgodą na cookie analityczne.
              </p>
            ) : (
              <div className="flex items-end gap-1.5 h-36">
                {daily.map((d) => (
                  <div key={d.day.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-500">{d.views}</span>
                    <div
                      className="w-full bg-gray-900 rounded-t-md"
                      style={{ height: `${Math.max(4, (d.views / maxDaily) * 110)}px` }}
                    />
                    <span className="text-[9px] text-gray-400">
                      {d.day.toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Traffic sources */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Źródła ruchu (30 dni)</h3>
            {sourcesRaw.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Brak danych</p>
            ) : (
              <div className="space-y-2.5">
                {sourcesRaw.map((s) => {
                  const visitors = Number(s.visitors);
                  const maxV = Number(sourcesRaw[0]?.visitors ?? 1);
                  return (
                    <div key={s.src}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">
                          {s.src === "direct" ? "Wejścia bezpośrednie" : s.src}
                        </span>
                        <span className="text-gray-500">{visitors}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full"
                          style={{ width: `${Math.max(4, (visitors / maxV) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent bookings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 px-6 py-4 border-b border-gray-100">
              Ostatnie rezerwacje
            </h3>
            {recentBookings.length === 0 ? (
              <p className="text-xs text-gray-400 py-10 text-center">Brak rezerwacji</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentBookings.map((b) => (
                  <div key={b.id} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {b.customer.firstName} {b.customer.lastName} — {b.service.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {b.business.name} · {formatRelativeTime(b.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {formatCurrency(b.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent businesses + zarządzanie */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 px-6 py-4 border-b border-gray-100">
              Salony — zarządzanie
            </h3>
            {recentBusinesses.length === 0 ? (
              <p className="text-xs text-gray-400 py-10 text-center">Brak salonów</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentBusinesses.map((b) => {
                  const suspendAction = adminSuspendBusiness.bind(null, b.id);
                  const banAction = adminBanBusiness.bind(null, b.id);
                  const restoreAction = adminRestoreBusiness.bind(null, b.id);
                  const deleteAction = adminDeleteBusiness.bind(null, b.id);
                  const isActive = b.status === "ACTIVE";
                  const canDelete = b._count.appointments === 0;
                  const ghost =
                    "text-[11px] font-medium px-2.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors";
                  return (
                    <div key={b.id} className="px-6 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
                        <p className="text-xs text-gray-500">
                          {b.city} · {formatRelativeTime(b.createdAt)} · {b._count.appointments} rezerwacji
                        </p>
                      </div>
                      <span
                        className={
                          isActive
                            ? "text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 flex-shrink-0"
                            : b.status === "PENDING_VERIFICATION"
                            ? "text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex-shrink-0"
                            : "text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 flex-shrink-0"
                        }
                      >
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                      {/* Moderation only — publication is automatic. */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                        {isActive && (
                          <form action={suspendAction}>
                            <button type="submit" className={ghost}>Zawieś</button>
                          </form>
                        )}
                        {(b.status === "SUSPENDED" || b.status === "BANNED") && (
                          <form action={restoreAction}>
                            <button type="submit" className="text-[11px] font-medium px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                              {b.status === "SUSPENDED" ? "Reaktywuj" : "Przywróć"}
                            </button>
                          </form>
                        )}
                        {b.status !== "BANNED" && (
                          <form action={banAction}>
                            <button type="submit" className="text-[11px] font-medium px-2.5 py-1.5 border border-gray-200 hover:border-red-200 hover:text-red-600 text-gray-600 rounded-lg transition-colors">
                              Zablokuj
                            </button>
                          </form>
                        )}
                        {canDelete && (
                          <form action={deleteAction}>
                            <button type="submit" className="text-[11px] font-medium px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                              Usuń
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <TestSmsForm />

        <p className="text-xs text-gray-400 text-center pb-4">
          Statystyki odwiedzin liczone anonimowo, bez odświeżeń tej samej podstrony w ramach sesji.
          Konta administratorów (ADMIN_EMAILS) są wykluczone z pomiaru. Anulowane subskrypcje (30 dni): {cancelledSubs30}.
        </p>
      </main>
    </div>
  );
}
