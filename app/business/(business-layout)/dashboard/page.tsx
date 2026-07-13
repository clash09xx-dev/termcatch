export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth-user";
import { getBusinessNotificationSettings } from "@/lib/notification-settings";
import { NotificationsPrompt } from "@/components/business/notifications-prompt";
import { formatCurrency, formatDate, formatTime, formatRelativeTime } from "@/lib/utils";
import { warsawDateString, warsawDayStartUtc, warsawDayEndUtc } from "@/lib/timezone";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";
import { confirmAppointment, declineAppointment } from "@/lib/actions/appointments";
import {
  GlassCard,
  CardHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  InkLink,
  ChromeAvatar,
  Overline,
  HAIRLINE,
  CHIP,
  INK_BTN,
  GLASS_BTN,
  STATUS_TINT,
  type StatusKey,
} from "@/components/ui/glass";

function greeting(): string {
  const h = parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(new Date()),
    10
  );
  if (h < 5) return "Dobranoc";
  if (h < 12) return "Dzień dobry";
  if (h < 18) return "Miłego dnia";
  return "Dobry wieczór";
}

export default async function BusinessDashboardPage() {
  const dbUser = await getOrCreateDbUser();
  const business = (
    await prisma.business.findMany({ where: { ownerId: dbUser.id }, take: 1 })
  )[0];
  if (!business) redirect("/business/onboarding");

  const now = new Date();
  const todayStr = warsawDateString(now);
  const todayStart = warsawDayStartUtc(todayStr);
  const todayEnd = warsawDayEndUtc(todayStr);
  const [yearStr, monthStr] = todayStr.split("-");
  const monthStart = warsawDayStartUtc(`${yearStr}-${monthStr}-01`);

  const [
    todayAppointments,
    pendingAppointments,
    monthRevenueAgg,
    monthCompletedCount,
    monthNoShowCount,
    recentReviews,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        startTime: { gte: todayStart, lt: todayEnd },
        status: { notIn: [AppointmentStatus.CANCELLED_CUSTOMER, AppointmentStatus.CANCELLED_BUSINESS] },
      },
      orderBy: { startTime: "asc" },
      include: { customer: true, service: true, employee: true },
    }),
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        status: AppointmentStatus.PENDING,
        startTime: { gte: now },
      },
      orderBy: { startTime: "asc" },
      take: 5,
      include: { customer: true, service: true },
    }),
    prisma.appointment.aggregate({
      where: {
        businessId: business.id,
        status: AppointmentStatus.COMPLETED,
        startTime: { gte: monthStart },
      },
      _sum: { price: true },
    }),
    prisma.appointment.count({
      where: {
        businessId: business.id,
        status: AppointmentStatus.COMPLETED,
        startTime: { gte: monthStart },
      },
    }),
    prisma.appointment.count({
      where: {
        businessId: business.id,
        status: AppointmentStatus.NO_SHOW,
        startTime: { gte: monthStart },
      },
    }),
    prisma.review.findMany({
      where: { businessId: business.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const monthRevenue = monthRevenueAgg._sum.price ?? 0;
  const finishedThisMonth = monthCompletedCount + monthNoShowCount;
  const noShowRate =
    finishedThisMonth > 0 ? Math.round((monthNoShowCount / finishedThisMonth) * 100) : 0;

  const nextToday = todayAppointments.find((a) => a.startTime > now);

  const { configured: notifConfigured } = await getBusinessNotificationSettings(business.id);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <NotificationsPrompt configured={notifConfigured} />

      {/* ── Greeting — the focal point ── */}
      <div className="fade-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900" style={{ letterSpacing: "-0.025em" }}>
            {greeting()}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("pl-PL", {
              timeZone: "Europe/Warsaw",
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {nextToday && (
              <>
                {" · "}
                następna wizyta{" "}
                <span className="font-semibold text-slate-800 tabular-nums">
                  {formatTime(nextToday.startTime)}
                </span>
              </>
            )}
          </p>
        </div>
        <InkLink href="/business/calendar?action=new">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nowa wizyta
        </InkLink>
      </div>

      {/* ── Stats ── */}
      <div className="fade-rise fade-rise-d1 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Wizyty dziś"
          value={todayAppointments.length}
          sub="zaplanowane"
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          }
        />
        <StatCard
          label="Przychód · miesiąc"
          value={formatCurrency(monthRevenue)}
          sub={`${monthCompletedCount} zakończonych wizyt`}
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="No-show · miesiąc"
          value={monthNoShowCount}
          sub={`${noShowRate}% wskaźnik`}
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
            </svg>
          }
        />
        <StatCard
          label="Ocena salonu"
          value={business.totalReviews > 0 ? business.averageRating.toFixed(1) : "—"}
          sub={`${business.totalReviews} opinii`}
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
        />
      </div>

      {/* ── Pending inbox — needs action ── */}
      {pendingAppointments.length > 0 && (
        <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_TINT.PENDING.rail }} />
                Oczekujące rezerwacje
                <span className="tabular-nums text-slate-400 font-medium">({pendingAppointments.length})</span>
              </span>
            }
          />
          <div>
            {pendingAppointments.map((apt, i) => {
              const confirmWithId = confirmAppointment.bind(null, apt.id);
              const declineWithId = declineAppointment.bind(null, apt.id);
              return (
                <div
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5"
                  style={i > 0 ? { borderTop: HAIRLINE } : undefined}
                >
                  <ChromeAvatar initials={`${apt.customer.firstName[0]}${apt.customer.lastName[0]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {apt.customer.firstName} {apt.customer.lastName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {apt.service.name} · {formatDate(apt.startTime, { weekday: "short", day: "numeric", month: "short" })}, {formatTime(apt.startTime)} · {formatCurrency(apt.price)}
                    </p>
                    {apt.customerNotes && (
                      <p className="text-xs text-slate-400 mt-1 italic">„{apt.customerNotes}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <form action={confirmWithId}>
                      <button type="submit" className="btn-spring px-4 py-2 rounded-xl text-xs font-semibold" style={INK_BTN}>
                        Potwierdź
                      </button>
                    </form>
                    <form action={declineWithId}>
                      <button type="submit" className="btn-spring px-4 py-2 rounded-xl text-xs font-medium" style={GLASS_BTN}>
                        Odwołaj
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Main grid ── */}
      <div className="fade-rise fade-rise-d3 grid lg:grid-cols-3 gap-5 items-start">
        {/* Today — vertical timeline */}
        <GlassCard className="lg:col-span-2 overflow-hidden">
          <CardHeader
            title="Dziś"
            action={
              <Link href="/business/calendar" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                Pełny kalendarz →
              </Link>
            }
          />

          {todayAppointments.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              }
              title="Brak wizyt na dziś"
              body="Zapisz klienta ręcznie albo udostępnij link do rezerwacji."
              action={<InkLink href="/business/calendar?action=new" size="sm">Dodaj wizytę</InkLink>}
            />
          ) : (
            <div className="px-5 py-4">
              {todayAppointments.map((apt, i) => {
                const isPast = apt.endTime < now;
                const rail = STATUS_TINT[apt.status as StatusKey]?.rail ?? "#94A3B8";
                return (
                  <div key={apt.id} className="relative flex gap-4">
                    {/* time rail */}
                    <div className="w-11 text-right flex-shrink-0 pt-0.5">
                      <p className={`text-sm font-semibold tabular-nums ${isPast ? "text-slate-400" : "text-slate-900"}`}>
                        {formatTime(apt.startTime)}
                      </p>
                      <p className="text-[10px] text-slate-400 tabular-nums">{apt.duration} min</p>
                    </div>
                    {/* spine */}
                    <div className="relative flex flex-col items-center">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: apt.employee?.color ?? "#94A3B8", boxShadow: "0 0 0 3px rgba(255,255,255,0.85)" }}
                      />
                      {i < todayAppointments.length - 1 && (
                        <span className="w-px flex-1 my-1" style={{ background: "rgba(203,213,225,0.50)" }} />
                      )}
                    </div>
                    {/* card */}
                    <div
                      className={`flex-1 min-w-0 mb-2.5 rounded-2xl px-4 py-3 flex items-center gap-3 ${isPast ? "opacity-60" : ""}`}
                      style={{
                        background: "rgba(255,255,255,0.80)",
                        border: "1px solid rgba(203,213,225,0.45)",
                        borderLeft: `3px solid ${rail}`,
                        boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.92)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {apt.customer.firstName} {apt.customer.lastName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {apt.service.name}
                          {apt.employee && ` · ${apt.employee.firstName}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(apt.price)}</p>
                        <StatusBadge status={apt.status} className="mt-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick actions */}
          <GlassCard className="p-4">
            <Overline className="mb-3 px-1">Szybkie akcje</Overline>
            <div className="space-y-1">
              {[
                {
                  label: "Nowa wizyta",
                  href: "/business/calendar?action=new",
                  icon: <path d="M12 5v14M5 12h14" />,
                },
                {
                  label: "Dodaj usługę",
                  href: "/business/services",
                  icon: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></>,
                },
                {
                  label: "Dodaj pracownika",
                  href: "/business/staff",
                  icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></>,
                },
                {
                  label: "Analityka",
                  href: "/business/analytics",
                  icon: <><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></>,
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="row-hover flex items-center gap-3 px-3 py-2.5 rounded-xl"
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 flex-shrink-0" style={CHIP}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      {action.icon}
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-slate-700">{action.label}</span>
                  <svg className="w-3.5 h-3.5 text-slate-300 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
          </GlassCard>

          {/* Reviews digest */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <Overline>Ostatnie opinie</Overline>
              {business.totalReviews > 0 && (
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                  </svg>
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    {business.averageRating.toFixed(1)}
                  </span>
                </span>
              )}
            </div>
            {recentReviews.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-5">
                Opinie pojawią się po pierwszych zakończonych wizytach.
              </p>
            ) : (
              <div className="space-y-1">
                {recentReviews.map((review) => (
                  <Link
                    key={review.id}
                    href="/business/reviews"
                    className="row-hover block px-3 py-2.5 rounded-xl"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {review.customer.firstName} {review.customer.lastName[0]}.
                      </p>
                      <span className="inline-flex items-center gap-1 flex-shrink-0">
                        <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                        </svg>
                        <span className="text-xs font-semibold text-slate-700 tabular-nums">{review.rating}</span>
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{review.comment}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(review.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Booking link */}
          <GlassCard className="p-4">
            <Overline className="mb-2 px-1">Twój link do rezerwacji</Overline>
            <p className="px-1 text-xs text-slate-500 leading-relaxed mb-3">
              Wyślij klientom lub wklej do bio — rezerwują sami, 24/7.
            </p>
            <div
              className="px-3 py-2 rounded-xl text-xs text-slate-600 truncate tabular-nums"
              style={CHIP}
            >
              /b/{business.slug}
            </div>
            <div className="flex gap-2 mt-2.5">
              <Link
                href={`/b/${business.slug}`}
                target="_blank"
                className="btn-spring flex-1 text-center px-3 py-2 rounded-xl text-xs font-semibold"
                style={GLASS_BTN}
              >
                Podgląd profilu
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
