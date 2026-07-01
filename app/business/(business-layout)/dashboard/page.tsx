export const dynamic = "force-dynamic";

import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";

async function getDashboardData(supabaseId: string) {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        include: {
          appointments: {
            where: {
              startTime: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lt: new Date(new Date().setHours(23, 59, 59, 999)),
              },
            },
            orderBy: { startTime: "asc" },
            include: { customer: true, service: true, employee: true },
          },
          _count: { select: { appointments: true, reviews: true } },
        },
      },
    },
  });
  return user;
}

export default async function BusinessDashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getDashboardData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const todayAppointments = business.appointments;

  const stats = [
    {
      label: "Wizyt dziś",
      value: todayAppointments.length.toString(),
      sub: "zaplanowane",
    },
    {
      label: "Przychód (miesiąc)",
      value: formatCurrency(0),
      sub: "brak danych",
    },
    {
      label: "No-show",
      value: "0",
      sub: "0% wskaźnik",
    },
    {
      label: "Ocena salonu",
      value: business.averageRating.toFixed(1),
      sub: `${business._count.reviews} opinii`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{business.name}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("pl-PL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Wizyt dziś</h3>
            <Link href="/business/calendar" className="text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors">
              Pełny kalendarz →
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Brak wizyt na dziś</p>
              <p className="text-xs text-gray-400 mt-1 mb-5">
                Dodaj ręcznie lub poczekaj na rezerwacje online
              </p>
              <Link
                href="/business/calendar?action=new"
                className="text-xs px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                Dodaj wizytę
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-sm font-mono font-semibold text-gray-900">
                      {apt.startTime.toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{apt.duration} min</p>
                  </div>

                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: apt.employee?.color ?? "#374151" }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {apt.customer.firstName} {apt.customer.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {apt.service.name}
                      {apt.employee && ` · ${apt.employee.firstName}`}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(apt.price)}</p>
                    <StatusBadge status={apt.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* AI insight */}
          <div className="bg-gray-900 rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-white mb-1">AI Asystent</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Aktywuj salon, żeby zobaczyć spersonalizowane sugestie dla Twojego biznesu.
                </p>
                <Link href="/business/ai" className="mt-3 inline-block text-[11px] font-semibold text-white/80 hover:text-white transition-colors">
                  Otwórz AI →
                </Link>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4">
              Szybkie akcje
            </h4>
            <div className="space-y-0.5">
              {[
                { label: "Nowa wizyta", href: "/business/calendar?action=new", icon: PlusIcon },
                { label: "Dodaj klienta", href: "/business/crm?action=new", icon: UserPlusIcon },
                { label: "Utwórz kupon", href: "/business/coupons?action=new", icon: TagIcon },
                { label: "Raport tygodniowy", href: "/business/analytics", icon: ChartIcon },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <action.icon />
                  <span className="text-sm text-gray-700">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Opinie</h4>
              <span className="text-xs font-semibold text-gray-900">
                {business.averageRating.toFixed(1)} / 5
              </span>
            </div>
            <p className="text-xs text-gray-400 text-center py-4">Brak nowych opinii</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Oczekuje", className: "bg-amber-50 text-amber-700" },
    CONFIRMED: { label: "Potwierdzona", className: "bg-green-50 text-green-700" },
    COMPLETED: { label: "Zakończona", className: "bg-gray-100 text-gray-500" },
    CANCELLED_CUSTOMER: { label: "Odwołana", className: "bg-red-50 text-red-600" },
    CANCELLED_BUSINESS: { label: "Odwołana", className: "bg-red-50 text-red-600" },
    NO_SHOW: { label: "No-show", className: "bg-red-50 text-red-600" },
  };
  const { label, className } = map[status] ?? { label: status, className: "" };
  return (
    <span className={`mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${className}`}>
      {label}
    </span>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" x2="7.01" y1="7" y2="7" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}
