"use client";

// ─── New appointment sheet — makes "Nowa wizyta" real ───────────────────────
// Glass sheet for walk-in / phone bookings: pick or quick-add a client,
// service, optional employee, date, then a live availability slot grid.
// Server work happens in createManualAppointment (owner-scoped, conflict-safe).

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  gentleFade,
  modalIn,
  overlayFade,
  projectMomentum,
  sheetUp,
  SPRING_SHEET,
  useReducedMotion,
} from "@/lib/motion";
import { CHROME_STRONG, SCRIM, INK_BTN } from "@/components/ui/glass/tokens";
import { useIsCompact } from "@/hooks/use-media";
import { notify } from "@/lib/notify";
import { cn, formatDuration } from "@/lib/utils";
import {
  searchClients,
  createManualAppointment,
} from "@/lib/actions/appointments";
import { bookingErrorText } from "@/lib/booking-messages";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { formatCurrency as fmtMoney } from "@/lib/i18n/format";

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

type ClientResult = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

const INK = "var(--ink-raised)";

const PANEL_STYLE: React.CSSProperties = {
  ...CHROME_STRONG,
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e4)",
};

const OVERLINE = "block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2";

function todayWarsaw(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

export function NewAppointmentSheet({
  open,
  onOpenChange,
  businessId,
  services,
  employees,
  prefillDate,
  prefillTime,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  services: ServiceOption[];
  employees: EmployeeOption[];
  prefillDate?: string;
  prefillTime?: string;
}) {
  const router = useRouter();
  const t = useT();
  const T = t.pages.newAppointment;
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const compact = useIsCompact();

  // On a phone this is a sheet: it arrives from the bottom edge and leaves
  // through the same edge, and a downward flick throws it away. On a desktop it
  // is a centred modal that materialises in place.
  const panelVariants = reduceMotion ? gentleFade : compact ? sheetUp : modalIn;
  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y + projectMomentum(info.velocity.y) > 120) onOpenChange(false);
  }

  // Client
  const [clientMode, setClientMode] = useState<"search" | "new">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Visit
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [date, setDate] = useState(prefillDate ?? todayWarsaw());
  const [time, setTime] = useState(prefillTime ?? "");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);

  // Prefill sync when the sheet opens from a slot click
  useEffect(() => {
    if (open) {
      if (prefillDate) setDate(prefillDate);
      if (prefillTime) setTime(prefillTime);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillDate, prefillTime]);

  // Debounced client search
  useEffect(() => {
    if (clientMode !== "search" || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const found = await searchClients(query);
        setResults(found as ClientResult[]);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, clientMode]);

  // Availability slots for the picked service/employee/date
  const fetchSlots = useCallback(async () => {
    if (!serviceId || !date) return;
    setLoadingSlots(true);
    try {
      const params = new URLSearchParams({
        businessId,
        serviceId,
        date,
        ...(employeeId ? { employeeId } : {}),
      });
      const res = await fetch(`/api/availability?${params.toString()}`);
      const data = (await res.json()) as { slots?: string[] };
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [businessId, serviceId, employeeId, date]);

  useEffect(() => {
    if (open) fetchSlots();
  }, [open, fetchSlots]);

  const clientReady =
    clientMode === "search"
      ? selectedClient !== null
      : newFirst.trim().length > 0 && newLast.trim().length > 0;
  const canSubmit = clientReady && serviceId && date && time && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await createManualAppointment({
        serviceId,
        employeeId: employeeId || null,
        date,
        time,
        client:
          clientMode === "search" && selectedClient
            ? { kind: "existing", userId: selectedClient.id }
            : {
                kind: "new",
                firstName: newFirst,
                lastName: newLast,
                phone: newPhone.trim() || undefined,
              },
        note: note.trim() || undefined,
      });
      onOpenChange(false);
      // Reset for next open
      setSelectedClient(null);
      setQuery("");
      setNewFirst("");
      setNewLast("");
      setNewPhone("");
      setTime("");
      setNote("");
      notify.saved(t.feedback.created);
      router.refresh();
    } catch (err) {
      const e = err as { message?: string };
      setError(bookingErrorText(e.message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={overlayFade}
                initial="hidden"
                animate="show"
                exit="exit"
                className="fixed inset-0"
                style={{ ...SCRIM, zIndex: "var(--z-overlay)" as unknown as number }}
              />
            </Dialog.Overlay>
            <div
              className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
              style={{ zIndex: "var(--z-modal)" as unknown as number }}
            >
              <Dialog.Content asChild forceMount>
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  drag={compact && !reduceMotion ? "y" : false}
                  dragDirectionLock
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.6 }}
                  onDragEnd={handleDragEnd}
                  transition={SPRING_SHEET}
                  className="relative w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[85dvh] flex flex-col rounded-t-[22px] sm:rounded-[20px] overflow-hidden pointer-events-auto"
                  style={PANEL_STYLE}
                >
                  {compact && !reduceMotion && (
                    <div className="flex justify-center pt-2.5 flex-shrink-0" aria-hidden="true">
                      <span className="h-1 w-9 rounded-full" style={{ background: "var(--hairline-firm)" }} />
                    </div>
                  )}
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 p-6 pb-4">
                    <div>
                      <Dialog.Title className="text-[17px] leading-[1.25] font-semibold text-slate-900 track-title">
                        {T.title}
                      </Dialog.Title>
                      <Dialog.Description className="text-[13.5px] leading-[1.5] text-secondary mt-1">
                        {T.subtitle}
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label={t.a11y.close}
                        className="w-9 h-9 -mr-2 -mt-1.5 flex items-center justify-center rounded-lg icon-btn flex-shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
                    {/* Client */}
                    <div>
                      <span className={OVERLINE}>{T.client}</span>
                      <div
                        className="inline-flex items-center gap-0.5 p-0.5 rounded-xl mb-3"
                        style={{ background: "var(--selected)", border: "1px solid var(--hairline-soft)" }}
                        role="group"
                        aria-label={T.modeLabel}
                      >
                        {([
                          { key: "search", label: T.existing },
                          { key: "new", label: T.newClient },
                        ] as const).map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => { setClientMode(opt.key); setError(""); }}
                            aria-pressed={clientMode === opt.key}
                            className={cn(
                              "px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-colors",
                              clientMode === opt.key ? "text-white" : "text-slate-500 hover:text-slate-800"
                            )}
                            style={clientMode === opt.key ? { background: INK } : undefined}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {clientMode === "search" ? (
                        selectedClient ? (
                          <div
                            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                            style={{ background: "var(--selected)", border: "1px solid var(--hairline)" }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: "var(--surface)", border: "1px solid var(--hairline)", color: "#475569" }}
                            >
                              {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {selectedClient.firstName} {selectedClient.lastName}
                              </p>
                              <p className="text-xs text-slate-500 truncate tabular-nums">
                                {selectedClient.phone ?? selectedClient.email}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedClient(null)}
                              aria-label={T.change}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                              {T.change}
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <svg className="absolute left-3 top-[13px] w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                              type="text"
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder={T.searchPh}
                              className="input-glass w-full pl-9 pr-3 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800"
                              aria-label={t.pages.crm.searchAria}
                            />
                            {query.trim().length >= 2 && (
                              <div
                                className="mt-1.5 rounded-xl overflow-hidden"
                                style={{ background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "var(--e2)" }}
                              >
                                {searching ? (
                                  <p className="px-3.5 py-3 text-xs text-slate-500">{T.searching}</p>
                                ) : results.length === 0 ? (
                                  <p className="px-3.5 py-3 text-xs text-slate-500">
                                    {T.noResults}
                                  </p>
                                ) : (
                                  results.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => { setSelectedClient(c); setQuery(""); }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left row-hover"
                                    >
                                      <span className="text-sm font-medium text-slate-800">
                                        {c.firstName} {c.lastName}
                                      </span>
                                      <span className="text-xs text-slate-400 tabular-nums truncate">
                                        {c.phone ?? c.email}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2.5">
                            <input
                              type="text"
                              value={newFirst}
                              onChange={(e) => setNewFirst(e.target.value)}
                              placeholder={`${T.firstName} *`}
                              aria-label={T.firstName}
                              className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800"
                            />
                            <input
                              type="text"
                              value={newLast}
                              onChange={(e) => setNewLast(e.target.value)}
                              placeholder={`${T.lastName} *`}
                              aria-label={T.lastName}
                              className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800"
                            />
                          </div>
                          <input
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder={T.phone}
                            aria-label={T.phone}
                            className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800 tabular-nums"
                          />
                        </div>
                      )}
                    </div>

                    {/* Service */}
                    <div>
                      <label htmlFor="na-service" className={OVERLINE}>{T.service}</label>
                      <div className="relative">
                        <select
                          id="na-service"
                          value={serviceId}
                          onChange={(e) => { setServiceId(e.target.value); setTime(""); }}
                          className="input-glass w-full appearance-none px-3.5 py-2.5 pr-9 text-sm rounded-xl outline-none text-slate-800"
                        >
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} · {formatDuration(s.duration)} · {fmtMoney(s.discountedPrice ?? s.price, locale)}
                            </option>
                          ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Employee */}
                    {employees.length > 0 && (
                      <div>
                        <label htmlFor="na-employee" className={OVERLINE}>{T.employee}</label>
                        <div className="relative">
                          <select
                            id="na-employee"
                            value={employeeId}
                            onChange={(e) => { setEmployeeId(e.target.value); setTime(""); }}
                            className="input-glass w-full appearance-none px-3.5 py-2.5 pr-9 text-sm rounded-xl outline-none text-slate-800"
                          >
                            <option value="">{T.anyEmployee}</option>
                            {employees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.firstName} {e.lastName}
                              </option>
                            ))}
                          </select>
                          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Date */}
                    <div>
                      <label htmlFor="na-date" className={OVERLINE}>{T.date}</label>
                      <input
                        id="na-date"
                        type="date"
                        value={date}
                        min={todayWarsaw()}
                        onChange={(e) => { setDate(e.target.value); setTime(""); }}
                        className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 tabular-nums"
                      />
                    </div>

                    {/* Time slots */}
                    <div>
                      <span className={OVERLINE}>{T.time}</span>
                      <div aria-live="polite" aria-busy={loadingSlots}>
                        {loadingSlots ? (
                          <div className="grid grid-cols-4 gap-1.5">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className="h-9 rounded-xl tc-skeleton" />
                            ))}
                          </div>
                        ) : slots.length === 0 ? (
                          <p
                            className="px-3.5 py-3 rounded-xl text-xs text-slate-500"
                            style={{ background: "var(--selected)", border: "1px dashed rgba(203,213,225,0.55)" }}
                          >
                            {T.noSlots}
                          </p>
                        ) : (
                          <div className="grid grid-cols-4 gap-1.5">
                            {slots.map((slot) => {
                              const active = time === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setTime(slot)}
                                  aria-pressed={active}
                                  className={cn(
                                    "py-2 rounded-xl text-xs font-semibold tabular-nums transition-colors",
                                    active ? "text-white" : "text-slate-600"
                                  )}
                                  style={active
                                    ? { background: INK, border: "1px solid #0F172A", boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" }
                                    : { background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label htmlFor="na-note" className={OVERLINE}>
                        {T.note} <span className="normal-case font-normal tracking-normal">{T.noteHint}</span>
                      </label>
                      <textarea
                        id="na-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder={T.notePh}
                        className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800 resize-none"
                      />
                    </div>

                    {error && (
                      <div
                        role="alert"
                        className="px-4 py-3 rounded-xl"
                        style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}
                      >
                        <p className="text-sm font-medium" style={{ color: "#BE123C" }}>{error}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div
                    className="p-4 px-6 flex items-center gap-3"
                    style={{ borderTop: "1px solid var(--hairline-soft)", background: "var(--surface-2)" }}
                  >
                    {selectedService && (
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 truncate">
                          {selectedService.name}
                          {time && date ? ` · ${date} · ${time}` : ""}
                        </p>
                        <p className="text-sm font-bold text-slate-900 tabular-nums">
                          {fmtMoney(selectedService.discountedPrice ?? selectedService.price, locale)}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      data-on-ink
                      className="btn-spring px-5 py-[11px] min-h-[44px] rounded-[10px] text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-2"
                      style={INK_BTN}
                    >
                      {submitting && (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" d="M4 12a8 8 0 0 1 8-8" />
                        </svg>
                      )}
                      {submitting ? T.saving : T.submit}
                    </button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
