import Link from "next/link";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, formatTime, formatCurrency, formatDuration } from "@/lib/utils";
import { AppointmentStatus } from "@prisma/client";
import { cancelAppointment } from "@/lib/actions/appointments";

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<
    AppointmentStatus,
    { label: string; className: string }
  > = {
    PENDING: {
      label: "Oczekuje",
      className:
        "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    },
    CONFIRMED: {
      label: "Potwierdzona",
      className:
        "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    },
    IN_PROGRESS: {
      label: "W trakcie",
      className:
        "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    },
    COMPLETED: {
      label: "Zakończona",
      className:
        "bg-surface-100 text-surface-600 border border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700",
    },
    CANCELLED_CUSTOMER: {
      label: "Anulowana",
      className:
        "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    },
    CANCELLED_BUSINESS: {
      label: "Anulowana przez salon",
      className:
        "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    },
    NO_SHOW: {
      label: "Nieobecność",
      className:
        "bg-surface-100 text-surface-500 border border-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:border-surface-700",
    },
    RESCHEDULED: {
      label: "Przełożona",
      className:
        "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
    },
  };

  const { label, className } = map[status] ?? {
    label: status,
    className: "bg-surface-100 text-surface-600",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// ─── Cancel Button ────────────────────────────────────────────

function CancelButton({ appointmentId }: { appointmentId: string }) {
  async function handleCancel() {
    "use server";
    await cancelAppointment(appointmentId);
  }

  return (
    <form action={handleCancel}>
      <button
        type="submit"
        className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors"
      >
        Anuluj
      </button>
    </form>
  );
}

// ─── Page ────────────────────────────────────────────────────

type SearchParams = Promise<{ tab?: string }>;

export default async function CustomerDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;
  const activeTab = tab === "history" ? "history" : "upcoming";
  const now = new Date();

  // Fetch the DB user record
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/login");

  // Build where clause based on tab
  const upcomingWhere = {
    customerId: dbUser.id,
    startTime: { gte: now },
    status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] as AppointmentStatus[] },
  };

  const historyWhere = {
    customerId: dbUser.id,
    OR: [
      { startTime: { lt: now } },
      {
        status: {
          in: [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED_CUSTOMER,
            AppointmentStatus.CANCELLED_BUSINESS,
            AppointmentStatus.NO_SHOW,
            AppointmentStatus.RESCHEDULED,
          ] as AppointmentStatus[],
        },
      },
    ],
  };

  const appointments = await prisma.appointment.findMany({
    where: activeTab === "upcoming" ? upcomingWhere : historyWhere,
    include: {
      business: {
        select: { name: true, slug: true, logoUrl: true, category: true },
      },
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
    <div className="space-y-6 max-w-3xl animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-surface-900 dark:text-white">
          Moje rezerwacje
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Zarządzaj swoimi wizytami
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl w-fit">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/dashboard?tab=${key}`}
            className={
              activeTab === key
                ? "px-4 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm transition-all"
                : "px-4 py-1.5 text-sm font-medium rounded-lg text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-all"
            }
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Appointment list */}
      {appointments.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-4">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-surface-400"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          </div>
          {activeTab === "upcoming" ? (
            <>
              <p className="text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                Brak nadchodzących wizyt
              </p>
              <p className="text-xs text-surface-400 mb-5">
                Znajdź salon i zarezerwuj wizytę.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Szukaj salonu
              </Link>
            </>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Brak historii wizyt.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const isUpcoming = activeTab === "upcoming";
            const canCancel =
              apt.status === AppointmentStatus.PENDING ||
              apt.status === AppointmentStatus.CONFIRMED;
            const canReview =
              apt.status === AppointmentStatus.COMPLETED && !apt.review;

            return (
              <div
                key={apt.id}
                className="card p-4 flex gap-4"
              >
                {/* Business avatar */}
                <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-base font-semibold text-brand-700 dark:text-brand-300 flex-shrink-0 overflow-hidden">
                  {apt.business.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={apt.business.logoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    apt.business.name[0]
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                        {apt.service.name}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate">
                        {apt.business.name}
                        {apt.employee &&
                          ` · ${apt.employee.firstName} ${apt.employee.lastName}`}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>

                  {/* Date / Duration / Price row */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-surface-500 dark:text-surface-400">
                    <span className="flex items-center gap-1">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                        <line x1="16" x2="16" y1="2" y2="6" />
                        <line x1="8" x2="8" y1="2" y2="6" />
                        <line x1="3" x2="21" y1="10" y2="10" />
                      </svg>
                      {formatDate(apt.startTime, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {", "}
                      {formatTime(apt.startTime)}
                    </span>
                    <span>·</span>
                    <span>{formatDuration(apt.duration)}</span>
                    <span>·</span>
                    <span className="font-medium text-surface-700 dark:text-surface-300">
                      {formatCurrency(apt.price)}
                    </span>
                  </div>

                  {/* Actions */}
                  {(isUpcoming && canCancel) || canReview ? (
                    <div className="flex items-center gap-2 mt-3">
                      {isUpcoming && canCancel && (
                        <CancelButton appointmentId={apt.id} />
                      )}
                      {canReview && (
                        <Link
                          href={`/business/${apt.business.slug}?review=${apt.id}`}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 border border-brand-200 hover:border-brand-300 dark:border-brand-800 dark:hover:border-brand-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Napisz opinię
                        </Link>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
