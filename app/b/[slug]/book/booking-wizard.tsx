"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDuration, formatDate, getInitials, cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  discountedPrice: number | null;
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
  const displayStep = current === 5 ? steps.length : hasEmployees ? current - 1 : current > 2 ? current - 2 : current - 1;

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = displayStep > stepNum;
        const isCurrent = displayStep === stepNum;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  isDone
                    ? "bg-gray-900 text-white"
                    : isCurrent
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {isDone ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span className={cn("text-[10px] font-medium", isCurrent ? "text-gray-900" : "text-gray-400")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-2 mb-4 transition-colors",
                  displayStep > stepNum ? "bg-gray-900" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Date chips ──────────────────────────────────────────────────────────────

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

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function BookingWizard({
  business,
  services,
  employees,
  workingHours,
  initialServiceId,
}: BookingWizardProps) {
  const router = useRouter();
  const hasEmployees = employees.length > 0;

  const [step, setStep] = useState<Step>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId ?? services[0]?.id ?? ""
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null); // null = "dowolny"
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");

  const days = getNext14Days();

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedEmployee =
    selectedEmployeeId
      ? employees.find((e) => e.id === selectedEmployeeId) ?? null
      : null;

  const fetchSlots = useCallback(
    async (date: string) => {
      if (!date || !selectedServiceId) return;
      setLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedTime("");
      try {
        const params = new URLSearchParams({
          businessId: business.id,
          serviceId: selectedServiceId,
          date,
          ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
        });
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = (await res.json()) as { slots?: string[] };
        setAvailableSlots(data.slots ?? []);
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [business.id, selectedServiceId, selectedEmployeeId]
  );

  useEffect(() => {
    if (step === 3 && selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [step, selectedDate, fetchSlots]);

  const goNext = () => {
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
      });

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

  const effectiveStep = step === 5 ? 5 : step;

  return (
    <div>
      {step !== 5 && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Rezerwacja</h1>
            <p className="text-sm text-gray-500 mt-1">{business.name}</p>
          </div>
          <StepIndicator current={effectiveStep} hasEmployees={hasEmployees} />
        </>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl shadow-soft p-6">
        {/* Step 1: Wybierz usługę */}
        {step === 1 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">Wybierz usługę</h2>
            <div className="space-y-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all",
                    selectedServiceId === service.id
                      ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-gray-100 rounded-md text-xs text-gray-600">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        {formatDuration(service.duration)}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {service.discountedPrice ? (
                        <>
                          <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(service.discountedPrice)}
                          </p>
                          <p className="text-xs text-gray-400 line-through">
                            {formatCurrency(service.price)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(service.price)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedServiceId}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Dalej
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Wybierz specjalistę */}
        {step === 2 && hasEmployees && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">Wybierz specjalistę</h2>
            <div className="space-y-2">
              {/* Any employee option */}
              <button
                type="button"
                onClick={() => setSelectedEmployeeId(null)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3",
                  selectedEmployeeId === null
                    ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Dowolny specjalista</p>
                  <p className="text-xs text-gray-500">Pierwszy dostępny</p>
                </div>
              </button>

              {employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3",
                    selectedEmployeeId === employee.id
                      ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {employee.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={employee.avatarUrl}
                      alt={`${employee.firstName} ${employee.lastName}`}
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
                    <p className="text-sm font-semibold text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </p>
                    {employee.bio && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{employee.bio}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Wstecz
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Dalej
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Wybierz termin */}
        {step === 3 && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">Wybierz termin</h2>

            {/* Date chips */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Data
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {days.map((day) => {
                  const dateStr = dateToString(day);
                  const dayOfWeekIdx = day.getDay();
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === dateToString(new Date());

                  // Check if business is open that day
                  const dayName = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][dayOfWeekIdx];
                  const wh = workingHours.find((w) => w.dayOfWeek === dayName);
                  const isOpen = wh?.isOpen ?? false;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={!isOpen}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedTime("");
                        fetchSlots(dateStr);
                      }}
                      className={cn(
                        "flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-xl border text-center transition-all min-w-[56px]",
                        isSelected
                          ? "border-gray-900 bg-gray-900 text-white"
                          : isOpen
                          ? "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          : "border-gray-100 text-gray-300 cursor-not-allowed"
                      )}
                    >
                      <span className="text-[10px] font-medium">{DAY_SHORT[dayOfWeekIdx]}</span>
                      <span className="text-sm font-bold mt-0.5">{day.getDate()}</span>
                      <span className="text-[10px]">{MONTH_SHORT[day.getMonth()]}</span>
                      {isToday && (
                        <span className={cn(
                          "text-[9px] font-semibold mt-0.5",
                          isSelected ? "text-white/70" : "text-gray-400"
                        )}>
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
              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Godzina
                </p>
                {loadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-500">
                      Brak dostępnych terminów na ten dzień
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={cn(
                          "py-2.5 rounded-xl border text-sm font-medium transition-all",
                          selectedTime === slot
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Wstecz
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Dalej
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Potwierdzenie */}
        {step === 4 && selectedService && (
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4">Potwierdź rezerwację</h2>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-gray-500">Usługa</span>
                <span className="text-sm font-semibold text-gray-900 text-right">{selectedService.name}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Czas trwania</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDuration(selectedService.duration)}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Cena</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(selectedService.discountedPrice ?? selectedService.price)}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Specjalista</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedEmployee
                    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                    : "Dowolny specjalista"}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Data</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(selectedDate, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Godzina</span>
                <span className="text-sm font-semibold text-gray-900">{selectedTime}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Uwagi dla specjalisty{" "}
                <span className="text-gray-400 font-normal">— opcjonalnie</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Np. alergie, preferencje, pytania..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder-gray-400 text-gray-800 resize-none"
              />
            </div>

            {submitError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={isSubmitting}
                className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Wstecz
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0 1 8-8" />
                    </svg>
                    Potwierdzanie...
                  </>
                ) : (
                  "Potwierdź rezerwację"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Sukces */}
        {step === 5 && selectedService && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Rezerwacja wysłana!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Salon potwierdzi Twoją wizytę — damy Ci znać e-mailem i w powiadomieniach.
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 mb-6 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Salon</span>
                <span className="font-semibold text-gray-900">{business.name}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Usługa</span>
                <span className="font-medium text-gray-900">{selectedService.name}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Specjalista</span>
                <span className="font-medium text-gray-900">
                  {selectedEmployee
                    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                    : "Dowolny specjalista"}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Data i godzina</span>
                <span className="font-semibold text-gray-900">
                  {formatDate(selectedDate, { day: "numeric", month: "short" })} · {selectedTime}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Do zapłaty</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(selectedService.discountedPrice ?? selectedService.price)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/customer/dashboard"
                className="block w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors text-center"
              >
                Moje rezerwacje
              </Link>
              <Link
                href={`/b/${business.slug}`}
                className="block w-full py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-center"
              >
                Wróć do salonu
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
