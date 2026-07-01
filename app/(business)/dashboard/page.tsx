import { Suspense } from "react";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

// ─── Dashboard server component ───────────────────────────────

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

const STAT_CARDS = [
  {
    key: "today",
    label: "Wizyt dziś",
    icon: "📅",
    color: "brand",
  },
  {
    key: "revenue",
    label: "Przychód (miesiąc)",
    icon: "💰",
    color: "success",
  },
  {
    key: "noshow",
    label: "No-show",
    icon: "❌",
    color: "danger",
  },
  {
    key: "rating",
    label: "Ocena salonu",
    icon: "⭐",
    color: "warning",
  },
];

export default async function BusinessDashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getDashboardData(user.id);
  const business = dbUser?.ownedBusinesses[0];

  // If no business yet, redirect to onboarding
  if (!business) redirect("/business/onboarding");

  const todayAppointments = business.appointments;
  const completedToday = todayAppointments.filter(
    (a) => a.status === "COMPLETED"
  ).length;

  const stats = [
    { value: todayAppointments.length.toString(), label: "Wizyt dziś", icon: "📅", change: "+3 vs wczoraj", up: true },
    { value: formatCurrency(0), label: "Przychód (miesiąc)", icon: "💰", change: "+12% vs ostatni miesiąc", up: true },
    { value: "0", label: "No-show", icon: "❌", change: "0% wskaźnik", up: true },
    { value: `${business.averageRating.toFixed(1)}★`, label: "Ocena salonu", icon: "⭐", change: `${business.totalReviews} opinii`, up: true },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold text-surface-900 dark:text-white">
          Dzień dobry! 👋
        </h2>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {business.name} ·{" "}
          {new Date().toLocaleDateString("pl-PL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="card p-5 animate-fade-up"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <span
                className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${
                  stat.up
                    ? "bg-success-50 text-success-700"
                    : "bg-danger-50 text-danger-700"
                }`}
              >
                {stat.up ? "↑" : "↓"} {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">
              {stat.value}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-800">
            <h3 className="font-semibold text-surface-900 dark:text-white text-sm">
              Wizyt dziś
            </h3>
            <a
              href="/business/calendar"
              className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              Pełny kalendarz →
            </a>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
                Brak wizyt na dziś
              </p>
              <p className="text-xs text-surface-400 mt-1 mb-4">
                Dodaj ręcznie lub poczekaj na rezerwacje online
              </p>
              <a
                href="/business/calendar?action=new"
                className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg"
              >
                + Nowa wizyta
              </a>
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {todayAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                >
                  {/* Time */}
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-sm font-mono font-semibold text-surface-900 dark:text-white">
                      {apt.startTime.toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-2xs text-surface-400 mt-0.5">
                      {apt.duration} min
                    </p>
                  </div>

                  {/* Color bar */}
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: apt.employee?.color ?? "#7c3aed" }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                      {apt.customer.firstName} {apt.customer.lastName}
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      {apt.service.name}
                      {apt.employee && ` · ${apt.employee.firstName}`}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-surface-900 dark:text-white">
                      {formatCurrency(apt.price)}
                    </p>
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
          <div className="card p-5 border border-brand-100 dark:border-brand-700/30 bg-gradient-brand-subtle dark:bg-brand-900/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-800/50 flex items-center justify-center text-base flex-shrink-0">
                🤖
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-800 dark:text-brand-200 mb-1">
                  AI Insight
                </p>
                <p className="text-xs text-brand-700 dark:text-brand-300 leading-relaxed">
                  Twój salon ma wolne sloty w środę rano. Wyślij promocję do 5
                  uśpionych klientek i zwiększ zapełnienie o ~40%.
                </p>
                <button className="mt-3 text-2xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                  Wyślij kampanię →
                </button>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="card p-5">
            <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-widest mb-4">
              Szybkie akcje
            </h4>
            <div className="space-y-1">
              {[
                { icon: "➕", label: "Nowa wizyta", href: "/business/calendar?action=new" },
                { icon: "👤", label: "Dodaj klienta", href: "/business/crm?action=new" },
                { icon: "🎟️", label: "Utwórz kupon", href: "/business/coupons?action=new" },
                { icon: "📊", label: "Raport tygodniowy", href: "/business/analytics" },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  <span className="text-base w-6 text-center">{action.icon}</span>
                  <span className="text-sm text-surface-700 dark:text-surface-200">
                    {action.label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Recent reviews */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-widest">
                Opinie
              </h4>
              <span className="text-xs text-brand-600 font-medium">
                {business.averageRating.toFixed(1)} ★
              </span>
            </div>
            <p className="text-xs text-surface-400 text-center py-4">
              Brak nowych opinii
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: { label: "Oczekuje", className: "bg-warning-50 text-warning-700" },
    CONFIRMED: { label: "Potwierdzona", className: "bg-success-50 text-success-700" },
    COMPLETED: { label: "Zakończona", className: "bg-surface-100 text-surface-500" },
    CANCELLED_CUSTOMER: { label: "Odwołana", className: "bg-danger-50 text-danger-700" },
    CANCELLED_BUSINESS: { label: "Odwołana", className: "bg-danger-50 text-danger-700" },
    NO_SHOW: { label: "No-show", className: "bg-danger-50 text-danger-700" },
  };

  const { label, className } = map[status] ?? { label: status, className: "" };
  return (
    <span className={`mt-1 inline-block text-2xs px-1.5 py-0.5 rounded-full font-medium ${className}`}>
      {label}
    </span>
  );
}
