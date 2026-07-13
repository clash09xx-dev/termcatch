"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Appointment, Service, Employee, User } from "@prisma/client";
import {
  confirmAppointment,
  declineAppointment,
  completeAppointment,
  markNoShow,
} from "@/lib/actions/appointments";
import { GlassModal, ModalInkButton, ModalGlassButton } from "@/components/ui/glass-modal";
import { NewAppointmentSheet } from "@/components/business/new-appointment-sheet";
import { weekSlide, useReducedMotion } from "@/lib/motion";
import { STATUS_TINT } from "@/components/ui/glass/tokens";

type AppointmentWithRelations = Appointment & {
  service: Service;
  employee: Employee | null;
  customer: User;
};

type ServiceOption = {
  id: string;
  name: string;
  duration: number;
  price: number;
  discountedPrice: number | null;
};

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  color: string;
};

type Props = {
  appointments: AppointmentWithRelations[];
  weekStart: string;
  businessId: string;
  services: ServiceOption[];
  employees: EmployeeOption[];
  openNewOnLoad?: boolean;
};

const DAYS_PL = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20

// Status — glass tints from the shared Machined Silver system
const STATUS_META = STATUS_TINT as Record<string, { label: string; style: React.CSSProperties; rail: string }>;

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

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarClient({
  appointments,
  weekStart: weekStartIso,
  businessId,
  services,
  employees,
  openNewOnLoad = false,
}: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const weekStart = new Date(weekStartIso);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(null);
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [slideDir, setSlideDir] = useState(0);

  // New-appointment sheet
  const [sheetOpen, setSheetOpen] = useState(openNewOnLoad);
  const [prefill, setPrefill] = useState<{ date?: string; time?: string }>({});

  function runAction(action: (id: string) => Promise<void>) {
    if (!selectedAppointment) return;
    const id = selectedAppointment.id;
    setActionError("");
    startTransition(async () => {
      try {
        await action(id);
        setSelectedAppointment(null);
        router.refresh();
      } catch (err) {
        const e = err as { message?: string };
        setActionError(e.message ?? "Wystąpił błąd. Spróbuj ponownie.");
      }
    });
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function navigateWeek(direction: -1 | 1) {
    setSlideDir(direction);
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    router.push(`/business/calendar?week=${newStart.toISOString().split("T")[0]}`);
  }

  function goToToday() {
    setSlideDir(0);
    router.push("/business/calendar");
  }

  function openNewAt(day: Date, hour: number) {
    setPrefill({ date: toLocalDateString(day), time: `${String(hour).padStart(2, "0")}:00` });
    setSheetOpen(true);
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
    return (start.getMinutes() / 60) * 56;
  }

  function getHeight(apt: AppointmentWithRelations): number {
    return Math.max((apt.duration / 60) * 56, 28);
  }

  const isCurrentWeek =
    getWeekStart(new Date()).toDateString() === weekStart.toDateString();

  const statusMeta = selectedAppointment
    ? STATUS_META[selectedAppointment.status] ?? STATUS_META.RESCHEDULED
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
            Kalendarz
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 tabular-nums">{formatWeekLabel(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              className="btn-spring rounded-xl px-3 py-2 text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: "1px solid rgba(203,213,225,0.55)",
                color: "#334155",
                boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.90)",
              }}
            >
              Dziś
            </button>
          )}
          <button
            onClick={() => navigateWeek(-1)}
            aria-label="Poprzedni tydzień"
            className="btn-spring p-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(203,213,225,0.55)",
              color: "#475569",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateWeek(1)}
            aria-label="Następny tydzień"
            className="btn-spring p-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(203,213,225,0.55)",
              color: "#475569",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)",
            }}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid — slides on week change */}
      <div
        className="rounded-2xl overflow-hidden overflow-x-auto"
        style={{
          background: "rgba(255,255,255,0.80)",
          border: "1px solid rgba(203,213,225,0.45)",
          boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 2px rgba(0,0,0,0.02), 0 6px 20px rgba(100,116,139,0.07), inset 0 1px 0 rgba(255,255,255,0.92)",
        }}
      >
        <AnimatePresence mode="wait" custom={slideDir} initial={false}>
          <motion.div
            key={weekStartIso}
            custom={slideDir}
            variants={reduceMotion ? undefined : weekSlide}
            initial="enter"
            animate="center"
            exit="exit"
            className="min-w-[720px]"
          >
            {/* Day headers */}
            <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: "1px solid rgba(203,213,225,0.30)" }}>
              <div style={{ borderRight: "1px solid rgba(203,213,225,0.25)" }} />
              {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className="py-3 text-center last:border-r-0"
                    style={{
                      borderRight: "1px solid rgba(203,213,225,0.25)",
                      background: i >= 5 ? "rgba(203,213,225,0.10)" : undefined,
                    }}
                  >
                    <p className={`text-xs font-medium ${isToday ? "text-slate-900" : "text-slate-500"}`}>
                      {DAYS_PL[i]}
                    </p>
                    <p
                      className={`text-sm font-bold mt-0.5 tabular-nums ${
                        isToday
                          ? "w-7 h-7 text-white rounded-full flex items-center justify-center mx-auto"
                          : "text-slate-800"
                      }`}
                      style={isToday ? { background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" } : undefined}
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
                      className="h-14 flex items-start justify-end pr-2 pt-1"
                      style={{ borderBottom: "1px solid rgba(203,213,225,0.22)", borderRight: "1px solid rgba(203,213,225,0.25)" }}
                    >
                      <span className="text-[10px] text-slate-400 tabular-nums">{hour}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map((day, dayIdx) => {
                  const isTodayCol = day.toDateString() === new Date().toDateString();
                  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
                  const showNowLine = isTodayCol && nowMin >= 8 * 60 && nowMin <= 21 * 60;
                  return (
                  <div
                    key={dayIdx}
                    className="relative last:border-r-0"
                    style={{
                      borderRight: "1px solid rgba(203,213,225,0.25)",
                      background: dayIdx >= 5 ? "rgba(203,213,225,0.08)" : undefined,
                    }}
                  >
                    {/* Now line — chrome */}
                    {showNowLine && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none"
                        style={{ top: ((nowMin - 8 * 60) / 60) * 56 }}
                        aria-hidden="true"
                      >
                        <div className="relative h-px" style={{ background: "linear-gradient(90deg, #64748B, rgba(100,116,139,0.35))" }}>
                          <span
                            className="absolute -left-1 -top-[3px] w-[7px] h-[7px] rounded-full"
                            style={{ background: "#475569", boxShadow: "0 0 0 2px rgba(255,255,255,0.90)" }}
                          />
                        </div>
                      </div>
                    )}
                    {HOURS.map((hour) => {
                      const slotApts = getAppointmentsForDayHour(day, hour);
                      return (
                        <div
                          key={hour}
                          className="h-14 relative group/slot cursor-pointer"
                          style={{ borderBottom: "1px solid rgba(203,213,225,0.22)" }}
                          onClick={() => openNewAt(day, hour)}
                          title={`Nowa wizyta — ${DAYS_PL[dayIdx]} ${hour}:00`}
                        >
                          {/* Empty-slot affordance */}
                          <span
                            className="absolute inset-1 rounded-lg opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                            style={{ background: "rgba(203,213,225,0.16)", border: "1px dashed rgba(148,163,184,0.40)" }}
                            aria-hidden="true"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>

                          {slotApts.map((apt) => {
                            const meta = STATUS_META[apt.status] ?? STATUS_META.RESCHEDULED;
                            const isMuted = ["COMPLETED", "NO_SHOW", "CANCELLED_BUSINESS", "CANCELLED_CUSTOMER"].includes(apt.status);
                            return (
                              <button
                                key={apt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionError("");
                                  setSelectedAppointment(apt);
                                }}
                                className={`card-hover-lift absolute inset-x-1 rounded-lg text-left overflow-hidden z-10 ${isMuted ? "opacity-65" : ""}`}
                                style={{
                                  top: getTopOffset(apt),
                                  height: getHeight(apt),
                                  background: "rgba(255,255,255,0.92)",
                                  border: "1px solid rgba(203,213,225,0.55)",
                                  borderLeft: `3px solid ${apt.employee?.color ?? "#64748B"}`,
                                  boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(100,116,139,0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
                                }}
                              >
                                <div className="px-1.5 py-1 h-full overflow-hidden">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{ background: meta.rail }}
                                      aria-hidden="true"
                                    />
                                    <p className="text-[10px] font-semibold text-slate-900 leading-tight truncate">
                                      {apt.customer.firstName} {apt.customer.lastName}
                                    </p>
                                  </div>
                                  {getHeight(apt) > 40 && (
                                    <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5 pl-2.5">
                                      {apt.service.name}
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Appointment detail — GlassModal */}
      <GlassModal
        open={selectedAppointment !== null}
        onOpenChange={(o) => { if (!o) setSelectedAppointment(null); }}
        title={selectedAppointment ? `${selectedAppointment.customer.firstName} ${selectedAppointment.customer.lastName}` : ""}
        description={selectedAppointment?.service.name}
        accent={selectedAppointment?.employee?.color ?? "#334155"}
      >
        {selectedAppointment && (
          <>
            <div className="space-y-2.5 mt-2">
              <DetailRow
                label="Czas"
                value={`${new Date(selectedAppointment.startTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} – ${new Date(selectedAppointment.endTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} (${selectedAppointment.duration} min)`}
              />
              <DetailRow label="Cena" value={`${selectedAppointment.price.toFixed(0)} zł`} />
              {selectedAppointment.employee && (
                <DetailRow
                  label="Pracownik"
                  value={`${selectedAppointment.employee.firstName} ${selectedAppointment.employee.lastName}`}
                />
              )}
              {selectedAppointment.customer.phone && (
                <DetailRow label="Telefon" value={selectedAppointment.customer.phone} />
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={statusMeta?.style}
                >
                  {statusMeta?.label ?? selectedAppointment.status}
                </span>
              </div>
              {selectedAppointment.customerNotes && (
                <DetailRow label="Notatki" value={selectedAppointment.customerNotes} />
              )}
            </div>

            {actionError && (
              <div
                role="alert"
                className="mt-4 px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}
              >
                <p className="text-xs font-medium" style={{ color: "#BE123C" }}>{actionError}</p>
              </div>
            )}

            {(selectedAppointment.status === "PENDING" ||
              selectedAppointment.status === "CONFIRMED" ||
              selectedAppointment.status === "IN_PROGRESS") && (
              <div className="mt-5 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid rgba(203,213,225,0.30)" }}>
                {selectedAppointment.status === "PENDING" && (
                  <ModalInkButton onClick={() => runAction(confirmAppointment)} disabled={isPending}>
                    Potwierdź
                  </ModalInkButton>
                )}
                {(selectedAppointment.status === "CONFIRMED" ||
                  selectedAppointment.status === "IN_PROGRESS") && (
                  <ModalInkButton onClick={() => runAction(completeAppointment)} disabled={isPending}>
                    Zakończ
                  </ModalInkButton>
                )}
                {(selectedAppointment.status === "PENDING" ||
                  selectedAppointment.status === "CONFIRMED") && (
                  <>
                    <ModalGlassButton onClick={() => runAction(markNoShow)} disabled={isPending}>
                      No-show
                    </ModalGlassButton>
                    <ModalGlassButton onClick={() => runAction(declineAppointment)} disabled={isPending}>
                      Odwołaj
                    </ModalGlassButton>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </GlassModal>

      {/* New appointment sheet */}
      <NewAppointmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        businessId={businessId}
        services={services}
        employees={employees}
        prefillDate={prefill.date}
        prefillTime={prefill.time}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right max-w-[60%] tabular-nums">{value}</span>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  );
}
