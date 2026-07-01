"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, Service, Employee, User } from "@prisma/client";

type AppointmentWithRelations = Appointment & {
  service: Service;
  employee: Employee | null;
  customer: User;
};

type Props = {
  appointments: AppointmentWithRelations[];
  weekStart: string;
};

const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"];
const DAYS_FULL_PL = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Oczekuje", className: "bg-warning-50 text-warning-600" },
  CONFIRMED: { label: "Potwierdzona", className: "bg-success-50 text-success-600" },
  IN_PROGRESS: { label: "W trakcie", className: "bg-gray-50 text-gray-900" },
  COMPLETED: { label: "Zakończona", className: "bg-gray-100 text-gray-700" },
  CANCELLED_CUSTOMER: { label: "Odwołana", className: "bg-danger-50 text-danger-600" },
  CANCELLED_BUSINESS: { label: "Odwołana", className: "bg-danger-50 text-danger-600" },
  NO_SHOW: { label: "No-show", className: "bg-danger-50 text-danger-600" },
  RESCHEDULED: { label: "Przełożona", className: "bg-gray-100 text-gray-700" },
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.toLocaleDateString("pl-PL", opts)} ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString("pl-PL", opts)} – ${end.toLocaleDateString("pl-PL", opts)} ${end.getFullYear()}`;
}

export function CalendarClient({ appointments, weekStart: weekStartIso }: Props) {
  const router = useRouter();
  const weekStart = new Date(weekStartIso);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);

  // Build 7 day dates
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function navigateWeek(direction: -1 | 1) {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    router.push(`/business/calendar?week=${newStart.toISOString().split("T")[0]}`);
  }

  function goToToday() {
    router.push("/business/calendar");
  }

  function getAppointmentsForDayHour(dayDate: Date, hour: number) {
    return appointments.filter((apt) => {
      const start = new Date(apt.startTime);
      return (
        start.getFullYear() === dayDate.getFullYear() &&
        start.getMonth() === dayDate.getMonth() &&
        start.getDate() === dayDate.getDate() &&
        start.getHours() === hour
      );
    });
  }

  function getTopOffset(apt: AppointmentWithRelations): number {
    const start = new Date(apt.startTime);
    return (start.getMinutes() / 60) * 56; // 56px per hour row
  }

  function getHeight(apt: AppointmentWithRelations): number {
    return Math.max((apt.duration / 60) * 56, 28);
  }

  const isCurrentWeek =
    getWeekStart(new Date()).toDateString() === weekStart.toDateString();

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kalendarz</h1>
          <p className="text-sm text-gray-700 mt-0.5">{formatWeekLabel(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              className="border border-gray-200 text-gray-900 hover:bg-gray-50 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
            >
              Dziś
            </button>
          )}
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {/* Day headers */}
        <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div className="border-r border-gray-100" />
          {days.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`py-3 text-center border-r border-gray-100 last:border-r-0 ${
                  i >= 5 ? "bg-gray-50" : ""
                }`}
              >
                <p className={`text-xs font-medium ${isToday ? "text-gray-900" : "text-gray-700"}`}>
                  {DAYS_PL[i]}
                </p>
                <p
                  className={`text-sm font-bold mt-0.5 ${
                    isToday
                      ? "w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center mx-auto"
                      : "text-gray-900"
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
          <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            {/* Time column */}
            <div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-14 border-b border-gray-100 border-r border-gray-100 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-2xs text-gray-700 font-mono">{hour}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, dayIdx) => (
              <div key={dayIdx} className={`border-r border-gray-100 last:border-r-0 relative ${dayIdx >= 5 ? "bg-gray-50/50" : ""}`}>
                {HOURS.map((hour) => {
                  const slotApts = getAppointmentsForDayHour(day, hour);
                  return (
                    <div
                      key={hour}
                      className="h-14 border-b border-gray-100 relative cursor-pointer hover:bg-gray-50/20 transition-colors"
                      onClick={() => {
                        if (slotApts.length === 0) {
                          alert(`Nowa wizyta: ${DAYS_FULL_PL[dayIdx]} ${day.getDate()}, ${hour}:00`);
                        }
                      }}
                    >
                      {slotApts.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(apt);
                          }}
                          className="absolute inset-x-0.5 rounded-lg text-left overflow-hidden group hover:opacity-90 transition-opacity"
                          style={{
                            top: getTopOffset(apt),
                            height: getHeight(apt),
                            backgroundColor: apt.employee?.color ?? "#7c3aed",
                          }}
                        >
                          <div className="px-1.5 py-1 h-full overflow-hidden">
                            <p className="text-2xs font-semibold text-white leading-tight truncate">
                              {apt.customer.firstName} {apt.customer.lastName}
                            </p>
                            {getHeight(apt) > 40 && (
                              <p className="text-2xs text-white/80 truncate leading-tight mt-0.5">
                                {apt.service.name}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment detail popover */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setSelectedAppointment(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-soft-xl w-full max-w-sm animate-scale-in">
            <div
              className="h-1.5 rounded-t-2xl"
              style={{ backgroundColor: selectedAppointment.employee?.color ?? "#7c3aed" }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {selectedAppointment.customer.firstName} {selectedAppointment.customer.lastName}
                  </h3>
                  <p className="text-sm text-gray-700 mt-0.5">{selectedAppointment.service.name}</p>
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <DetailRow label="Czas" value={`${new Date(selectedAppointment.startTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} – ${new Date(selectedAppointment.endTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} (${selectedAppointment.duration} min)`} />
                <DetailRow label="Cena" value={`${selectedAppointment.price.toFixed(0)} PLN`} />
                {selectedAppointment.employee && (
                  <DetailRow label="Pracownik" value={`${selectedAppointment.employee.firstName} ${selectedAppointment.employee.lastName}`} />
                )}
                {selectedAppointment.customer.phone && (
                  <DetailRow label="Telefon" value={selectedAppointment.customer.phone} />
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Status</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    STATUS_LABELS[selectedAppointment.status]?.className ?? "bg-gray-100 text-gray-700"
                  }`}>
                    {STATUS_LABELS[selectedAppointment.status]?.label ?? selectedAppointment.status}
                  </span>
                </div>
                {selectedAppointment.customerNotes && (
                  <DetailRow label="Notatki" value={selectedAppointment.customerNotes} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
