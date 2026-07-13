"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rescheduleAppointment } from "@/lib/actions/appointments";
import { cn } from "@/lib/utils";
import { GlassModal, ModalInkButton, ModalGlassButton } from "@/components/ui/glass-modal";
import { INK_GRADIENT, OVERLINE_CLS } from "@/components/ui/glass/tokens";

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
        className="btn-spring text-xs font-semibold px-3 py-1.5 rounded-lg"
        style={{
          background: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(203,213,225,0.55)",
          color: "#334155",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)",
        }}
      >
        Przełóż wizytę
      </button>

      <GlassModal
        open={open}
        onOpenChange={(o) => { if (!o) close(); }}
        title="Przełóż wizytę"
        description={`${serviceName} — ${businessName}`}
      >
        {/* Date rail */}
        <p className={cn(OVERLINE_CLS, "mb-2")}>Nowa data</p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar snap-x">
          {days.map((day) => {
            const dateStr = dateToString(day);
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                aria-pressed={isSelected}
                aria-label={`${DAY_SHORT[day.getDay()]} ${day.getDate()} ${MONTH_SHORT[day.getMonth()]}`}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-xl text-center transition-all min-w-[56px] snap-start",
                  isSelected ? "text-white" : "text-slate-600"
                )}
                style={isSelected
                  ? { background: INK_GRADIENT, border: "1px solid #0F172A", boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" }
                  : { background: "rgba(255,255,255,0.75)", border: "1px solid rgba(203,213,225,0.50)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }}
              >
                <span className="text-[10px] font-medium">{DAY_SHORT[day.getDay()]}</span>
                <span className="text-sm font-bold mt-0.5 tabular-nums">{day.getDate()}</span>
                <span className="text-[10px]">{MONTH_SHORT[day.getMonth()]}</span>
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="mt-4" aria-live="polite" aria-busy={loadingSlots}>
            <p className={cn(OVERLINE_CLS, "mb-2")}>Godzina</p>
            {loadingSlots ? (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(203,213,225,0.25)" }} />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div
                className="text-center py-6 rounded-xl"
                style={{ background: "rgba(203,213,225,0.14)", border: "1px dashed rgba(203,213,225,0.55)" }}
              >
                <p className="text-sm text-slate-500">Brak dostępnych terminów na ten dzień</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const active = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      aria-pressed={active}
                      className={cn(
                        "py-2.5 rounded-xl text-sm font-semibold tabular-nums transition-all",
                        active ? "text-white" : "text-slate-600"
                      )}
                      style={active
                        ? { background: INK_GRADIENT, border: "1px solid #0F172A", boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" }
                        : { background: "rgba(255,255,255,0.75)", border: "1px solid rgba(203,213,225,0.50)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 px-4 py-3 rounded-xl"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}
          >
            <p className="text-sm font-medium" style={{ color: "#BE123C" }}>{error}</p>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <ModalGlassButton onClick={close} disabled={isPending}>
            Anuluj
          </ModalGlassButton>
          <ModalInkButton
            onClick={submit}
            disabled={!selectedDate || !selectedTime || isPending}
          >
            {isPending ? "Przekładanie…" : "Potwierdź nowy termin"}
          </ModalInkButton>
        </div>

        <p className="mt-3 text-center text-xs text-slate-400">
          Salon otrzyma powiadomienie i potwierdzi nowy termin
        </p>
      </GlassModal>
    </>
  );
}
