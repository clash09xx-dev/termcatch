export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth-user";
import { getBusinessNotificationSettings } from "@/lib/notification-settings";
import { NotificationsPrompt } from "@/components/business/notifications-prompt";
import { formatCurrency, formatTime, formatDate, formatRelativeTime } from "@/lib/utils";
import { warsawDateString, warsawDayStartUtc, warsawDayEndUtc, warsawTimeString } from "@/lib/timezone";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppointmentStatus, DayOfWeek } from "@prisma/client";
import { confirmAppointment, declineAppointment } from "@/lib/actions/appointments";
import {
  GlassCard, CardHeader, EmptyState, StatusBadge, InkLink, GlassLink,
  ChromeAvatar, Overline, Timeline, TimelineRow, HAIRLINE, CHIP, INK_BTN, GLASS_BTN, STATUS_TINT,
  type StatusKey,
} from "@/components/ui/glass";
import { Sparkline } from "@/components/ui/chart";

const DOW: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function greeting(): string {
  const h = parseInt(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(new Date()), 10);
  if (h < 5) return "Dobranoc";
  if (h < 12) return "Dzień dobry";
  if (h < 18) return "Miłego dnia";
  return "Dobry wieczór";
}

function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default async function BusinessDashboardPage() {
  const dbUser = await getOrCreateDbUser();
  const business = (await prisma.business.findMany({
    where: { ownerId: dbUser.id },
    take: 1,
    include: { workingHours: true },
  }))[0];
  if (!business) redirect("/business/onboarding");

  const now = new Date();
  const todayStr = warsawDateString(now);
  const todayStart = warsawDayStartUtc(todayStr);
  const todayEnd = warsawDayEndUtc(todayStr);
  const [yearStr, monthStr] = todayStr.split("-");
  const monthStart = warsawDayStartUtc(`${yearStr}-${monthStr}-01`);
  const weekAgo = new Date(now.getTime() - 6 * 86400_000);

  const [todayAppointments, pendingAppointments, monthRevenueAgg, monthNoShowCount, unansweredReviews, recentReviews, weekAppts, serviceCount, staffCount] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId: business.id, startTime: { gte: todayStart, lt: todayEnd }, status: { notIn: [AppointmentStatus.CANCELLED_CUSTOMER, AppointmentStatus.CANCELLED_BUSINESS] } },
      orderBy: { startTime: "asc" },
      include: { customer: true, service: true, employee: true },
    }),
    prisma.appointment.findMany({
      where: { businessId: business.id, status: AppointmentStatus.PENDING, startTime: { gte: now } },
      orderBy: { startTime: "asc" }, take: 6,
      include: { customer: true, service: true },
    }),
    prisma.appointment.aggregate({ where: { businessId: business.id, status: AppointmentStatus.COMPLETED, startTime: { gte: monthStart } }, _sum: { price: true }, _count: true }),
    prisma.appointment.count({ where: { businessId: business.id, status: AppointmentStatus.NO_SHOW, startTime: { gte: monthStart } } }),
    prisma.review.count({ where: { businessId: business.id, status: "PUBLISHED", replyText: null } }),
    prisma.review.findMany({ where: { businessId: business.id, status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 2, include: { customer: { select: { firstName: true, lastName: true } } } }),
    prisma.appointment.findMany({ where: { businessId: business.id, status: AppointmentStatus.COMPLETED, startTime: { gte: warsawDayStartUtc(warsawDateString(weekAgo)) } }, select: { startTime: true, price: true } }),
    prisma.service.count({ where: { businessId: business.id, isActive: true } }),
    prisma.employee.count({ where: { businessId: business.id, isActive: true } }),
  ]);

  const monthRevenue = monthRevenueAgg._sum.price ?? 0;
  const monthCompleted = monthRevenueAgg._count;
  const plannedToday = todayAppointments.reduce((s, a) => s + a.price, 0);
  const nextAppt = todayAppointments.find((a) => a.startTime > now);

  // 7-day revenue sparkline (honest — completed only)
  const dayRevenue: number[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAgo.getTime() + i * 86400_000);
    const ds = warsawDateString(d);
    return weekAppts.filter((a) => warsawDateString(a.startTime) === ds).reduce((s, a) => s + a.price, 0);
  });
  const weekRevenue = dayRevenue.reduce((a, b) => a + b, 0);

  // Setup completeness (real detection)
  const setup = [
    { label: "Godziny otwarcia", done: business.workingHours.some((w) => w.isOpen), href: "/business/hours" },
    { label: "Pierwsza usługa", done: serviceCount > 0, href: "/business/services?action=new" },
    { label: "Dodaj zespół", done: staffCount > 0, href: "/business/staff?action=new" },
    { label: "Udostępnij link", done: false, href: `/b/${business.slug}` },
  ];
  const setupDone = setup.filter((s) => s.done).length;
  // "New" = cannot take bookings yet (no active service or no open hours)
  const isNew = serviceCount === 0 || !business.workingHours.some((w) => w.isOpen);

  // Today's working window → gap-aware timeline (weekday in Warsaw)
  const todayDowIdx = new Date(`${todayStr}T12:00:00Z`).getUTCDay(); // 0=Sun
  const wh = business.workingHours.find((w) => w.dayOfWeek === DOW[todayDowIdx]);
  const nowMin = hmToMin(warsawTimeString(now));

  type Row =
    | { kind: "appt"; apt: (typeof todayAppointments)[number] }
    | { kind: "gap"; startMin: number; endMin: number };
  const rows: Row[] = [];
  if (wh?.isOpen) {
    const openMin = hmToMin(wh.openTime);
    const closeMin = hmToMin(wh.closeTime);
    let cursor = openMin;
    const sorted = [...todayAppointments].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    for (const apt of sorted) {
      const s = hmToMin(warsawTimeString(apt.startTime));
      const e = s + apt.duration;
      if (s - cursor >= 30 && e > nowMin) rows.push({ kind: "gap", startMin: Math.max(cursor, nowMin - (nowMin % 30)), endMin: s });
      rows.push({ kind: "appt", apt });
      cursor = Math.max(cursor, e);
    }
    if (closeMin - cursor >= 30 && closeMin > nowMin) rows.push({ kind: "gap", startMin: Math.max(cursor, nowMin - (nowMin % 30)), endMin: closeMin });
  } else {
    for (const apt of todayAppointments) rows.push({ kind: "appt", apt });
  }

  const { configured: notifConfigured } = await getBusinessNotificationSettings(business.id);
  const decisionCount = pendingAppointments.length + unansweredReviews;

  const gapHref = (startMin: number) => {
    const hh = String(Math.floor(startMin / 60)).padStart(2, "0");
    const mm = String(startMin % 60).padStart(2, "0");
    return `/business/calendar?action=new&date=${todayStr}&time=${hh}:${mm}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <NotificationsPrompt configured={notifConfigured} />

      {/* Greeting — a spoken sentence, not a stat grid */}
      <div className="fade-rise">
        <h1 className="text-2xl font-semibold text-slate-900" style={{ letterSpacing: "-0.025em" }}>
          {greeting()}{dbUser.firstName ? `, ${dbUser.firstName}` : ""}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long" })}
          {todayAppointments.length > 0 ? (
            <>
              {" · "}<span className="text-slate-700 font-medium tabular-nums">{todayAppointments.length}</span>{" "}
              {todayAppointments.length === 1 ? "wizyta" : todayAppointments.length < 5 ? "wizyty" : "wizyt"}
              {nextAppt && <> · najbliższa <span className="text-slate-700 font-medium tabular-nums">{formatTime(nextAppt.startTime)}</span></>}
              {plannedToday > 0 && <> · planowany utarg <span className="text-slate-700 font-medium tabular-nums">{formatCurrency(plannedToday)}</span></>}
            </>
          ) : (
            <> · brak wizyt na dziś</>
          )}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* ── Focal: today (or setup for a new salon) ── */}
        <div className="lg:col-span-2 fade-rise fade-rise-d1">
          {isNew ? (
            <GlassCard className="overflow-hidden">
              <CardHeader title="Zacznij tutaj" action={<span className="text-xs text-slate-400 tabular-nums">{setupDone}/{setup.length}</span>} />
              <div className="p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(203,213,225,0.4)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(setupDone / setup.length) * 94.2} 94.2`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900 tabular-nums">{setupDone}/{setup.length}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-slate-900">Twój salon jest prawie gotowy</p>
                    <p className="text-xs text-slate-500 mt-0.5">Dokończ konfigurację, żeby klienci mogli rezerwować online.</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {setup.map((s) => (
                    <Link key={s.label} href={s.href} className="row-hover flex items-center gap-3 px-3 py-2.5 rounded-xl">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={s.done ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" } : { background: "rgba(255,255,255,0.7)", border: "1px solid rgba(148,163,184,0.5)" }}>
                        {s.done && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" /></svg>}
                      </span>
                      <span className={s.done ? "text-sm text-slate-400 line-through" : "text-sm font-medium text-slate-800"}>{s.label}</span>
                      {!s.done && <svg className="w-3.5 h-3.5 text-slate-300 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg>}
                    </Link>
                  ))}
                </div>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="overflow-hidden">
              <CardHeader title="Dziś" action={<Link href="/business/calendar" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">Pełny kalendarz →</Link>} />
              {todayAppointments.length === 0 ? (
                <EmptyState
                  icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>}
                  title="Wolny dzień"
                  body="Brak wizyt na dziś. Zapisz kogoś ręcznie albo udostępnij link do rezerwacji."
                  action={<InkLink href="/business/calendar?action=new" size="sm">Dodaj wizytę</InkLink>}
                />
              ) : (
                <div className="p-5">
                  <Timeline>
                    {rows.map((row, i) => {
                      if (row.kind === "gap") {
                        const gh = String(Math.floor(row.startMin / 60)).padStart(2, "0") + ":" + String(row.startMin % 60).padStart(2, "0");
                        const mins = row.endMin - row.startMin;
                        const label = mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ""}` : `${mins}m`;
                        return (
                          <TimelineRow key={`gap-${i}`} time={gh} dotColor="rgba(148,163,184,0.5)" connector={i < rows.length - 1}>
                            <Link href={gapHref(row.startMin)} className="row-hover flex items-center gap-2 rounded-xl px-3 py-2 -ml-1 group" style={{ border: "1px dashed rgba(148,163,184,0.45)" }}>
                              <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
                              <span className="text-xs text-slate-500">Wolne {label} — dodaj wizytę</span>
                            </Link>
                          </TimelineRow>
                        );
                      }
                      const apt = row.apt;
                      const past = apt.endTime < now;
                      const rail = STATUS_TINT[apt.status as StatusKey]?.rail ?? "#94A3B8";
                      return (
                        <TimelineRow key={apt.id} time={formatTime(apt.startTime)} sub={`${apt.duration} min`} dotColor={apt.employee?.color ?? "#94A3B8"} connector={i < rows.length - 1} muted={past}>
                          <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(203,213,225,0.45)", borderLeft: `3px solid ${rail}`, boxShadow: "0 0 0 0.5px rgba(203,213,225,0.2), inset 0 1px 0 rgba(255,255,255,0.92)" }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{apt.customer.firstName} {apt.customer.lastName}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{apt.service.name}{apt.employee && ` · ${apt.employee.firstName}`}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(apt.price)}</p>
                              <StatusBadge status={apt.status} className="mt-1" />
                            </div>
                          </div>
                        </TimelineRow>
                      );
                    })}
                  </Timeline>
                </div>
              )}
            </GlassCard>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4 fade-rise fade-rise-d2">
          {/* Decision queue */}
          <GlassCard className="overflow-hidden">
            <CardHeader
              title={<span className="inline-flex items-center gap-2">Do decyzji {decisionCount > 0 && <span className="text-[11px] font-bold text-white px-1.5 py-0.5 rounded-full tabular-nums" style={{ background: STATUS_TINT.PENDING.rail }}>{decisionCount}</span>}</span>}
            />
            {decisionCount === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-slate-500">Nic nie czeka — wszystko ogarnięte. ✓</p>
            ) : (
              <div>
                {pendingAppointments.map((apt, i) => {
                  const confirmWith = confirmAppointment.bind(null, apt.id);
                  const declineWith = declineAppointment.bind(null, apt.id);
                  return (
                    <div key={apt.id} className="px-4 py-3" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                      <div className="flex items-center gap-2.5">
                        <ChromeAvatar size="sm" initials={`${apt.customer.firstName[0]}${apt.customer.lastName[0]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 truncate">{apt.customer.firstName} {apt.customer.lastName}</p>
                          <p className="text-[11px] text-slate-500 truncate tabular-nums">{apt.service.name} · {formatDate(apt.startTime, { day: "numeric", month: "short" })}, {formatTime(apt.startTime)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <form action={confirmWith} className="flex-1"><button className="btn-spring w-full py-1.5 rounded-lg text-[11px] font-semibold" style={INK_BTN}>Potwierdź</button></form>
                        <form action={declineWith}><button className="btn-spring px-3 py-1.5 rounded-lg text-[11px] font-medium" style={GLASS_BTN}>Odmów</button></form>
                      </div>
                    </div>
                  );
                })}
                {unansweredReviews > 0 && (
                  <Link href="/business/reviews" className="row-hover flex items-center gap-2.5 px-4 py-3" style={pendingAppointments.length > 0 ? { borderTop: HAIRLINE } : undefined}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={CHIP}>
                      <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.12 5.11a.56.56 0 0 0 .48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.38a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.6 0l-4.72 2.88a.56.56 0 0 1-.84-.61l1.28-5.38a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .48-.35Z" /></svg>
                    </span>
                    <span className="flex-1 text-[13px] text-slate-700"><span className="font-semibold text-slate-900 tabular-nums">{unansweredReviews}</span> {unansweredReviews === 1 ? "opinia bez odpowiedzi" : "opinii bez odpowiedzi"}</span>
                    <svg className="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                )}
              </div>
            )}
          </GlassCard>

          {/* Weekly pulse */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Overline>Ostatnie 7 dni</Overline>
              <Sparkline data={dayRevenue} />
            </div>
            <p className="text-[22px] font-bold text-slate-900 tabular-nums leading-7" style={{ letterSpacing: "-0.02em" }}>{formatCurrency(weekRevenue)}</p>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
              <span className="tabular-nums"><span className="font-semibold text-slate-700">{monthCompleted}</span> wizyt / mies.</span>
              <span className="tabular-nums"><span className="font-semibold text-slate-700">{monthNoShowCount}</span> no-show</span>
            </div>
          </GlassCard>

          {/* Reviews digest */}
          {recentReviews.length > 0 && (
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <Overline>Ostatnie opinie</Overline>
                {business.totalReviews > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 tabular-nums">
                    <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.12 5.11a.56.56 0 0 0 .48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.38a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.6 0l-4.72 2.88a.56.56 0 0 1-.84-.61l1.28-5.38a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .48-.35Z" /></svg>
                    {business.averageRating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {recentReviews.map((r) => (
                  <Link key={r.id} href="/business/reviews" className="row-hover block px-2 py-1.5 rounded-lg -mx-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{r.customer.firstName} {r.customer.lastName[0]}. · <span className="text-amber-500 tabular-nums">{r.rating}★</span></p>
                    {r.comment && <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{r.comment}</p>}
                  </Link>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Booking link */}
          <GlassCard className="p-4">
            <Overline className="mb-2">Link do rezerwacji</Overline>
            <div className="px-3 py-2 rounded-xl text-xs text-slate-600 truncate tabular-nums mb-2.5" style={CHIP}>/b/{business.slug}</div>
            <GlassLink href={`/b/${business.slug}`} size="sm" className="w-full">Podgląd profilu</GlassLink>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
