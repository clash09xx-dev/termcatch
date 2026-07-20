"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { stepSlide, stepFade } from "@/lib/motion";
import { formatCurrency, formatDuration, formatDate, getInitials, cn } from "@/lib/utils";
import { previewCoupon, type CouponPreview } from "@/lib/actions/coupon-redemption";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AddonView {
  id: string;
  name: string;
  description: string | null;
  priceIncrease: number;
  durationIncrease: number;
  hasQuantity: boolean;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  discountedPrice: number | null;
  addons: AddonView[];
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  color: string;
}

interface WorkingHours {
  dayOfWeek: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface Business {
  id: string;
  name: string;
  slug: string;
}

interface BookingWizardProps {
  business: Business;
  services: Service[];
  employees: Employee[];
  workingHours: WorkingHours[];
  initialServiceId?: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

// ─── Machined Silver / Liquid Glass tokens ───────────────────────────────────
// Container gets the blur; repeated list rows use solid whites (perf).

const INK = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

const INK_SHADOW =
  "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), 0 2px 6px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.15)";

const S = {
  card: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(40px) saturate(200%)",
    WebkitBackdropFilter: "blur(40px) saturate(200%)",
    border: "1px solid rgba(203,213,225,0.50)",
    boxShadow:
      "0 0 0 0.5px rgba(203,213,225,0.40), 0 2px 4px rgba(0,0,0,0.04), 0 12px 36px rgba(100,116,139,0.10), 0 40px 80px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(203,213,225,0.10)",
  } as React.CSSProperties,

  // Selectable list row — rest state (no blur: these repeat)
  row: {
    background: "rgba(255,255,255,0.80)",
    border: "1px solid rgba(203,213,225,0.45)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.90)",
  } as React.CSSProperties,

  // Selectable list row — ink-filled selected state
  rowSelected: {
    background: INK,
    border: "1px solid #0F172A",
    boxShadow: "0 1px 2px rgba(0,0,0,0.18), 0 8px 20px rgba(15,23,42,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
  } as React.CSSProperties,

  // Static summary panel
  panel: {
    background: "rgba(248,250,252,0.85)",
    border: "1px solid rgba(203,213,225,0.45)",
    boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.95)",
  } as React.CSSProperties,

  // Sticky footer bar inside the card
  footer: {
    background: "rgba(248,250,252,0.92)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderTop: "1px solid rgba(203,213,225,0.45)",
    boxShadow: "0 -8px 24px rgba(100,116,139,0.06)",
  } as React.CSSProperties,
};

const SPRING = { type: "spring", stiffness: 420, damping: 26 } as const;

// ─── Buttons ─────────────────────────────────────────────────────────────────

function PrimaryBtn({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.015, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.978 }}
      transition={SPRING}
      className={cn(
        "py-3 px-4 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      style={{ background: INK, border: "1px solid #0F172A", color: "#F8FAFC", boxShadow: INK_SHADOW }}
    >
      {children}
    </motion.button>
  );
}

