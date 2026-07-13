export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth-user";
import { formatDate, formatTime, formatCurrency, formatDuration } from "@/lib/utils";
import { AppointmentStatus } from "@prisma/client";
import { cancelAppointment } from "@/lib/actions/appointments";
import RescheduleButton from "./reschedule-button";
import {
  PageHeader,
  GlassCard,
  EmptyState,
  StatusBadge,
  InkLink,
  ChromeAvatar,
  INK_GRADIENT,
} from "@/components/ui/glass";
import { cn } from "@/lib/utils";

function CancelButton({ appointmentId }: { appointmentId: string }) {
  async function handleCancel() {
    "use server";
    await cancelAppointment(appointmentId);
  }
  return (
    <form action={handleCancel}>
      <button
        type="submit"
        className="btn-spring text-xs font-semibold px-3 py-1.5 rounded-lg"
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

type SearchParams = Promise<{ tab?: string }>;

export default async function CustomerDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab } = await searchParams;
  const activeTab = tab === "history" ? "history" : "upcoming";
  const now = new Date();

  const dbUser = await getOrCreateDbUser();

  const upcomingWhere = {
    customerId: dbUser.id,
    startTime: { gte: now },
    status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] as AppointmentStatus[] },
  };

  const historyWhere = {
    customerId: dbUser.id,
    OR: [
      { startTime: { lt: now } },
      { status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED_CUSTOMER, AppointmentStatus.CANCELLED_BUSINESS, AppointmentStatus.NO_SHOW, AppointmentStatus.RESCHEDULED] as AppointmentStatus[] } },
    ],
  };

  const appointments = await prisma.appointment.findMany({
    where: activeTab === "upcoming" ? upcomingWhere : historyWhere,
    include: {
      business: { select: { name: true, slug: true, logoUrl: true } },
      service: { select: { name: true, duration: true } },
      employee: { select: { firstName: true, lastName: true } },
      review: { select: { id: true } },
    },
    orderBy: { startTime: activeTab === "upcoming" ? "asc" : "desc" },
  });

  const tabs = [
    { key: "upcoming", label: "Nadchodzące" },
    { key: "history", label: "Historia" },
  ] as const;

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Moje rezerwacje"
        subtitle={<>Cześć, {dbUser.firstName}. Zarządzaj swoimi wizytami.</>}
      />

      {/* Tabs — glass segmented, ink active */}
      <div
        className="fade-rise fade-rise-d1 inline-flex items-center gap-0.5 p-0.5 rounded-xl"
        style={{
          background: "rgba(255,255,255,0.65)",
          border: "1px solid rgba(203,213,225,0.45)",
          boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.90)",
        }}
        role="group"
        aria-label="Widok rezerwacji"
      >
        {tabs.map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <Link
              key={key}
              href={`/customer/dashboard?tab=${key}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-colors",
                active ? "text-white" : "text-slate-500 hover:text-slate-800"
              )}
              style={active ? { background: INK_GRADIENT, boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" } : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {appointments.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d2">
          {activeTab === "upcoming" ? (
            <EmptyState
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              }
              title="Brak nadchodzących wizyt"
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
          ) : (
            <EmptyState
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              }
              title="Brak historii wizyt"
              body="Zakończone i anulowane wizyty pojawią się tutaj."
            />
          )}
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d2 space-y-2.5">
          {appointments.map((apt) => {
            const isUpcoming = activeTab === "upcoming";
            const canCancel = apt.status === AppointmentStatus.PENDING || apt.status === AppointmentStatus.CONFIRMED;
            const canReview = apt.status === AppointmentStatus.COMPLETED && !apt.review;

            return (
              <div
                key={apt.id}
                className="rounded-[20px] p-4 flex gap-4"
                style={{
                  background: "rgba(255,255,255,0.80)",
                  border: "1px solid rgba(203,213,225,0.45)",
                  boxShadow: "0 0 0 0.5px rgba(203,213,225,0.22), 0 1px 2px rgba(0,0,0,0.02), 0 4px 14px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
                }}
              >
                {apt.business.logoUrl ? (
                  <span className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(203,213,225,0.45)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={apt.business.logoUrl} alt="" className="w-full h-full object-cover" />
                  </span>
                ) : (
                  <ChromeAvatar size="lg" initials={apt.business.name[0] ?? "S"} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{apt.service.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {apt.business.name}
                        {apt.employee && ` · ${apt.employee.firstName} ${apt.employee.lastName}`}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 tabular-nums">
                    <span>{formatDate(apt.startTime, { weekday: "short", day: "numeric", month: "short" })}, {formatTime(apt.startTime)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDuration(apt.duration)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-slate-900">{formatCurrency(apt.price)}</span>
                  </div>
                  {((isUpcoming && canCancel) || canReview) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {isUpcoming && canCancel && (
                        <RescheduleButton
                          appointmentId={apt.id}
                          businessId={apt.businessId}
                          serviceId={apt.serviceId}
                          employeeId={apt.employeeId}
                          serviceName={apt.service.name}
                          businessName={apt.business.name}
                        />
                      )}
                      {isUpcoming && canCancel && <CancelButton appointmentId={apt.id} />}
                      {canReview && (
                        <Link
                          href={`/b/${apt.business.slug}?review=${apt.id}`}
                          className="btn-spring text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{
                            background: "rgba(255,255,255,0.72)",
                            border: "1px solid rgba(203,213,225,0.55)",
                            color: "#334155",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)",
                          }}
                        >
                          Napisz opinię
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
