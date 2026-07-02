"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rescheduleAppointment } from "@/lib/actions/appointments";
import { cn } from "@/lib/utils";

interface RescheduleButtonProps {
  appointmentId: string;
  businessId: string;
  serviceId: string;
  employeeId: string | null;
  serviceName: string;
  businessName: string;
}

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

export default function RescheduleButton({
  appointmentId,
  businessId,
  serviceId,
  employeeId,
  serviceName,
  businessName,
}: RescheduleButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const days = getNext14Days();

  const fetchSlots = useCallback(
    async (date: string) => {
      setLoadingSlots(true);
      setSlots([]);
      setSelectedTime("");
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
    },
    [businessId, serviceId, employeeId]
  );

  useEffect(() => {
    if (open && selectedDate) fetchSlots(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDate]);

  const close = () => {
    setOpen(false);
    setSelectedDate("");
    setSelectedTime("");
    setError("");
  };

  const submit = () => {
    if (!selectedDate || !selectedTime) return;
    setError("");
    startTransition(async () => {
      try {
        await rescheduleAppointment({
          appointmentId,
          date: selectedDate,
          time: selectedTime,
        });
        close();
        router.refresh();
      } catch (err) {
        const e = err as { message?: string };
        setError(e.message ?? "Wystąpił błąd. Spróbuj ponownie.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
      >
        Przełóż wizytę
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">Przełóż wizytę</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Zamknij"
                className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {serviceName} — {businessName}
            </p>

            {/* Date chips */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Nowa data
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {days.map((day) => {
                const dateStr = dateToString(day);
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-xl border text-center transition-all min-w-[56px]",
                      isSelected
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <span className="text-[10px] font-medium">{DAY_SHORT[day.getDay()]}</span>
                    <span className="text-sm font-bold mt-0.5">{day.getDate()}</span>
                    <span className="text-[10px]">{MONTH_SHORT[day.getMonth()]}</span>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Godzina
                </p>
                {loadingSlots ? (
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-500">Brak dostępnych terminów na ten dzień</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
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

            {error && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!selectedDate || !selectedTime || isPending}
                className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {isPending ? "Przekładanie..." : "Potwierdź nowy termin"}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-gray-400">
              Salon otrzyma powiadomienie i potwierdzi nowy termin
            </p>
          </div>
        </div>
      )}
    </>
  );
}
