export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth-user";
import { formatDate, formatTime, formatCurrency, formatDuration } from "@/lib/utils";
import { AppointmentStatus } from "@prisma/client";
import { cancelAppointment } from "@/lib/actions/appointments";
import RescheduleButton from "./reschedule-button";

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<AppointmentStatus, { label: string; className: string }> = {
    PENDING: { label: "Oczekuje", className: "bg-amber-50 text-amber-700 border border-amber-200" },
    CONFIRMED: { label: "Potwierdzona", className: "bg-green-50 text-green-700 border border-green-200" },
    IN_PROGRESS: { label: "W trakcie", className: "bg-blue-50 text-blue-700 border border-blue-200" },
    COMPLETED: { label: "Zakończona", className: "bg-gray-100 text-gray-600 border border-gray-200" },
    CANCELLED_CUSTOMER: { label: "Anulowana", className: "bg-red-50 text-red-600 border border-red-200" },
    CANCELLED_BUSINESS: { label: "Anulowana przez salon", className: "bg-red-50 text-red-600 border border-red-200" },
    NO_SHOW: { label: "Nieobecność", className: "bg-gray-100 text-gray-500 border border-gray-200" },
    RESCHEDULED: { label: "Przełożona", className: "bg-gray-100 text-gray-600 border border-gray-200" },
  };
  const { label, className } = map[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function CancelButton({ appointmentId }: { appointmentId: string }) {
  async function handleCancel() {
    "use server";
    await cancelAppointment(appointmentId);
  }
  return (
    <form action={handleCancel}>
      <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors">
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Moje rezerwacje</h1>
        <p className="text-sm text-gray-500 mt-1">Cześć, {dbUser.firstName}. Zarządzaj swoimi wizytami.</p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/customer/dashboard?tab=${key}`}
            className={activeTab === key
              ? "px-4 py-1.5 text-sm font-medium rounded-lg bg-white text-gray-900 shadow-sm transition-all"
              : "px-4 py-1.5 text-sm font-medium rounded-lg text-gray-500 hover:text-gray-700 transition-all"}
          >
            {label}
          </Link>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          </div>
          {activeTab === "upcoming" ? (
            <>
              <p className="text-sm font-medium text-gray-700 mb-1">Brak nadchodzących wizyt</p>
              <p className="text-xs text-gray-400 mb-5">Znajdź salon i zarezerwuj wizytę.</p>
              <Link href="/search" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                Szukaj salonu
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-500">Brak historii wizyt.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const isUpcoming = activeTab === "upcoming";
            const canCancel = apt.status === AppointmentStatus.PENDING || apt.status === AppointmentStatus.CONFIRMED;
            const canReview = apt.status === AppointmentStatus.COMPLETED && !apt.review;

            return (
              <div key={apt.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-base font-semibold text-gray-600 flex-shrink-0 overflow-hidden">
                  {apt.business.logoUrl
                    ? <img src={apt.business.logoUrl} alt="" className="w-full h-full object-cover" />
                    : apt.business.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{apt.service.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {apt.business.name}
                        {apt.employee && ` · ${apt.employee.firstName} ${apt.employee.lastName}`}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{formatDate(apt.startTime, { weekday: "short", day: "numeric", month: "short" })}, {formatTime(apt.startTime)}</span>
                    <span>·</span>
                    <span>{formatDuration(apt.duration)}</span>
                    <span>·</span>
                    <span className="font-medium text-gray-700">{formatCurrency(apt.price)}</span>
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
                        <Link href={`/b/${apt.business.slug}?review=${apt.id}`} className="text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors">
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
