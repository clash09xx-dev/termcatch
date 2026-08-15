"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, AppointmentAddon, Service, Employee, User, WorkingHours } from "@prisma/client";
import {
  confirmAppointment, declineAppointment, completeAppointment, markNoShow,
  businessRescheduleAppointment,
} from "@/lib/actions/appointments";
import { bookingErrorText } from "@/lib/booking-messages";
import { GlassModal, ModalInkButton, ModalGlassButton } from "@/components/ui/glass-modal";
import { NewAppointmentSheet } from "@/components/business/new-appointment-sheet";
import { Segmented } from "@/components/ui/segmented";
import { STATUS_TINT, CHIP, HAIRLINE, type StatusKey } from "@/components/ui/glass/tokens";
import { computeLanes } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { intlLocale, formatCurrency as fmtMoney } from "@/lib/i18n/format";
import { interpolate } from "@/lib/i18n/dictionaries";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { notify, errorText } from "@/lib/notify";

type ApptR = Appointment & { service: Service; employee: Employee | null; customer: User; addons: AppointmentAddon[] };
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
// Date labels are rendered from the LOCAL date parts (matching the grid maths)
// through Intl, so they follow the UI language without shifting any day.
const dtf = (locale: Locale, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intlLocale(locale), opts);
const hhmm = (locale: Locale, d: Date) => dtf(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
const STATUS_META = STATUS_TINT as Record<string, { style: React.CSSProperties; rail: string }>;

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
  const t = useT();
  const T = t.pages.calendar;
  const locale = useLocale();
  const dShort = (d: Date) => t.weekdays.short[DOW[d.getDay()]];
  const router = useRouter();
  const weekStart = useMemo(() => new Date(props.weekStart), [props.weekStart]);

  const [cursor, setCursor] = useState(() => new Date(props.focusDate));
  const [view, setView] = useState<"day" | "week">("day");
  const [empFilter, setEmpFilter] = useState<string>("all");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [selected, setSelected] = useState<ApptR | null>(null);
  const [actionError, setActionError] = useState("");
  const [isPending, setPending] = useState(false);
  // Detail-modal sub-panels: the default action row, the mandatory-reason
  // cancellation form, or the salon time-change form.
  const [detailMode, setDetailMode] = useState<"actions" | "cancel" | "reschedule">("actions");
  const [cancelReason, setCancelReason] = useState("");
  const [reDate, setReDate] = useState("");
  const [reTime, setReTime] = useState("");
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
    action(id)
      .then(() => { setSelected(null); notify.saved(t.feedback.updated); router.refresh(); })
      .catch((e: unknown) => { const m = errorText(e, T.genericError); setActionError(m); notify.error(m); })
      .finally(() => setPending(false));
  }

  // Reset the sub-panel + prefill the time-change form whenever a new
  // appointment is opened (or the modal closes).
  useEffect(() => {
    setDetailMode("actions");
    setCancelReason("");
    setActionError("");
    if (selected) {
      const d = new Date(selected.startTime);
      setReDate(ymd(d));
      setReTime(hm(localMin(d)));
    }
  }, [selected]);

  function submitCancel() {
    if (!selected || isPending) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) { setActionError(T.cancelReasonShort); return; }
    setActionError(""); setPending(true);
    declineAppointment(selected.id, reason)
      .then(() => { setSelected(null); notify.saved(t.feedback.updated); router.refresh(); })
      .catch((e: unknown) => { const m = errorText(e, T.genericError); setActionError(m); notify.error(m); })
      .finally(() => setPending(false));
  }

  function submitReschedule() {
    if (!selected || isPending) return;
    if (!reDate || !reTime) { setActionError(T.genericError); return; }
    setActionError(""); setPending(true);
    businessRescheduleAppointment({ appointmentId: selected.id, date: reDate, time: reTime })
      .then(() => { setSelected(null); notify.saved(t.feedback.updated); router.refresh(); })
      .catch((e: { message?: string }) => { const m = bookingErrorText(e.message); setActionError(m); notify.error(m); })
      .finally(() => setPending(false));
  }

  // Memoized so modal typing (cancel reason / reschedule fields) never recomputes
  // the whole day layout.
  const dayAppts = useMemo(() => apptsForDay(cursor), [appointments, cursor, empFilter, pendingOnly]);
  // Always render the FULL 00:00–24:00 day — never crop it. The grid scrolls and
  // auto-positions to the useful part; workOpen/workClose drive the shaded
  // "outside working hours" bands + the open/close markers.
  const workWin = windowFor(cursor);
  const isClosedToday = workWin === null;
  const [workOpen, workClose] = workWin ?? [8 * 60, 20 * 60];
  const openMin = 0;
  const closeMin = 24 * 60;
  const gridHours = useMemo(() => Array.from({ length: 25 }, (_, i) => i * 60), []);

  // Auto-scroll the day grid to a useful position: the current time when viewing
  // today, otherwise the first appointment, otherwise the salon's opening hour.
  const dayScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (view !== "day") return;
    const el = dayScrollRef.current;
    if (!el) return;
    const nowMin = localMin(new Date());
    const isToday = sameDay(cursor, new Date());
    let target: number;
    if (isToday && nowMin >= openMin && nowMin <= closeMin) target = nowMin;
    else if (dayAppts.length) target = Math.min(...dayAppts.map((a) => localMin(new Date(a.startTime))));
    else target = isClosedToday ? openMin : workOpen;
    const y = ((target - openMin) / 60) * HOUR_H - el.clientHeight * 0.3;
    el.scrollTop = Math.max(0, y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, props.focusDate, cursor, openMin, closeMin, appointments]);
  // Mobile agenda honors the specialist filter (desktop uses lanes instead).
  const dayApptsForView = useMemo(() => (empFilter === "all" ? dayAppts : dayAppts.filter((a) => a.employeeId === empFilter)), [dayAppts, empFilter]);

  // Lanes for the day view (desktop). Columns = employees (when unfiltered) else
  // single. Appointments booked with "Dowolny specjalista" have employeeId=null —
  // they get their own "Bez przypisania" lane whenever the day has any, so they
  // can never silently disappear from the grid.
  const laneEmps: (Emp | null)[] = useMemo(() => computeLanes(employees, empFilter, dayAppts.some((a) => !a.employeeId)), [employees, empFilter, dayAppts]);

  function blockStyle(a: ApptR) {
    const s = localMin(new Date(a.startTime));
    return { top: ((s - openMin) / 60) * HOUR_H, height: Math.max((a.duration / 60) * HOUR_H - 3, 26) };
  }

  const dateLabel = view === "day"
    ? dtf(locale, { weekday: "long", day: "numeric", month: "long" }).format(cursor)
    : `${dtf(locale, weekDays[0].getMonth() !== weekDays[6].getMonth() ? { day: "numeric", month: "short" } : { day: "numeric" }).format(weekDays[0])} – ${dtf(locale, { day: "numeric", month: "long" }).format(weekDays[6])}`;

  const statusMeta = selected ? STATUS_META[selected.status] ?? STATUS_META.RESCHEDULED : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {/* Header */}
      <div className="fade-rise flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => (view === "day" ? goDay(-1) : goWeek(-1))} aria-label={T.back} className="btn-spring p-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "#475569" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button onClick={goToday} className="btn-spring px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "#334155" }}>{T.today}</button>
          <button onClick={() => (view === "day" ? goDay(1) : goWeek(1))} aria-label={T.forward} className="btn-spring p-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "#475569" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
        <p className="text-[15px] font-semibold text-slate-900 capitalize tabular-nums">{dateLabel}</p>
        <div className="ml-auto flex items-center gap-2">
          {employees.length > 0 && view === "day" && (
            // A dropdown (not a per-employee segmented row) so 15–25 specialists
            // never overflow the toolbar / page horizontally.
            <select
              aria-label={T.employeeFilter}
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              className="text-xs font-semibold rounded-lg px-2.5 py-1.5 max-w-[168px] outline-none cursor-pointer"
              style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "#334155" }}
            >
              <option value="all">{T.allEmployees}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setPendingOnly((v) => !v)}
            aria-pressed={pendingOnly}
            className="btn-spring px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={pendingOnly
              ? { background: STATUS_TINT.PENDING.style.background, border: STATUS_TINT.PENDING.style.border, color: STATUS_TINT.PENDING.style.color }
              : { background: "var(--surface)", border: "1px solid var(--hairline)", color: "#64748B" }}
          >
            {T.pendingOnly}
          </button>
          <Segmented size="sm" ariaLabel={T.viewLabel} idBase="cal-view" value={view} onChange={(v) => setView(v as "day" | "week")} options={[{ value: "day", label: T.day }, { value: "week", label: T.week }]} />
          {/* Explicit "new appointment" entry — the only way to add on mobile,
              where the desktop empty-slot click lanes are hidden. */}
          <button
            onClick={() => { setPrefill({ date: ymd(cursor) }); setSheetOpen(true); }}
            className="btn-spring px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
            style={{ background: "var(--ink-raised)", border: "1px solid #0F172A", color: "#F8FAFC" }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
            {T.newShort}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[248px_1fr] gap-4 items-start">
        {/* Aside: mini-month + week strip */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
          <MiniMonth cursor={cursor} onPick={pickDay} appointments={appointments} locale={locale} labels={{ prev: T.prevMonth, next: T.nextMonth }} />
          <div className="rounded-[18px] p-3" style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-2 px-1">{T.thisWeek}</p>
            <div className="space-y-0.5">
              {weekDays.map((d) => {
                const cnt = apptsForDay(d).length;
                const active = sameDay(d, cursor);
                return (
                  <button key={d.toISOString()} onClick={() => pickDay(d)} className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors", active ? "text-slate-900" : "row-hover text-slate-500")} style={active ? { background: "var(--selected)" } : undefined}>
                    <span className="text-xs font-medium w-6 tabular-nums">{dShort(d)}</span>
                    <span className={cn("text-xs tabular-nums w-5", sameDay(d, now) && "font-bold text-slate-900")}>{d.getDate()}</span>
                    {cnt > 0 && <span className="ml-auto text-[10px] tabular-nums px-1.5 rounded-full" style={CHIP}>{cnt}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="rounded-[20px] overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--e2)" }}>
          {view === "day" ? (
            <>
              {/* Desktop lanes — header + body share ONE grid template inside a
                  single horizontal-scroll container, so they can never drift and
                  the whole page never gains a horizontal scrollbar. */}
              <div className="hidden sm:block overflow-x-auto">
                {(() => {
                  // 56px time gutter + one lane per specialist (min 140px, readable).
                  const cols = `56px repeat(${laneEmps.length}, minmax(140px, 1fr))`;
                  const minW = 56 + laneEmps.length * 140;
                  return (
                    <div style={{ minWidth: `${minW}px` }}>
                      {isClosedToday && (
                        <div className="px-5 py-2 text-xs text-slate-500" style={{ borderBottom: HAIRLINE, background: "var(--selected)" }}>
                          {T.closedToday}
                        </div>
                      )}
                      {/* Lane headers — sticky, same template as the body */}
                      {laneEmps.length > 1 && (
                        <div
                          className="grid sticky top-0 z-10"
                          style={{ gridTemplateColumns: cols, borderBottom: HAIRLINE, background: "var(--chrome-strong)", backdropFilter: "var(--chrome-blur)", WebkitBackdropFilter: "var(--chrome-blur)" }}
                        >
                          <div className="w-14" />
                          {laneEmps.map((e, i) => (
                            <div key={e?.id ?? i} className="min-w-0 px-3 py-2.5 flex items-center gap-2" style={{ borderLeft: HAIRLINE }}>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e?.color ?? "#94A3B8" }} />
                              <span className="text-xs font-semibold text-slate-700 truncate">{e ? e.firstName : T.unassigned}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Body — same template; vertical scroll only (no independent x-scroll).
                          overscroll-contain keeps the wheel inside the timeline so the page
                          never traps or steals the scroll. */}
                      <div ref={dayScrollRef} className="grid overflow-y-auto" style={{ gridTemplateColumns: cols, maxHeight: "calc(100dvh - 240px)", overscrollBehavior: "contain" }}>
                        {/* time gutter */}
                        <div className="w-14">
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
                              workOpen={workOpen} workClose={workClose} closed={isClosedToday}
                              appts={laneAppts} isToday={sameDay(cursor, now)} nowMin={localMin(now)}
                              onEmpty={(min) => openNewAt(cursor, min, emp?.id)}
                              onSelect={(a) => { setActionError(""); setSelected(a); }}
                              blockStyle={blockStyle}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Mobile single column */}
              <div className="sm:hidden p-4">
                {dayApptsForView.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm font-semibold text-slate-700">{T.emptyDayTitle}</p>
                    <p className="text-xs text-slate-500 mt-1">{T.emptyDayBody}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...dayApptsForView].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).map((a) => {
                      const rail = STATUS_META[a.status]?.rail ?? "#94A3B8";
                      return (
                        <button key={a.id} onClick={() => { setActionError(""); setSelected(a); }} className="w-full text-left rounded-2xl px-3.5 py-3 flex items-center gap-3" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderLeft: `3px solid ${a.employee?.color ?? rail}` }}>
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
            <WeekGrid weekDays={weekDays} apptsForDay={apptsForDay} onSelect={(a) => { setActionError(""); setSelected(a); }} onPick={pickDay} now={now} windowFor={windowFor} locale={locale} dShort={dShort} />
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
              <Row label={T.rowTime} value={`${hhmm(locale, new Date(selected.startTime))} – ${hhmm(locale, new Date(selected.endTime))} (${selected.duration} min)`} />
              <Row label={T.rowPrice} value={fmtMoney(selected.price, locale)} />
              {selected.addons?.map((ad) => (
                <Row
                  key={ad.id}
                  label={`+ ${ad.name}${ad.quantity > 1 ? ` ×${ad.quantity}` : ""}`}
                  value={`${ad.totalPrice.toFixed(0)} zł · ${ad.totalDuration} min`}
                />
              ))}
              {selected.employee && <Row label={T.rowEmployee} value={`${selected.employee.firstName} ${selected.employee.lastName}`} />}
              {selected.customer.phone && <Row label={T.rowPhone} value={selected.customer.phone} />}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{T.rowStatus}</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={statusMeta?.style}>{t.statuses[selected.status as keyof Dictionary["statuses"]] ?? selected.status}</span>
              </div>
              {selected.customerNotes && <Row label={T.rowNotes} value={selected.customerNotes} />}
              {selected.status === "CANCELLED_BUSINESS" && selected.cancellationReason && (
                <Row label={T.rowCancelReason} value={selected.cancellationReason} />
              )}
            </div>
            {actionError && <div role="alert" className="mt-4 px-3 py-2.5 rounded-xl" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}><p className="text-xs font-medium" style={{ color: "#BE123C" }}>{actionError}</p></div>}
            {(selected.status === "PENDING" || selected.status === "CONFIRMED" || selected.status === "IN_PROGRESS") && (
              <div className="mt-5 pt-4" style={{ borderTop: HAIRLINE }}>
                {detailMode === "actions" && (
                  <div className="flex flex-wrap gap-2">
                    {selected.status === "PENDING" && <ModalInkButton onClick={() => runAction(confirmAppointment)} disabled={isPending}>{T.confirm}</ModalInkButton>}
                    {(selected.status === "CONFIRMED" || selected.status === "IN_PROGRESS") && <ModalInkButton onClick={() => runAction(completeAppointment)} disabled={isPending}>{T.complete}</ModalInkButton>}
                    {(selected.status === "PENDING" || selected.status === "CONFIRMED") && (
                      <>
                        <ModalGlassButton onClick={() => setDetailMode("reschedule")} disabled={isPending}>{T.reschedule}</ModalGlassButton>
                        <ModalGlassButton onClick={() => runAction(markNoShow)} disabled={isPending}>{T.noShow}</ModalGlassButton>
                        <ModalGlassButton onClick={() => setDetailMode("cancel")} disabled={isPending}>{T.cancel}</ModalGlassButton>
                      </>
                    )}
                  </div>
                )}

                {detailMode === "cancel" && (
                  <div className="space-y-2.5">
                    <label htmlFor="cancel-reason" className="block text-sm font-medium text-slate-700">{T.cancelReasonLabel} <span className="text-slate-400 font-normal">{T.cancelReasonHint}</span></label>
                    <textarea id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} maxLength={500} autoFocus placeholder={T.cancelReasonPh} className="input-glass w-full rounded-xl px-3 py-2 text-sm outline-none text-slate-800 placeholder:text-slate-400" />
                    <div className="flex gap-2">
                      <ModalGlassButton onClick={() => { setDetailMode("actions"); setActionError(""); }} disabled={isPending}>{T.back2}</ModalGlassButton>
                      <ModalInkButton onClick={submitCancel} disabled={isPending || cancelReason.trim().length < 3}>{isPending ? T.cancelling : T.cancelCta}</ModalInkButton>
                    </div>
                  </div>
                )}

                {detailMode === "reschedule" && (
                  <div className="space-y-2.5">
                    <label className="block text-sm font-medium text-slate-700">{T.newSlotLabel}</label>
                    <div className="flex gap-2">
                      <input aria-label={T.ariaNewDate} type="date" value={reDate} onChange={(e) => setReDate(e.target.value)} className="input-glass flex-1 rounded-xl px-3 py-2 text-sm outline-none text-slate-800 tabular-nums" />
                      <input aria-label={T.ariaNewTime} type="time" step={900} value={reTime} onChange={(e) => setReTime(e.target.value)} className="input-glass rounded-xl px-3 py-2 text-sm outline-none text-slate-800 tabular-nums" />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{T.rescheduleNote}</p>
                    <div className="flex gap-2">
                      <ModalGlassButton onClick={() => { setDetailMode("actions"); setActionError(""); }} disabled={isPending}>{T.back2}</ModalGlassButton>
                      <ModalInkButton onClick={submitReschedule} disabled={isPending}>{isPending ? t.pages.hours.saving : T.saveNewSlot}</ModalInkButton>
                    </div>
                  </div>
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

function LaneColumn({ openMin, closeMin, gridHours, workOpen, workClose, closed, appts, isToday, nowMin, onEmpty, onSelect, blockStyle }: {
  openMin: number; closeMin: number; gridHours: number[]; workOpen: number; workClose: number; closed: boolean;
  appts: ApptR[]; isToday: boolean; nowMin: number;
  onEmpty: (min: number) => void; onSelect: (a: ApptR) => void; blockStyle: (a: ApptR) => { top: number; height: number };
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const total = ((closeMin - openMin) / 60) * HOUR_H;
  const showNow = isToday && nowMin >= openMin && nowMin <= closeMin;
  const CLOSED_BG = "rgba(203,213,225,0.16)";
  // Closed-hours shading — the whole column when the salon is closed that day,
  // otherwise the out-of-working-hours bands before opening / after closing.
  const closedBands = closed
    ? [{ top: 0, height: total }]
    : [
        { top: 0, height: ((Math.max(openMin, workOpen) - openMin) / 60) * HOUR_H },
        { top: ((workClose - openMin) / 60) * HOUR_H, height: ((closeMin - Math.min(closeMin, workClose)) / 60) * HOUR_H },
      ].filter((b) => b.height > 0);
  return (
    <div
      ref={ref}
      className="relative cursor-pointer min-w-0"
      style={{ height: total, borderLeft: HAIRLINE }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-appt]")) return;
        const rect = ref.current!.getBoundingClientRect();
        const min = openMin + ((e.clientY - rect.top) / HOUR_H) * 60;
        onEmpty(Math.min(Math.max(min, openMin), closeMin - 15));
      }}
    >
      {closedBands.map((b, i) => (
        <div key={`closed-${i}`} className="absolute inset-x-0 pointer-events-none" style={{ top: b.top, height: b.height, background: CLOSED_BG }} aria-hidden="true" />
      ))}
      {gridHours.map((m, i) => (
        <div key={m} className="absolute inset-x-0 group" style={{ top: i * HOUR_H, height: HOUR_H, borderBottom: "1px solid var(--hairline-soft)" }}>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-1 rounded-md flex items-center justify-center pointer-events-none" style={{ background: "var(--selected)", border: "1px dashed rgba(148,163,184,0.4)" }}>
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
            style={{ top, height, background: "var(--surface)", border: "1px solid var(--hairline)", borderLeft: `3px solid ${a.employee?.color ?? rail}`, boxShadow: "var(--e1)" }}
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

function WeekGrid({ weekDays, apptsForDay, onSelect, onPick, now, windowFor, locale, dShort }: {
  weekDays: Date[]; apptsForDay: (d: Date) => ApptR[]; onSelect: (a: ApptR) => void; onPick: (d: Date) => void; now: Date; windowFor: (d: Date) => [number, number] | null;
  locale: Locale; dShort: (d: Date) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", borderBottom: HAIRLINE }}>
          {weekDays.map((d, i) => {
            const today = sameDay(d, now);
            return (
              <button key={i} onClick={() => onPick(d)} className="py-3 text-center row-hover" style={{ borderLeft: i > 0 ? HAIRLINE : undefined, background: d.getDay() === 0 || d.getDay() === 6 ? "rgba(203,213,225,0.1)" : undefined }}>
                <p className={cn("text-xs font-medium", today ? "text-slate-900" : "text-slate-500")}>{dShort(d)}</p>
                <p className={cn("text-sm font-bold mt-0.5 tabular-nums", today ? "text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto" : "text-slate-800")} style={today ? { background: "var(--ink-raised)" } : undefined}>{d.getDate()}</p>
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
                    <button key={a.id} onClick={() => onSelect(a)} className="w-full text-left rounded-lg px-2 py-1.5 card-hover-lift" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderLeft: `3px solid ${a.employee?.color ?? rail}` }}>
                      <p className="text-[10px] font-bold text-slate-900 tabular-nums leading-none">{hhmm(locale, new Date(a.startTime))}</p>
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

function MiniMonth({ cursor, onPick, appointments, locale, labels }: { cursor: Date; onPick: (d: Date) => void; appointments: ApptR[]; locale: Locale; labels: { prev: string; next: string } }) {
  const [viewMonth, setViewMonth] = useState(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const now = new Date();
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1))];
  const hasAppt = (d: Date) => appointments.some((a) => sameDay(new Date(a.startTime), d));

  return (
    <div className="rounded-[18px] p-3" style={{ background: "var(--surface)", border: "1px solid var(--hairline-soft)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-semibold text-slate-700 capitalize">{dtf(locale, { month: "long", year: "numeric" }).format(viewMonth)}</p>
        <div className="flex gap-0.5">
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} aria-label={labels.prev} className="icon-btn p-1 rounded-md" style={{ color: "#94A3B8" }}><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m15 18-6-6 6-6" /></svg></button>
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} aria-label={labels.next} className="icon-btn p-1 rounded-md" style={{ color: "#94A3B8" }}><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {Array.from({ length: 7 }, (_, i) => dtf(locale, { weekday: "narrow" }).format(new Date(2024, 0, 1 + i))).map((d, i) => <span key={i} className="text-center text-[9px] font-semibold text-slate-400">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const active = sameDay(d, cursor);
          const today = sameDay(d, now);
          return (
            <button key={i} onClick={() => onPick(d)} className={cn("relative h-7 rounded-md text-[11px] tabular-nums transition-colors", active ? "text-white font-bold" : today ? "font-bold text-slate-900" : "text-slate-600 hover:bg-slate-100")} style={active ? { background: "var(--ink-raised)" } : undefined}>
              {d.getDate()}
              {hasAppt(d) && !active && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "#94A3B8" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
