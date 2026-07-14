export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth-user";
import { formatDate, formatTime, formatCurrency, cn } from "@/lib/utils";
import { AppointmentStatus } from "@prisma/client";
import { cancelAppointment } from "@/lib/actions/appointments";
import { isFavourite } from "@/lib/actions/favourites";
import RescheduleButton from "./reschedule-button";
import FavouriteButton from "@/components/booking/favourite-button";
import {
  PageHeader,
  GlassCard,
  GlassLink,
  EmptyState,
  StatusBadge,
  InkLink,
  ChromeAvatar,
  Overline,
  CHIP,
  HAIRLINE,
} from "@/components/ui/glass";

// ── Local cancel button — reuses cancelAppointment unchanged ──
function CancelButton({ appointmentId, className }: { appointmentId: string; className?: string }) {
  async function handleCancel() {
    "use server";
    await cancelAppointment(appointmentId);
  }
  return (
    <form action={handleCancel}>
      <button
        type="submit"
        className={cn("btn-spring text-xs font-semibold px-3 py-1.5 rounded-lg", className)}
        style={{
          background: "rgba(244,63,94,0.08)",
          border: "1px solid rgba(244,63,94,0.28)",
          color: "#BE123C",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.60)",
        }}
      >
        Anuluj
      </button>
    </form>
  );
}

// ── Warsaw calendar-day index, for precise dziś/jutro labels ──
function warsawDayIndex(d: Date): number {
  const ymd = d.toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" }); // YYYY-MM-DD
  return Math.round(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);
}

function relativeLabel(start: Date, now: Date): string {
  const ms = start.getTime() - now.getTime();
  if (ms <= 0) return "teraz";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `za ${mins} min`;
  const dayDiff = warsawDayIndex(start) - warsawDayIndex(now);
  if (dayDiff <= 0) return `dziś o ${formatTime(start)}`;
  if (dayDiff === 1) return "jutro";
  if (dayDiff === 2) return "pojutrze";
  if (dayDiff < 7) return `za ${dayDiff} dni`;
  if (dayDiff < 14) return "za tydzień";
  return `za ${Math.round(dayDiff / 7)} tyg.`;
}

