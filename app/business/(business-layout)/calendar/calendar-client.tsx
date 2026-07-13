"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, Service, Employee, User, WorkingHours } from "@prisma/client";
import {
  confirmAppointment, declineAppointment, completeAppointment, markNoShow,
} from "@/lib/actions/appointments";
import { GlassModal, ModalInkButton, ModalGlassButton } from "@/components/ui/glass-modal";
import { NewAppointmentSheet } from "@/components/business/new-appointment-sheet";
import { Segmented } from "@/components/ui/segmented";
import { STATUS_TINT, CHIP, HAIRLINE, type StatusKey } from "@/components/ui/glass/tokens";
import { cn } from "@/lib/utils";

type ApptR = Appointment & { service: Service; employee: Employee | null; customer: User };
type Svc = { id: string; name: string; duration: number; price: number; discountedPrice: number | null };
type Emp = { id: string; firstName: string; lastName: string; color: string };

type Props = {
  appointments: ApptR[];
  weekStart: string;
  focusDate: string;
  businessId: string;
  services: Svc[];
  employees: Emp[];
  workingHours: WorkingHours[];
  openNewOnLoad?: boolean;
  prefillDate?: string;
  prefillTime?: string;
};

const HOUR_H = 58;
const DOW = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
const D_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const D_FULL = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const MON = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const STATUS_META = STATUS_TINT as Record<string, { label: string; style: React.CSSProperties; rail: string }>;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function localMin(d: Date): number { return d.getHours() * 60 + d.getMinutes(); }
function hm(min: number): string { return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`; }
function whToMin(t: string): number { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); }

export function CalendarClient(props: Props) {
  const { appointments, businessId, services, employees, workingHours } = props;
  const router = useRouter();
  const weekStart = useMemo(() => new Date(props.weekStart), [props.weekStart]);

  const [cursor, setCursor] = useState(() => new Date(props.focusDate));
  const [view, setView] = useState<"day" | "week">("day");
  const [empFilter, setEmpFilter] = useState<string>("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selected, setSelected] = useState<ApptR | null>(null);
  const [actionError, setActionError] = useState("");
  const [isPending, setPending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(!!props.openNewOnLoad);
  const [prefill, setPrefill] = useState<{ date?: string; time?: string }>({ date: props.prefillDate, time: props.prefillTime });

  const now = new Date();
  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); return d; }, [weekStart]);
  const inWeek = (d: Date) => d >= weekStart && d < weekEnd;
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);

  function windowFor(date: Date): [number, number] | null {
    const wh = workingHours.find((w) => w.dayOfWeek === DOW[date.getDay()]);
    if (!wh || !wh.isOpen) return null;
    return [whToMin(wh.openTime), whToMin(wh.closeTime)];
  }

  function filtered(list: ApptR[]): ApptR[] {
    return list.filter((a) => {
      if (empFilter !== "all" && a.employeeId !== empFilter) return false;
      if (pendingOnly && a.status !== "PENDING") return false;
      return true;
    });
  }
  const apptsForDay = (date: Date) => filtered(appointments.filter((a) => sameDay(new Date(a.startTime), date)));

  function goDay(delta: number) {
    const d = new Date(cursor); d.setDate(d.getDate() + delta);
    if (inWeek(d)) setCursor(d);
    else router.push(`/business/calendar?date=${ymd(d)}`);
  }
  function goWeek(delta: number) {
    const d = new Date(weekStart); d.setDate(d.getDate() + delta * 7);
    router.push(`/business/calendar?week=${ymd(d)}`);
  }
  function goToday() {
    if (inWeek(now)) setCursor(new Date());
    else router.push("/business/calendar");
  }
  function pickDay(d: Date) {
    if (inWeek(d)) { setCursor(d); setView("day"); }
    else router.push(`/business/calendar?date=${ymd(d)}`);
  }

  function openNewAt(date: Date, min: number, employeeId?: string) {
    setPrefill({ date: ymd(date), time: hm(Math.max(0, Math.round(min / 15) * 15)) });
    setSheetOpen(true);
  }
  function runAction(action: (id: string) => Promise<void>) {
    if (!selected) return;
    const id = selected.id;
    setActionError(""); setPending(true);
    action(id).then(() => { setSelected(null); router.refresh(); })
      .catch((e: { message?: string }) => setActionError(e.message ?? "Wystąpił błąd."))
      .finally(() => setPending(false));
  }

  // Lanes for the day view (desktop). Columns = employees (when unfiltered) else single.
  const laneEmps: (Emp | null)[] = empFilter !== "all"
    ? [employees.find((e) => e.id === empFilter) ?? null]
    : employees.length > 0 ? employees : [null];

  const dayWin = windowFor(cursor) ?? [8 * 60, 20 * 60];
  const [openMin, closeMin] = dayWin;
  const isClosedToday = windowFor(cursor) === null;
  const gridHours = Array.from({ length: Math.ceil((closeMin - openMin) / 60) + 1 }, (_, i) => openMin + i * 60).filter((m) => m <= closeMin);
  const dayAppts = apptsForDay(cursor);

  function blockStyle(a: ApptR) {
    const s = localMin(new Date(a.startTime));
    return { top: ((s - openMin) / 60) * HOUR_H, height: Math.max((a.duration / 60) * HOUR_H - 3, 26) };
  }

  const dateLabel = view === "day"
    ? `${D_FULL[cursor.getDay()]}, ${cursor.getDate()} ${MON[cursor.getMonth()]}`
    : `${weekDays[0].getDate()} ${weekDays[0].getMonth() !== weekDays[6].getMonth() ? MON[weekDays[0].getMonth()] + " " : ""}– ${weekDays[6].getDate()} ${MON[weekDays[6].getMonth()]}`;

  const statusMeta = selected ? STATUS_META[selected.status] ?? STATUS_META.RESCHEDULED : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div className="fade-rise flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => (view === "day" ? goDay(-1) : goWeek(-1))} aria-label="Wstecz" className="btn-spring p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(203,213,225,0.55)", color: "#475569" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button onClick={goToday} className="btn-spring px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(203,213,225,0.55)", color: "#334155" }}>Dziś</button>
          <button onClick={() => (view === "day" ? goDay(1) : goWeek(1))} aria-label="Dalej" className="btn-spring p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(203,213,225,0.55)", color: "#475569" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
        <p className="text-[15px] font-semibold text-slate-900 capitalize tabular-nums">{dateLabel}</p>
        <div className="ml-auto flex items-center gap-2">
          {employees.length > 0 && view === "day" && (
            <Segmented
              size="sm" ariaLabel="Filtr pracownika" idBase="cal-emp"
              value={empFilter} onChange={setEmpFilter}
              options={[{ value: "all", label: "Wszyscy" }, ...employees.map((e) => ({ value: e.id, label: e.firstName }))]}
            />
          )}
          <button
            onClick={() => setPendingOnly((v) => !v)}
            aria-pressed={pendingOnly}
            className="btn-spring px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={pendingOnly
              ? { background: STATUS_TINT.PENDING.style.background, border: STATUS_TINT.PENDING.style.border, color: STATUS_TINT.PENDING.style.color }
              : { background: "rgba(255,255,255,0.7)", border: "1px solid rgba(203,213,225,0.55)", color: "#64748B" }}
          >
            Do potwierdzenia
          </button>
          <Segmented size="sm" ariaLabel="Widok" idBase="cal-view" value={view} onChange={(v) => setView(v as "day" | "week")} options={[{ value: "day", label: "Dzień" }, { value: "week", label: "Tydzień" }]} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[248px_1fr] gap-4 items-start">
        {/* Aside: mini-month + week strip */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
          <MiniMonth cursor={cursor} onPick={pickDay} appointments={appointments} />
          <div className="rounded-[18px] p-3" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(203,213,225,0.4)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2 px-1">Ten tydzień</p>
            <div className="space-y-0.5">
              {weekDays.map((d) => {
                const cnt = apptsForDay(d).length;
                const active = sameDay(d, cursor);
                return (
                  <button key={d.toISOString()} onClick={() => pickDay(d)} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors", active ? "text-slate-900" : "row-hover text-slate-500")} style={active ? { background: "rgba(203,213,225,0.28)" } : undefined}>
                    <span className="text-xs font-medium w-6 tabular-nums">{D_SHORT[d.getDay()]}</span>
                    <span className={cn("text-xs tabular-nums w-5", sameDay(d, now) && "font-bold text-slate-900")}>{d.getDate()}</span>
                    {cnt > 0 && <span className="ml-auto text-[10px] tabular-nums px-1.5 rounded-full" style={CHIP}>{cnt}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="rounded-[20px] overflow-hidden" style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(203,213,225,0.45)", boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 6px 20px rgba(100,116,139,0.07), inset 0 1px 0 rgba(255,255,255,0.92)" }}>
          {view === "day" ? (
            <>
              {/* Desktop lanes */}
              <div className="hidden sm:block">
                {isClosedToday && (
                  <div className="px-5 py-2 text-xs text-slate-500" style={{ borderBottom: HAIRLINE, background: "rgba(203,213,225,0.12)" }}>
                    Salon zamknięty w tym dniu — pokazujemy 8:00–20:00 do ręcznych wpisów.
                  </div>
                )}
                {/* Lane headers */}
                {laneEmps.length > 1 && (
                  <div className="flex" style={{ borderBottom: HAIRLINE }}>
                    <div className="w-14 flex-shrink-0" />
                    {laneEmps.map((e, i) => (
                      <div key={e?.id ?? i} className="flex-1 min-w-0 px-3 py-2.5 flex items-center gap-2" style={{ borderLeft: HAIRLINE }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e?.color ?? "#94A3B8" }} />
                        <span className="text-xs font-semibold text-slate-700 truncate">{e ? e.firstName : "Bez przypisania"}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
                  {/* time gutter */}
                  <div className="w-14 flex-shrink-0">
                    {gridHours.map((m) => (
                      <div key={m} className="relative" style={{ height: HOUR_H }}>
                        <span className="absolute -top-1.5 right-2 text-[10px] text-slate-400 tabular-nums">{hm(m)}</span>
                      </div>
                    ))}
                  </div>
                  {/* lanes */}
                  {laneEmps.map((emp, li) => {
                    const laneAppts = emp ? dayAppts.filter((a) => a.employeeId === emp.id) : dayAppts.filter((a) => !a.employeeId);
                    return (
                      <LaneColumn
                        key={emp?.id ?? li}
                        openMin={openMin} closeMin={closeMin} gridHours={gridHours}
                        appts={laneAppts} isToday={sameDay(cursor, now)} nowMin={localMin(now)}
                        onEmpty={(min) => openNewAt(cursor, min, emp?.id)}
                        onSelect={(a) => { setActionError(""); setSelected(a); }}
                        blockStyle={blockStyle}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Mobile single column */}
              <div className="sm:hidden p-4">
                {dayAppts.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm font-semibold text-slate-700">Brak wizyt</p>
                    <p className="text-xs text-slate-500 mt-1">Dotknij „+", aby dodać wizytę na ten dzień.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...dayAppts].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).map((a) => {
                      const rail = STATUS_META[a.status]?.rail ?? "#94A3B8";
                      return (
                        <button key={a.id} onClick={() => { setActionError(""); setSelected(a); }} className="w-full text-left rounded-2xl px-3.5 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(203,213,225,0.5)", borderLeft: `3px solid ${a.employee?.color ?? rail}` }}>
                          <div className="text-center flex-shrink-0 w-12">
                            <p className="text-sm font-bold text-slate-900 tabular-nums">{hm(localMin(new Date(a.startTime)))}</p>
                            <p className="text-[10px] text-slate-400 tabular-nums">{a.duration}m</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{a.customer.firstName} {a.customer.lastName}</p>
                            <p className="text-xs text-slate-500 truncate">{a.service.name}</p>
                          </div>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rail }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <WeekGrid weekDays={weekDays} apptsForDay={apptsForDay} onSelect={(a) => { setActionError(""); setSelected(a); }} onPick={pickDay} now={now} windowFor={windowFor} />
          )}
        </div>
      </div>

      {/* Detail modal */}
      <GlassModal
        open={selected !== null}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        title={selected ? `${selected.customer.firstName} ${selected.customer.lastName}` : ""}
        description={selected?.service.name}
        accent={selected?.employee?.color ?? "#334155"}
      >
        {selected && (
          <>
            <div className="space-y-2.5 mt-2">
              <Row label="Czas" value={`${new Date(selected.startTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} – ${new Date(selected.endTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} (${selected.duration} min)`} />
              <Row label="Cena" value={`${selected.price.toFixed(0)} zł`} />
              {selected.employee && <Row label="Pracownik" value={`${selected.employee.firstName} ${selected.employee.lastName}`} />}
              {selected.customer.phone && <Row label="Telefon" value={selected.customer.phone} />}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={statusMeta?.style}>{statusMeta?.label ?? selected.status}</span>
              </div>
              {selected.customerNotes && <Row label="Notatki" value={selected.customerNotes} />}
            </div>
            {actionError && <div role="alert" className="mt-4 px-3 py-2.5 rounded-xl" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}><p className="text-xs font-medium" style={{ color: "#BE123C" }}>{actionError}</p></div>}
            {(selected.status === "PENDING" || selected.status === "CONFIRMED" || selected.status === "IN_PROGRESS") && (
              <div className="mt-5 pt-4 flex flex-wrap gap-2" style={{ borderTop: HAIRLINE }}>
                {selected.status === "PENDING" && <ModalInkButton onClick={() => runAction(confirmAppointment)} disabled={isPending}>Potwierdź</ModalInkButton>}
                {(selected.status === "CONFIRMED" || selected.status === "IN_PROGRESS") && <ModalInkButton onClick={() => runAction(completeAppointment)} disabled={isPending}>Zakończ</ModalInkButton>}
                {(selected.status === "PENDING" || selected.status === "CONFIRMED") && (
                  <>
                    <ModalGlassButton onClick={() => runAction(markNoShow)} disabled={isPending}>No-show</ModalGlassButton>
                    <ModalGlassButton onClick={() => runAction(declineAppointment)} disabled={isPending}>Odwołaj</ModalGlassButton>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </GlassModal>

      <NewAppointmentSheet open={sheetOpen} onOpenChange={setSheetOpen} businessId={businessId} services={services} employees={employees} prefillDate={prefill.date} prefillTime={prefill.time} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right max-w-[60%] tabular-nums">{value}</span>
    </div>
  );
}

function LaneColumn({ openMin, closeMin, gridHours, appts, isToday, nowMin, onEmpty, onSelect, blockStyle }: {
  openMin: number; closeMin: number; gridHours: number[]; appts: ApptR[]; isToday: boolean; nowMin: number;
  onEmpty: (min: number) => void; onSelect: (a: ApptR) => void; blockStyle: (a: ApptR) => { top: number; height: number };
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const total = ((closeMin - openMin) / 60) * HOUR_H;
  const showNow = isToday && nowMin >= openMin && nowMin <= closeMin;
  return (
    <div
      ref={ref}
      className="flex-1 min-w-[120px] relative cursor-pointer"
      style={{ height: total, borderLeft: HAIRLINE }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-appt]")) return;
        const rect = ref.current!.getBoundingClientRect();
        const min = openMin + ((e.clientY - rect.top) / HOUR_H) * 60;
        onEmpty(Math.min(Math.max(min, openMin), closeMin - 15));
      }}
    >
      {gridHours.map((m, i) => (
        <div key={m} className="absolute inset-x-0 group" style={{ top: i * HOUR_H, height: HOUR_H, borderBottom: "1px solid rgba(203,213,225,0.22)" }}>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-1 rounded-md flex items-center justify-center pointer-events-none" style={{ background: "rgba(203,213,225,0.14)", border: "1px dashed rgba(148,163,184,0.4)" }}>
            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
          </span>
        </div>
      ))}
      {showNow && (
        <div className="absolute inset-x-0 z-20 pointer-events-none" style={{ top: ((nowMin - openMin) / 60) * HOUR_H }}>
          <div className="relative h-px" style={{ background: "#475569" }}>
            <span className="absolute -left-1 -top-[3px] w-[7px] h-[7px] rounded-full" style={{ background: "#475569", boxShadow: "0 0 0 2px rgba(255,255,255,0.9)" }} />
          </div>
        </div>
      )}
      {appts.map((a) => {
        const rail = STATUS_META[a.status]?.rail ?? "#94A3B8";
        const muted = ["COMPLETED", "NO_SHOW", "CANCELLED_BUSINESS"].includes(a.status);
        const { top, height } = blockStyle(a);
        return (
          <button
            key={a.id} data-appt onClick={() => onSelect(a)}
            className={cn("card-hover-lift absolute left-1 right-1 rounded-lg text-left overflow-hidden z-10", muted && "opacity-65")}
            style={{ top, height, background: "rgba(255,255,255,0.94)", border: "1px solid rgba(203,213,225,0.55)", borderLeft: `3px solid ${a.employee?.color ?? rail}`, boxShadow: "0 1px 3px rgba(100,116,139,0.12), inset 0 1px 0 rgba(255,255,255,0.95)" }}
          >
            <div className="px-1.5 py-1 h-full overflow-hidden">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: rail }} />
                <p className="text-[10px] font-semibold text-slate-900 leading-tight truncate">{a.customer.firstName} {a.customer.lastName}</p>
              </div>
              {height > 38 && <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5 pl-2.5">{a.service.name}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({ weekDays, apptsForDay, onSelect, onPick, now, windowFor }: {
  weekDays: Date[]; apptsForDay: (d: Date) => ApptR[]; onSelect: (a: ApptR) => void; onPick: (d: Date) => void; now: Date; windowFor: (d: Date) => [number, number] | null;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", borderBottom: HAIRLINE }}>
          {weekDays.map((d, i) => {
            const today = sameDay(d, now);
            return (
              <button key={i} onClick={() => onPick(d)} className="py-3 text-center row-hover" style={{ borderLeft: i > 0 ? HAIRLINE : undefined, background: d.getDay() === 0 || d.getDay() === 6 ? "rgba(203,213,225,0.1)" : undefined }}>
                <p className={cn("text-xs font-medium", today ? "text-slate-900" : "text-slate-500")}>{D_SHORT[d.getDay()]}</p>
                <p className={cn("text-sm font-bold mt-0.5 tabular-nums", today ? "text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto" : "text-slate-800")} style={today ? { background: "linear-gradient(180deg,#1E293B,#0F172A)" } : undefined}>{d.getDate()}</p>
              </button>
            );
          })}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", minHeight: 360 }}>
          {weekDays.map((d, i) => {
            const list = apptsForDay(d).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
            const closed = windowFor(d) === null;
            return (
              <div key={i} className="p-1.5 space-y-1" style={{ borderLeft: i > 0 ? HAIRLINE : undefined, background: closed ? "rgba(203,213,225,0.08)" : undefined }}>
                {list.map((a) => {
                  const rail = STATUS_META[a.status]?.rail ?? "#94A3B8";
                  return (
                    <button key={a.id} onClick={() => onSelect(a)} className="w-full text-left rounded-lg px-2 py-1.5 card-hover-lift" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(203,213,225,0.5)", borderLeft: `3px solid ${a.employee?.color ?? rail}` }}>
                      <p className="text-[10px] font-bold text-slate-900 tabular-nums leading-none">{new Date(a.startTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="text-[10px] text-slate-600 truncate leading-tight mt-0.5">{a.customer.firstName} {a.customer.lastName[0]}.</p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniMonth({ cursor, onPick, appointments }: { cursor: Date; onPick: (d: Date) => void; appointments: ApptR[] }) {
  const [viewMonth, setViewMonth] = useState(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const now = new Date();
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1))];
  const hasAppt = (d: Date) => appointments.some((a) => sameDay(new Date(a.startTime), d));

  return (
    <div className="rounded-[18px] p-3" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(203,213,225,0.4)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-semibold text-slate-700 capitalize">{MON[viewMonth.getMonth()].replace(/a$/, "")} {viewMonth.getFullYear()}</p>
        <div className="flex gap-0.5">
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} aria-label="Poprzedni miesiąc" className="icon-btn p-1 rounded-md" style={{ color: "#94A3B8" }}><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m15 18-6-6 6-6" /></svg></button>
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} aria-label="Następny miesiąc" className="icon-btn p-1 rounded-md" style={{ color: "#94A3B8" }}><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["P", "W", "Ś", "C", "P", "S", "N"].map((d, i) => <span key={i} className="text-center text-[9px] font-semibold text-slate-400">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const active = sameDay(d, cursor);
          const today = sameDay(d, now);
          return (
            <button key={i} onClick={() => onPick(d)} className={cn("relative h-7 rounded-md text-[11px] tabular-nums transition-colors", active ? "text-white font-bold" : today ? "font-bold text-slate-900" : "text-slate-600 hover:bg-slate-100")} style={active ? { background: "linear-gradient(180deg,#1E293B,#0F172A)" } : undefined}>
              {d.getDate()}
              {hasAppt(d) && !active && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "#94A3B8" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
