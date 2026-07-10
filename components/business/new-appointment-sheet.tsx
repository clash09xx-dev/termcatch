"use client";

// ─── New appointment sheet — makes "Nowa wizyta" real ───────────────────────
// Glass sheet for walk-in / phone bookings: pick or quick-add a client,
// service, optional employee, date, then a live availability slot grid.
// Server work happens in createManualAppointment (owner-scoped, conflict-safe).

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { modalIn, overlayFade, useReducedMotion, SPRING } from "@/lib/motion";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import {
  searchClients,
  createManualAppointment,
} from "@/lib/actions/appointments";

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

const INK = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.50)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.40), 0 8px 32px rgba(15,23,42,0.14), 0 32px 80px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.98)",
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
  const reduceMotion = useReducedMotion();

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
      router.refresh();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? "Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={overlayFade}
                initial="hidden"
                animate="show"
                className="fixed inset-0 z-50"
                style={{
                  background: "rgba(15,23,42,0.30)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              />
            </Dialog.Overlay>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <Dialog.Content asChild forceMount>
                <motion.div
                  variants={reduceMotion ? overlayFade : modalIn}
                  initial="hidden"
                  animate="show"
                  className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden pointer-events-auto"
                  style={PANEL_STYLE}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 p-6 pb-4">
                    <div>
                      <Dialog.Title className="text-lg font-bold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
                        Nowa wizyta
                      </Dialog.Title>
                      <Dialog.Description className="text-sm text-slate-500 mt-0.5">
                        Zapisz klienta z telefonu lub z ulicy.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Zamknij"
                        className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center rounded-lg icon-btn flex-shrink-0"
                        style={{ color: "#94A3B8" }}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
                    {/* Client */}
                    <div>
                      <span className={OVERLINE}>Klient</span>
                      <div
                        className="inline-flex items-center gap-0.5 p-0.5 rounded-xl mb-3"
                        style={{ background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.40)" }}
                        role="group"
                        aria-label="Sposób wyboru klienta"
                      >
                        {([
                          { key: "search", label: "Stały klient" },
                          { key: "new", label: "Nowy klient" },
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
                            style={{ background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.50)" }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(203,213,225,0.55)", color: "#475569" }}
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
                              aria-label="Zmień klienta"
                              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                              Zmień
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
                              placeholder="Szukaj po imieniu, telefonie, e-mailu…"
                              className="input-glass w-full pl-9 pr-3 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800"
                              aria-label="Szukaj klienta"
                            />
                            {query.trim().length >= 2 && (
                              <div
                                className="mt-1.5 rounded-xl overflow-hidden"
                                style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(203,213,225,0.45)", boxShadow: "0 4px 16px rgba(100,116,139,0.10)" }}
                              >
                                {searching ? (
                                  <p className="px-3.5 py-3 text-xs text-slate-500">Szukam…</p>
                                ) : results.length === 0 ? (
                                  <p className="px-3.5 py-3 text-xs text-slate-500">
                                    Brak klientów — dodaj jako nowego.
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
                              placeholder="Imię *"
                              aria-label="Imię klienta"
                              className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800"
                            />
                            <input
                              type="text"
                              value={newLast}
                              onChange={(e) => setNewLast(e.target.value)}
                              placeholder="Nazwisko *"
                              aria-label="Nazwisko klienta"
                              className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800"
                            />
                          </div>
                          <input
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="Telefon (opcjonalnie)"
                            aria-label="Telefon klienta"
                            className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800 tabular-nums"
                          />
                        </div>
                      )}
                    </div>

                    {/* Service */}
                    <div>
                      <label htmlFor="na-service" className={OVERLINE}>Usługa</label>
                      <div className="relative">
                        <select
                          id="na-service"
                          value={serviceId}
                          onChange={(e) => { setServiceId(e.target.value); setTime(""); }}
                          className="input-glass w-full appearance-none px-3.5 py-2.5 pr-9 text-sm rounded-xl outline-none text-slate-800"
                        >
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} · {formatDuration(s.duration)} · {formatCurrency(s.discountedPrice ?? s.price)}
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
                        <label htmlFor="na-employee" className={OVERLINE}>Specjalista</label>
                        <div className="relative">
                          <select
                            id="na-employee"
                            value={employeeId}
                            onChange={(e) => { setEmployeeId(e.target.value); setTime(""); }}
                            className="input-glass w-full appearance-none px-3.5 py-2.5 pr-9 text-sm rounded-xl outline-none text-slate-800"
                          >
                            <option value="">Dowolny specjalista</option>
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
                      <label htmlFor="na-date" className={OVERLINE}>Data</label>
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
                      <span className={OVERLINE}>Godzina</span>
                      <div aria-live="polite" aria-busy={loadingSlots}>
                        {loadingSlots ? (
                          <div className="grid grid-cols-4 gap-1.5">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: "rgba(203,213,225,0.25)" }} />
                            ))}
                          </div>
                        ) : slots.length === 0 ? (
                          <p
                            className="px-3.5 py-3 rounded-xl text-xs text-slate-500"
                            style={{ background: "rgba(203,213,225,0.14)", border: "1px dashed rgba(203,213,225,0.55)" }}
                          >
                            Brak wolnych terminów tego dnia — wybierz inną datę lub specjalistę.
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
                                    "py-2 rounded-xl text-xs font-semibold tabular-nums transition-all",
                                    active ? "text-white" : "text-slate-600"
                                  )}
                                  style={active
                                    ? { background: INK, border: "1px solid #0F172A", boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" }
                                    : { background: "rgba(255,255,255,0.80)", border: "1px solid rgba(203,213,225,0.50)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }}
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
                        Notatka <span className="normal-case font-normal tracking-normal">— wewnętrzna, opcjonalna</span>
                      </label>
                      <textarea
                        id="na-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Np. płatność gotówką, preferencje…"
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
                    style={{ borderTop: "1px solid rgba(203,213,225,0.30)", background: "rgba(255,255,255,0.70)" }}
                  >
                    {selectedService && (
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 truncate">
                          {selectedService.name}
                          {time && date ? ` · ${date} · ${time}` : ""}
                        </p>
                        <p className="text-sm font-bold text-slate-900 tabular-nums">
                          {formatCurrency(selectedService.discountedPrice ?? selectedService.price)}
                        </p>
                      </div>
                    )}
                    <motion.button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      whileHover={canSubmit ? { scale: 1.01, y: -1 } : undefined}
                      whileTap={canSubmit ? { scale: 0.982 } : undefined}
                      transition={SPRING}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{
                        background: INK,
                        border: "1px solid #0F172A",
                        color: "#F8FAFC",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 8px 20px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.15)",
                      }}
                    >
                      {submitting && (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" d="M4 12a8 8 0 0 1 8-8" />
                        </svg>
                      )}
                      {submitting ? "Zapisuję…" : "Umów wizytę"}
                    </motion.button>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
    </Dialog.Root>
  );
}