function mapUrl(b: { latitude: number | null; longitude: number | null; address: string; city: string }): string {
  const q = b.latitude != null && b.longitude != null ? `${b.latitude},${b.longitude}` : `${b.address}, ${b.city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

const TERMINAL: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED_CUSTOMER,
  AppointmentStatus.CANCELLED_BUSINESS,
  AppointmentStatus.NO_SHOW,
  AppointmentStatus.RESCHEDULED,
];

export default async function CustomerDashboardPage() {
  const now = new Date();
  const dbUser = await getOrCreateDbUser();

  const [upcoming, history] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        customerId: dbUser.id,
        startTime: { gte: now },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
      include: {
        business: {
          select: {
            name: true, slug: true, logoUrl: true,
            address: true, city: true, latitude: true, longitude: true,
            phone: true, cancellationHours: true,
          },
        },
        service: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
        addons: { select: { name: true, quantity: true, totalPrice: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        customerId: dbUser.id,
        OR: [{ startTime: { lt: now } }, { status: { in: TERMINAL } }],
      },
      include: {
        business: { select: { name: true, slug: true, logoUrl: true } },
        service: { select: { id: true, name: true } },
        review: { select: { id: true } },
      },
      orderBy: { startTime: "desc" },
      take: 12,
    }),
  ]);

  const ticket = upcoming[0] ?? null;
  const remaining = upcoming.slice(1);
  const ticketFav = ticket ? await isFavourite(ticket.businessId) : false;

  // Quick-repeat: distinct completed services (most recent first)
  const repeatSeen = new Set<string>();
  const quickRepeat = history
    .filter((a) => a.status === AppointmentStatus.COMPLETED)
    .filter((a) => {
      if (repeatSeen.has(a.serviceId)) return false;
      repeatSeen.add(a.serviceId);
      return true;
    })
    .slice(0, 4);

  const recentHistory = history.slice(0, 5);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`Cześć, ${dbUser.firstName}`}
        subtitle={
          upcoming.length > 0
            ? `Masz ${upcoming.length} ${upcoming.length === 1 ? "zaplanowaną wizytę" : "zaplanowane wizyty"}.`
            : "Nie masz jeszcze zaplanowanych wizyt."
        }
      />

      {/* ── Focal ticket: the next appointment ── */}
      {ticket ? (
        <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 pb-4">
            <div className="flex items-center justify-between gap-3">
              <Overline>Najbliższa wizyta</Overline>
              <StatusBadge status={ticket.status} />
            </div>

            <div className="mt-4 flex gap-4 sm:gap-5">
              {/* Big date block */}
              <div
                className="flex-shrink-0 text-center rounded-2xl px-4 py-3 w-[76px]"
                style={CHIP}
              >
                <p className="text-[28px] leading-none font-bold text-slate-900 tabular-nums">
                  {formatDate(ticket.startTime, { day: "numeric" })}
                </p>
                <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500 mt-1">
                  {formatDate(ticket.startTime, { month: "short" })}
                </p>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-slate-900 leading-tight" style={{ letterSpacing: "-0.01em" }}>
                  {ticket.service.name}
                </p>
                <p className="text-sm text-slate-500 mt-0.5 truncate">
                  {ticket.business.name}
                  {ticket.employee && ` · ${ticket.employee.firstName} ${ticket.employee.lastName}`}
                </p>
                {ticket.addons.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {ticket.addons.map((a) => `+ ${a.name}${a.quantity > 1 ? ` ×${a.quantity}` : ""}`).join(" · ")}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[13px] font-semibold text-slate-800 tabular-nums" style={CHIP}>
                    {formatDate(ticket.startTime, { weekday: "long" })}, {formatTime(ticket.startTime)}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[13px] font-semibold text-slate-800" style={{ background: "rgba(15,23,42,0.06)", border: HAIRLINE }}>
                    {relativeLabel(ticket.startTime, now)}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">{formatCurrency(ticket.price)}</span>
                </div>
              </div>
            </div>

            {/* Address / map */}
            {(ticket.business.address || ticket.business.city) && (
              <a
                href={mapUrl(ticket.business)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors group"
              >
                <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span className="truncate">
                  {ticket.business.address}
                  {ticket.business.city && `, ${ticket.business.city}`}
                </span>
                <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 flex-shrink-0">· mapa</span>
              </a>
            )}
          </div>

          {/* Actions + policy */}
          <div className="px-5 sm:px-6 py-3.5" style={{ borderTop: HAIRLINE, background: "rgba(248,250,252,0.6)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <RescheduleButton
                appointmentId={ticket.id}
                businessId={ticket.businessId}
                serviceId={ticket.serviceId}
                employeeId={ticket.employeeId}
                serviceName={ticket.service.name}
                businessName={ticket.business.name}
              />
              <CancelButton appointmentId={ticket.id} />
              <FavouriteButton
                businessId={ticket.businessId}
                initialIsFavourite={ticketFav}
                redirectPath="/customer/dashboard"
                size="sm"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
              Możesz przełożyć lub odwołać tę wizytę najpóźniej{" "}
              <span className="tabular-nums">{ticket.business.cancellationHours ?? 24}</span> godz. przed terminem.
            </p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            }
            title="Brak zaplanowanych wizyt"
            body="Znajdź salon i zarezerwuj wizytę — potwierdzenie przyjdzie e-mailem."
            action={
              <InkLink href="/search" size="md">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                Szukaj salonu
              </InkLink>
            }
          />
        </GlassCard>
      )}

      {/* ── Remaining upcoming ── */}
      {remaining.length > 0 && (
        <section className="fade-rise fade-rise-d2 space-y-2.5">
          <Overline>Kolejne wizyty</Overline>
          {remaining.map((apt) => (
            <div key={apt.id} className="rounded-[18px] p-4 flex gap-3.5 items-center" style={{ background: "rgba(255,255,255,0.80)", border: HAIRLINE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
              {apt.business.logoUrl ? (
                <span className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ border: HAIRLINE }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={apt.business.logoUrl} alt="" className="w-full h-full object-cover" />
                </span>
              ) : (
                <ChromeAvatar size="md" initials={apt.business.name[0] ?? "S"} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{apt.service.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {apt.business.name} · {formatDate(apt.startTime, { day: "numeric", month: "short" })}, {formatTime(apt.startTime)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:inline text-xs text-slate-400 tabular-nums">{relativeLabel(apt.startTime, now)}</span>
                <RescheduleButton
                  appointmentId={apt.id}
                  businessId={apt.businessId}
                  serviceId={apt.serviceId}
                  employeeId={apt.employeeId}
                  serviceName={apt.service.name}
                  businessName={apt.business.name}
                />
                <CancelButton appointmentId={apt.id} />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Quick repeat (from real completed history) ── */}
      {quickRepeat.length > 0 && (
        <section className="fade-rise fade-rise-d2 space-y-2.5">
          <Overline>Umów ponownie</Overline>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {quickRepeat.map((apt) => (
              <Link
                key={apt.serviceId}
                href={`/b/${apt.business.slug}/book?serviceId=${apt.serviceId}`}
                className="row-hover rounded-[18px] p-3.5 flex items-center gap-3 group"
                style={{ background: "rgba(255,255,255,0.80)", border: HAIRLINE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
              >
                {apt.business.logoUrl ? (
                  <span className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ border: HAIRLINE }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={apt.business.logoUrl} alt="" className="w-full h-full object-cover" />
                  </span>
                ) : (
                  <ChromeAvatar size="sm" initials={apt.business.name[0] ?? "S"} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{apt.service.name}</p>
                  <p className="text-xs text-slate-500 truncate">{apt.business.name}</p>
                </div>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent history ── */}
      {recentHistory.length > 0 && (
        <section className="fade-rise fade-rise-d3 space-y-2.5">
          <div className="flex items-center justify-between">
            <Overline>Ostatnie wizyty</Overline>
            <Link href="/customer/history" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
              Cała historia
            </Link>
          </div>
          <GlassCard className="overflow-hidden">
            {recentHistory.map((apt, i) => {
              const canReview = apt.status === AppointmentStatus.COMPLETED && !apt.review;
              return (
                <div key={apt.id} className="flex items-center gap-3 px-4 py-3" style={i > 0 ? { borderTop: HAIRLINE } : undefined}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{apt.service.name}</p>
                    <p className="text-xs text-slate-500 truncate tabular-nums">
                      {apt.business.name} · {formatDate(apt.startTime, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {canReview ? (
                    <Link
                      href={`/b/${apt.business.slug}?review=${apt.id}`}
                      className="btn-spring text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(203,213,225,0.55)", color: "#334155", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)" }}
                    >
                      Napisz opinię
                    </Link>
                  ) : (
                    <StatusBadge status={apt.status} />
                  )}
                </div>
              );
            })}
          </GlassCard>
        </section>
      )}

      {/* ── Quick links ── */}
      <section className="fade-rise fade-rise-d3 grid grid-cols-3 gap-2.5">
        {[
          { href: "/customer/favourites", label: "Ulubione", icon: <path d="M12 21s-8-4.5-8-10a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 11c0 5.5-8 10-8 10Z" /> },
          { href: "/customer/notifications", label: "Powiadomienia", icon: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></> },
          { href: "/customer/profile", label: "Mój profil", icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></> },
        ].map((l) => (
          <GlassLink key={l.href} href={l.href} className="flex-col !py-4 gap-1.5 text-slate-600">
            <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              {l.icon}
            </svg>
            <span className="text-xs font-medium">{l.label}</span>
          </GlassLink>
        ))}
      </section>
    </div>
  );
}