function GhostBtn({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.015, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.978 }}
      transition={SPRING}
      className={cn("py-3 px-4 rounded-xl text-sm font-semibold disabled:opacity-40", className)}
      style={{
        background: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(203,213,225,0.55)",
        color: "#334155",
        boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEP_LABELS = ["Usługa", "Specjalista", "Termin", "Potwierdzenie"];

function StepIndicator({
  current,
  hasEmployees,
}: {
  current: Step;
  hasEmployees: boolean;
}) {
  const steps = hasEmployees ? STEP_LABELS : STEP_LABELS.filter((_, i) => i !== 1);
  // Map internal step (1,2,3,4 with employees / 1,3,4 without) to display position 1..n
  const displayStep =
    current === 5
      ? steps.length
      : hasEmployees
      ? Math.min(current, 4)
      : current === 1
      ? 1
      : current === 3
      ? 2
      : 3;

  return (
    <ol className="flex items-center mb-8" aria-label={`Krok ${displayStep} z ${steps.length}`}>
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = displayStep > stepNum;
        const isCurrent = displayStep === stepNum;
        return (
          <li
            key={label}
            className="flex items-center flex-1 last:flex-none"
            aria-current={isCurrent ? "step" : undefined}
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                style={
                  isDone || isCurrent
                    ? {
                        background: INK,
                        color: "#F8FAFC",
                        border: "1px solid #0F172A",
                        boxShadow: isCurrent
                          ? "0 0 0 3px rgba(30,41,59,0.12), 0 2px 6px rgba(15,23,42,0.20), inset 0 1px 0 rgba(255,255,255,0.15)"
                          : "0 1px 3px rgba(15,23,42,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
                      }
                    : {
                        background: "rgba(255,255,255,0.70)",
                        color: "#94A3B8",
                        border: "1px solid rgba(203,213,225,0.50)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)",
                      }
                }
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  isCurrent ? "text-slate-800" : "text-slate-400"
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-2.5 mb-5 transition-colors duration-300"
                style={{
                  background: isDone
                    ? "linear-gradient(90deg, rgba(51,65,85,0.55), rgba(51,65,85,0.35))"
                    : "rgba(203,213,225,0.60)",
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Date helpers ────────────────────────────────────────────────────────────

const DAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const MONTH_SHORT = [
  "sty", "lut", "mar", "kwi", "maj", "cze",
  "lip", "sie", "wrz", "paź", "lis", "gru",
];

function getNext14Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function dateToString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Step transition variants — shared vocabulary (lib/motion) ──────────────

const stepVariants = stepSlide;
const stepVariantsReduced = stepFade;

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function BookingWizard({
  business,
  services,
  employees,
  workingHours,
  initialServiceId,
}: BookingWizardProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const hasEmployees = employees.length > 0;

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId ?? services[0]?.id ?? ""
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null); // null = "dowolny"
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const slotsAbortRef = useRef<AbortController | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  // addonId → quantity. Empty by default — never preselect paid add-ons.
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [couponInput, setCouponInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponPending, setCouponPending] = useState(false);

  const days = getNext14Days();

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Add-ons are service-specific: clear the selection whenever the service changes.
  useEffect(() => {
    setSelectedAddons({});
  }, [selectedServiceId]);

  const serviceAddons = selectedService?.addons ?? [];

  // Client-side view of the selected add-ons (display only — the server
  // recomputes authoritatively and ignores these values).
  const addonLines = useMemo(
    () =>
      serviceAddons
        .filter((a) => (selectedAddons[a.id] ?? 0) > 0)
        .map((a) => {
          const quantity = selectedAddons[a.id];
          return {
            id: a.id,
            name: a.name,
            quantity,
            totalPrice: a.priceIncrease * quantity,
            totalDuration: a.durationIncrease * quantity,
          };
        }),
    [serviceAddons, selectedAddons]
  );

  const basePrice = selectedService ? selectedService.discountedPrice ?? selectedService.price : 0;
  const addonsTotalPrice = addonLines.reduce((s, l) => s + l.totalPrice, 0);
  const addonsTotalDuration = addonLines.reduce((s, l) => s + l.totalDuration, 0);
  const subtotal = basePrice + addonsTotalPrice;
  const finalDuration = (selectedService?.duration ?? 0) + addonsTotalDuration;

  // Serialized add-on selection for the availability query (id:qty,id:qty).
  const addonParam = useMemo(
    () =>
      Object.entries(selectedAddons)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => `${id}:${q}`)
        .join(","),
    [selectedAddons]
  );

  const appliedCoupon = couponPreview?.ok ? couponPreview : null;
  const effectiveFinal = appliedCoupon ? appliedCoupon.finalTotal : subtotal;

  // A coupon is valid only for the exact service+add-on subtotal it was checked
  // against — clear it whenever the service or add-ons change.
  useEffect(() => {
    setCouponPreview(null);
    setCouponInput("");
  }, [selectedServiceId, addonParam]);

  const applyCoupon = useCallback(() => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponPending(true);
    previewCoupon({
      businessId: business.id,
      serviceId: selectedServiceId,
      code,
      addons: Object.entries(selectedAddons)
        .filter(([, q]) => q > 0)
        .map(([addonId, quantity]) => ({ addonId, quantity })),
    })
      .then((res) => setCouponPreview(res))
      .catch(() => setCouponPreview({ ok: false, message: "Nie udało się sprawdzić kuponu." }))
      .finally(() => setCouponPending(false));
  }, [couponInput, business.id, selectedServiceId, selectedAddons]);
  const selectedEmployee =
    selectedEmployeeId
      ? employees.find((e) => e.id === selectedEmployeeId) ?? null
      : null;

  const fetchSlots = useCallback(
    async (date: string) => {
      if (!date || !selectedServiceId) return;
      // Cancel any in-flight request so a fast date change can't let a stale
      // response overwrite the current one.
      slotsAbortRef.current?.abort();
      const controller = new AbortController();
      slotsAbortRef.current = controller;

      setLoadingSlots(true);
      setSlotsError(false);
      setAvailableSlots([]);
      setSelectedTime("");
      try {
        const params = new URLSearchParams({
          businessId: business.id,
          serviceId: selectedServiceId,
          date,
          ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
          ...(addonParam ? { addons: addonParam } : {}),
        });
        const res = await fetch(`/api/availability?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { slots?: string[] };
        if (controller.signal.aborted) return;
        setAvailableSlots(data.slots ?? []);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // superseded — ignore
        setSlotsError(true);
        setAvailableSlots([]);
      } finally {
        if (!controller.signal.aborted) setLoadingSlots(false);
      }
    },
    [business.id, selectedServiceId, selectedEmployeeId, addonParam]
  );

  useEffect(() => {
    if (step === 3 && selectedDate) {
      fetchSlots(selectedDate);
    }
    return () => slotsAbortRef.current?.abort();
  }, [step, selectedDate, fetchSlots]);

  const goNext = () => {
    setDirection(1);
    if (step === 1) {
      if (hasEmployees) setStep(2);
      else setStep(3);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const goBack = () => {
    setDirection(-1);
    if (step === 3) {
      if (hasEmployees) setStep(2);
      else setStep(1);
    } else if (step === 2) {
      setStep(1);
    } else if (step === 4) {
      setStep(3);
    }
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const { createAppointment } = await import("@/lib/actions/appointments");
      await createAppointment({
        businessId: business.id,
        serviceId: selectedServiceId,
        employeeId: selectedEmployeeId ?? undefined,
        date: selectedDate,
        time: selectedTime,
        customerNote: notes || undefined,
        addons: Object.entries(selectedAddons)
          .filter(([, q]) => q > 0)
          .map(([addonId, quantity]) => ({ addonId, quantity })),
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      });

      setDirection(1);
      setStep(5);
    } catch (err) {
      const error = err as { message?: string };
      if (error.message?.includes("login") || error.message?.includes("auth") || error.message?.includes("Unauthorized")) {
        router.push(
          `/login?redirect=${encodeURIComponent(`/b/${business.slug}/book?serviceId=${selectedServiceId}`)}`
        );
        return;
      }
      setSubmitError(error.message ?? "Wystąpił błąd. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Footer nav config per step
  const nextDisabled =
    step === 1 ? !selectedServiceId : step === 3 ? !selectedDate || !selectedTime : false;

  const price = selectedService ? formatCurrency(effectiveFinal) : "";

  const summaryMeta = selectedService
    ? [
        formatDuration(finalDuration),
        selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName.charAt(0)}.` : null,
        selectedDate && selectedTime
          ? `${formatDate(selectedDate, { day: "numeric", month: "short" })} · ${selectedTime}`
          : null,
      ].filter(Boolean).join(" · ")
    : "";

  return (
    <div>
      {step !== 5 && (
        <>
          <div className="mb-6">
            <Link
              href={`/b/${business.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
              </svg>
              <span className="truncate max-w-[280px]">{business.name}</span>
            </Link>
            <h1 className="text-[1.75rem] font-bold text-slate-900 leading-tight" style={{ letterSpacing: "-0.03em" }}>
              Rezerwacja
            </h1>
          </div>
          <StepIndicator current={step} hasEmployees={hasEmployees} />
        </>
      )}

      <div className="relative rounded-3xl" style={S.card}>
        {/* Chrome top specular edge */}
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)" }}
        />

        <div className="px-5 sm:px-6 pt-5 sm:pt-6 overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={reduceMotion ? stepVariantsReduced : stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Step 1: Wybierz usługę */}
              {step === 1 && (
                <div className="pb-5">
                  <h2 className="text-base font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.015em" }}>
                    Wybierz usługę
                  </h2>
                  {services.length === 0 ? (
                    <div className="text-center py-10 rounded-2xl" style={S.panel}>
                      <p className="text-sm text-slate-500">Ten salon nie ma jeszcze dostępnych usług.</p>
                      <Link
                        href={`/b/${business.slug}`}
                        className="inline-block mt-3 text-sm font-semibold text-slate-700 underline underline-offset-2"
                      >
                        Wróć do profilu salonu
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2" role="group" aria-label="Usługa">
                      {services.map((service) => {
                        const isSelected = selectedServiceId === service.id;
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => setSelectedServiceId(service.id)}
                            aria-pressed={isSelected}
                            className="w-full text-left p-4 rounded-xl transition-all duration-150"
                            style={isSelected ? S.rowSelected : S.row}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-semibold", isSelected ? "text-white" : "text-slate-900")}>
                                  {service.name}
                                </p>
                                {service.description && (
                                  <p className={cn("text-xs mt-0.5 line-clamp-2", isSelected ? "text-slate-300" : "text-slate-500")}>
                                    {service.description}
                                  </p>
                                )}
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-xs",
                                    isSelected ? "text-slate-200" : "text-slate-600"
                                  )}
                                  style={
                                    isSelected
                                      ? { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }
                                      : { background: "rgba(203,213,225,0.25)", border: "1px solid rgba(203,213,225,0.35)" }
                                  }
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                  </svg>
                                  {formatDuration(service.duration)}
                                </span>
                              </div>
                              <div className="text-right flex-shrink-0">
                                {service.discountedPrice ? (
                                  <>
                                    <p className={cn("text-sm font-bold tabular-nums", isSelected ? "text-white" : "text-slate-900")}>
                                      {formatCurrency(service.discountedPrice)}
                                    </p>
                                    <p className={cn("text-xs line-through tabular-nums", isSelected ? "text-slate-400" : "text-slate-400")}>
                                      {formatCurrency(service.price)}
                                    </p>
                                  </>
                                ) : (
                                  <p className={cn("text-sm font-bold tabular-nums", isSelected ? "text-white" : "text-slate-900")}>
                                    {formatCurrency(service.price)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Add-ons — shown once a service is chosen, before date/time
                      (they change duration → availability). Never preselected. */}
                  {selectedService && serviceAddons.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-slate-900" style={{ letterSpacing: "-0.015em" }}>
                        Dodatki <span className="font-normal text-slate-400">(opcjonalnie)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 mb-3">Rozszerz wizytę — wpływają na czas i cenę.</p>
                      <div className="space-y-2" role="group" aria-label="Dodatki do usługi">
                        {serviceAddons.map((a) => {
                          const qty = selectedAddons[a.id] ?? 0;
                          const on = qty > 0;
                          return (
                            <div
                              key={a.id}
                              className="p-3.5 rounded-xl flex items-center gap-3 transition-all duration-150"
                              style={{
                                ...S.row,
                                ...(on ? { borderColor: "#0F172A", boxShadow: "0 0 0 1.5px rgba(15,23,42,0.85)" } : {}),
                              }}
                            >
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                aria-label={`${a.name}, +${a.priceIncrease} zł${a.durationIncrease > 0 ? `, +${a.durationIncrease} minut` : ""}`}
                                onClick={() =>
                                  setSelectedAddons((prev) => {
                                    const next = { ...prev };
                                    if (a.id in next) delete next[a.id];
                                    else next[a.id] = a.hasQuantity ? a.defaultQuantity : 1;
                                    return next;
                                  })
                                }
                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                              >
                                <span
                                  aria-hidden="true"
                                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                                  style={
                                    on
                                      ? { background: INK, border: "1px solid #0F172A" }
                                      : { background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(148,163,184,0.6)" }
                                  }
                                >
                                  {on && (
                                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm font-semibold text-slate-900 truncate">{a.name}</span>
                                  {a.description && <span className="block text-xs text-slate-500 truncate">{a.description}</span>}
                                  <span className="block text-xs text-slate-600 tabular-nums mt-0.5">
                                    +{formatCurrency(a.priceIncrease)}
                                    {a.durationIncrease > 0 && ` · +${a.durationIncrease} min`}
                                    {a.hasQuantity && " / szt."}
                                  </span>
                                </span>
                              </button>

                              {on && a.hasQuantity && (
                                <div className="flex items-center gap-2 flex-shrink-0" role="group" aria-label={`Ilość — ${a.name}`}>
                                  <button
                                    type="button"
                                    aria-label="Mniej"
                                    disabled={qty <= a.minQuantity}
                                    onClick={() => setSelectedAddons((p) => ({ ...p, [a.id]: Math.max(a.minQuantity, (p[a.id] ?? a.defaultQuantity) - 1) }))}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 disabled:opacity-30"
                                    style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(203,213,225,0.6)" }}
                                  >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14" /></svg>
                                  </button>
                                  <span className="text-sm font-bold text-slate-900 tabular-nums w-5 text-center" aria-live="polite">{qty}</span>
                                  <button
                                    type="button"
                                    aria-label="Więcej"
                                    disabled={qty >= a.maxQuantity}
                                    onClick={() => setSelectedAddons((p) => ({ ...p, [a.id]: Math.min(a.maxQuantity, (p[a.id] ?? a.defaultQuantity) + 1) }))}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 disabled:opacity-30"
                                    style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(203,213,225,0.6)" }}
                                  >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex items-center justify-between px-1 text-sm">
                        <span className="text-slate-500">Razem z dodatkami</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {formatCurrency(subtotal)} · {formatDuration(finalDuration)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Wybierz specjalistę */}
              {step === 2 && hasEmployees && (
                <div className="pb-5">
                  <h2 className="text-base font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.015em" }}>
                    Wybierz specjalistę
                  </h2>
                  <div className="space-y-2" role="group" aria-label="Specjalista">
                    {/* Any employee option */}
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeId(null)}
                      aria-pressed={selectedEmployeeId === null}
                      className="w-full text-left p-4 rounded-xl transition-all duration-150 flex items-center gap-3"
                      style={selectedEmployeeId === null ? S.rowSelected : S.row}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={
                          selectedEmployeeId === null
                            ? { background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)" }
                            : { background: "rgba(203,213,225,0.28)", border: "1px solid rgba(203,213,225,0.40)" }
                        }
                      >
                        <svg
                          className={cn("w-5 h-5", selectedEmployeeId === null ? "text-slate-200" : "text-slate-500")}
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", selectedEmployeeId === null ? "text-white" : "text-slate-900")}>
                          Dowolny specjalista
                        </p>
                        <p className={cn("text-xs", selectedEmployeeId === null ? "text-slate-300" : "text-slate-500")}>
                          Pierwszy dostępny
                        </p>
                      </div>
                    </button>

                    {employees.map((employee) => {
                      const isSelected = selectedEmployeeId === employee.id;
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => setSelectedEmployeeId(employee.id)}
                          aria-pressed={isSelected}
                          className="w-full text-left p-4 rounded-xl transition-all duration-150 flex items-center gap-3"
                          style={isSelected ? S.rowSelected : S.row}
                        >
                          {employee.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={employee.avatarUrl}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: employee.color }}
                            >
                              <span className="text-white text-xs font-bold">
                                {getInitials(employee.firstName, employee.lastName)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-semibold", isSelected ? "text-white" : "text-slate-900")}>
                              {employee.firstName} {employee.lastName}
                            </p>
                            {employee.bio && (
                              <p className={cn("text-xs mt-0.5 line-clamp-1", isSelected ? "text-slate-300" : "text-slate-500")}>
                                {employee.bio}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Wybierz termin */}
              {step === 3 && (
                <div className="pb-5">
                  <h2 className="text-base font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.015em" }}>
                    Wybierz termin
                  </h2>

                  {/* Date rail */}
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase mb-2" style={{ letterSpacing: "0.08em" }}>
                      Data
                    </p>
                    <div
                      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar snap-x"
                      role="group"
                      aria-label="Data wizyty"
                    >
                      {days.map((day) => {
                        const dateStr = dateToString(day);
                        const dayOfWeekIdx = day.getDay();
                        const isSelected = selectedDate === dateStr;
                        const isToday = dateStr === dateToString(new Date());

                        const dayName = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][dayOfWeekIdx];
                        const wh = workingHours.find((w) => w.dayOfWeek === dayName);
                        const isOpen = wh?.isOpen ?? false;

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            disabled={!isOpen}
                            aria-pressed={isSelected}
                            aria-label={`${day.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}${!isOpen ? " — zamknięte" : ""}`}
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setSelectedTime("");
                            }}
                            className={cn(
                              "flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-xl text-center transition-all duration-150 min-w-[58px] snap-start",
                              !isOpen && "opacity-35 cursor-not-allowed"
                            )}
                            style={isSelected ? S.rowSelected : S.row}
                          >
                            <span className={cn("text-[10px] font-medium", isSelected ? "text-slate-300" : "text-slate-500")}>
                              {DAY_SHORT[dayOfWeekIdx]}
                            </span>
                            <span className={cn("text-sm font-bold mt-0.5 tabular-nums", isSelected ? "text-white" : "text-slate-800")}>
                              {day.getDate()}
                            </span>
                            <span className={cn("text-[10px]", isSelected ? "text-slate-300" : "text-slate-500")}>
                              {MONTH_SHORT[day.getMonth()]}
                            </span>
                            {isToday && (
                              <span className={cn("text-[9px] font-semibold mt-0.5", isSelected ? "text-slate-200" : "text-slate-400")}>
                                dziś
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time slots */}
                  {selectedDate && (
                    <div className="mt-5" aria-busy={loadingSlots} aria-live="polite">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase mb-2" style={{ letterSpacing: "0.08em" }}>
                        Godzina
                      </p>
                      {loadingSlots ? (
                        <>
                          <p className="text-sm text-slate-500 mb-2">Sprawdzamy dostępność…</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div
                                key={i}
                                className="h-10 rounded-xl animate-pulse"
                                style={{ background: "rgba(203,213,225,0.30)" }}
                              />
                            ))}
                          </div>
                        </>
                      ) : slotsError ? (
                        <div
                          className="text-center py-8 rounded-xl"
                          style={{ border: "1px dashed rgba(244,63,94,0.35)", background: "rgba(254,242,242,0.60)" }}
                        >
                          <p className="text-sm text-slate-700">Nie udało się sprawdzić dostępności.</p>
                          <button
                            type="button"
                            onClick={() => fetchSlots(selectedDate)}
                            className="mt-2 text-sm font-semibold text-slate-900 underline underline-offset-4"
                          >
                            Spróbuj ponownie
                          </button>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div
                          className="text-center py-8 rounded-xl"
                          style={{ border: "1px dashed rgba(148,163,184,0.45)", background: "rgba(248,250,252,0.60)" }}
                        >
                          <p className="text-sm text-slate-600">Brak dostępnych terminów na ten dzień</p>
                          <p className="text-xs text-slate-500 mt-1">Wybierz inną datę powyżej</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="group" aria-label="Godzina wizyty">
                          {availableSlots.map((slot) => {
                            const isSelected = selectedTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedTime(slot)}
                                aria-pressed={isSelected}
                                className={cn(
                                  "py-2.5 rounded-xl text-sm font-medium tabular-nums transition-all duration-150",
                                  isSelected ? "text-white font-semibold" : "text-slate-700"
                                )}
                                style={isSelected ? S.rowSelected : S.row}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Potwierdzenie */}
              {step === 4 && selectedService && (
                <div className="pb-5">
                  <h2 className="text-base font-bold text-slate-900 mb-4" style={{ letterSpacing: "-0.015em" }}>
                    Potwierdź rezerwację
                  </h2>

                  {/* Summary */}
                  <dl className="rounded-2xl p-4 space-y-3 mb-5" style={S.panel}>
                    {([
                      { label: "Usługa", value: selectedService.name, bold: true },
                      ...addonLines.map((l) => ({
                        label: l.quantity > 1 ? `+ ${l.name} ×${l.quantity}` : `+ ${l.name}`,
                        value: `+${formatCurrency(l.totalPrice)}`,
                        bold: false,
                        nums: true,
                      })),
                      { label: "Czas trwania", value: formatDuration(finalDuration) },
                      ...(appliedCoupon
                        ? [
                            { label: "Suma", value: formatCurrency(appliedCoupon.subtotal), nums: true },
                            { label: `Rabat (${appliedCoupon.code})`, value: `−${formatCurrency(appliedCoupon.discountAmount)}`, nums: true },
                            { label: "Do zapłaty", value: price, bold: true, nums: true },
                          ]
                        : [{ label: addonLines.length > 0 ? "Razem" : "Cena", value: price, bold: true, nums: true }]),
                      {
                        label: "Specjalista",
                        value: selectedEmployee
                          ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                          : "Dowolny specjalista",
                      },
                      {
                        label: "Data",
                        value: formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long" }),
                      },
                      { label: "Godzina", value: selectedTime, bold: true, nums: true },
                    ] as { label: string; value: string; bold?: boolean; nums?: boolean }[]).map((row, i, arr) => (
                      <div key={row.label}>
                        <div className="flex items-start justify-between gap-2">
                          <dt className="text-sm text-slate-500">{row.label}</dt>
                          <dd
                            className={cn(
                              "text-sm text-slate-900 text-right",
                              row.bold ? "font-semibold" : "font-medium",
                              row.nums && "tabular-nums"
                            )}
                          >
                            {row.value}
                          </dd>
                        </div>
                        {i < arr.length - 1 && (
                          <div className="h-px mt-3" style={{ background: "rgba(203,213,225,0.40)" }} />
                        )}
                      </div>
                    ))}
                  </dl>

                  {/* Coupon */}
                  <div className="mb-4">
                    <label htmlFor="booking-coupon" className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Kod rabatowy <span className="text-slate-400 font-normal">— opcjonalnie</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="booking-coupon"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyCoupon();
                          }
                        }}
                        placeholder="WELCOME20"
                        disabled={!!appliedCoupon}
                        className="input-glass flex-1 px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400 uppercase tabular-nums disabled:opacity-60"
                      />
                      {appliedCoupon ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCouponPreview(null);
                            setCouponInput("");
                          }}
                          className="px-4 rounded-xl text-sm font-semibold text-slate-600 flex-shrink-0"
                          style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(203,213,225,0.55)" }}
                        >
                          Usuń
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={applyCoupon}
                          disabled={couponPending || !couponInput.trim()}
                          className="px-4 rounded-xl text-sm font-semibold disabled:opacity-50 flex-shrink-0"
                          style={{ background: INK, border: "1px solid #0F172A", color: "#F8FAFC" }}
                        >
                          {couponPending ? "…" : "Zastosuj"}
                        </button>
                      )}
                    </div>
                    {couponPreview && (
                      <p role="status" className="text-xs mt-1.5 font-medium" style={{ color: couponPreview.ok ? "#047857" : "#BE123C" }}>
                        {couponPreview.ok
                          ? `${couponPreview.message} Rabat −${formatCurrency(couponPreview.discountAmount)}.`
                          : couponPreview.message}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label htmlFor="booking-notes" className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Uwagi dla specjalisty{" "}
                      <span className="text-slate-400 font-normal">— opcjonalnie</span>
                    </label>
                    <textarea
                      id="booking-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Np. alergie, preferencje, pytania..."
                      rows={3}
                      className="input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800 resize-none transition-shadow"
                    />
                  </div>

                  {/* Cancellation note */}
                  <p className="flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
                    </svg>
                    Wizytę możesz bezpłatnie odwołać lub przełożyć w swoim panelu klienta.
                  </p>

                  {submitError && (
                    <div
                      role="alert"
                      className="mt-4 px-4 py-3 rounded-xl"
                      style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}
                    >
                      <p className="text-sm font-medium" style={{ color: "#BE123C" }}>{submitError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Sukces */}
              {step === 5 && selectedService && (
                <div className="text-center pt-3 pb-6">
                  <motion.div
                    initial={reduceMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                    animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                    transition={reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 320, damping: 18, delay: 0.05 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{
                      background: "rgba(16,185,129,0.10)",
                      border: "1px solid rgba(16,185,129,0.25)",
                      boxShadow: "0 0 0 0.5px rgba(16,185,129,0.15), 0 8px 24px rgba(16,185,129,0.10), inset 0 1px 0 rgba(255,255,255,0.60)",
                    }}
                  >
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth={2} aria-hidden="true">
                      <motion.path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m7.5 12.5 3 3 6-7"
                        initial={reduceMotion ? { opacity: 1 } : { pathLength: 0 }}
                        animate={reduceMotion ? { opacity: 1 } : { pathLength: 1 }}
                        transition={reduceMotion ? undefined : { delay: 0.28, duration: 0.4, ease: "easeOut" }}
                      />
                    </svg>
                  </motion.div>

                  <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ letterSpacing: "-0.02em" }}>
                    Rezerwacja wysłana!
                  </h2>
                  <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                    Salon potwierdzi Twoją wizytę — damy Ci znać e-mailem i w powiadomieniach.
                  </p>

                  {/* Appointment card */}
                  <div className="rounded-2xl p-4 space-y-2.5 mb-6 text-left" style={S.panel}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Salon</span>
                      <span className="font-semibold text-slate-900">{business.name}</span>
                    </div>
                    <div className="h-px" style={{ background: "rgba(203,213,225,0.40)" }} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Usługa</span>
                      <span className="font-medium text-slate-900">{selectedService.name}</span>
                    </div>
                    <div className="h-px" style={{ background: "rgba(203,213,225,0.40)" }} />
                    {addonLines.map((l) => (
                      <div key={l.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 truncate pr-2">+ {l.name}{l.quantity > 1 ? ` ×${l.quantity}` : ""}</span>
                          <span className="font-medium text-slate-900 tabular-nums">+{formatCurrency(l.totalPrice)}</span>
                        </div>
                        <div className="h-px mt-2.5" style={{ background: "rgba(203,213,225,0.40)" }} />
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Czas trwania</span>
                      <span className="font-medium text-slate-900 tabular-nums">{formatDuration(finalDuration)}</span>
                    </div>
                    <div className="h-px" style={{ background: "rgba(203,213,225,0.40)" }} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Specjalista</span>
                      <span className="font-medium text-slate-900">
                        {selectedEmployee
                          ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                          : "Dowolny specjalista"}
                      </span>
                    </div>
                    <div className="h-px" style={{ background: "rgba(203,213,225,0.40)" }} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Data i godzina</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {formatDate(selectedDate, { day: "numeric", month: "short" })} · {selectedTime}
                      </span>
                    </div>
                    <div className="h-px" style={{ background: "rgba(203,213,225,0.40)" }} />
                    {appliedCoupon && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Rabat ({appliedCoupon.code})</span>
                          <span className="font-medium tabular-nums" style={{ color: "#047857" }}>
                            −{formatCurrency(appliedCoupon.discountAmount)}
                          </span>
                        </div>
                        <div className="h-px" style={{ background: "rgba(203,213,225,0.40)" }} />
                      </>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Do zapłaty</span>
                      <span className="font-bold text-slate-900 tabular-nums">{price}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <motion.div whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.982 }} transition={SPRING}>
                      <Link
                        href="/customer/dashboard"
                        className="block w-full py-3 rounded-xl text-sm font-semibold text-center"
                        style={{ background: INK, border: "1px solid #0F172A", color: "#F8FAFC", boxShadow: INK_SHADOW }}
                      >
                        Moje rezerwacje
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.982 }} transition={SPRING}>
                      <Link
                        href={`/b/${business.slug}`}
                        className="block w-full py-3 rounded-xl text-sm font-semibold text-center"
                        style={{
                          background: "rgba(255,255,255,0.72)",
                          border: "1px solid rgba(203,213,225,0.55)",
                          color: "#334155",
                          boxShadow: "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.90)",
                        }}
                      >
                        Wróć do salonu
                      </Link>
                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sticky footer — running summary + navigation */}
        {step !== 5 && (
          <div className="sticky bottom-0 z-10 rounded-b-3xl px-5 sm:px-6 pt-3.5 pb-4" style={S.footer}>
            {selectedService && (
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{selectedService.name}</p>
                  <p className="text-xs text-slate-500 truncate tabular-nums">{summaryMeta}</p>
                </div>
                <p className="text-base font-bold text-slate-900 tabular-nums flex-shrink-0" style={{ letterSpacing: "-0.01em" }}>
                  {price}
                </p>
              </div>
            )}
            <div className="flex gap-2.5">
              {step > 1 && (
                <GhostBtn onClick={goBack} disabled={isSubmitting} className="px-5">
                  Wstecz
                </GhostBtn>
              )}
              {step === 4 ? (
                <PrimaryBtn onClick={handleConfirm} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0 1 8-8" />
                      </svg>
                      Potwierdzanie...
                    </span>
                  ) : (
                    "Potwierdź rezerwację"
                  )}
                </PrimaryBtn>
              ) : (
                <PrimaryBtn onClick={goNext} disabled={nextDisabled} className="flex-1">
                  Dalej
                </PrimaryBtn>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
