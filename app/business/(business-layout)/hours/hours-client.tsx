"use client";

import { useState, useTransition } from "react";
import { updateWorkingHours } from "@/lib/actions/business";
import type { DayOfWeek } from "@prisma/client";
import {
  PageHeader,
  GlassCard,
  CardHeader,
  InkButton,
  HAIRLINE,
  CHIP,
} from "@/components/ui/glass";

type DayHours = {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

type Props = {
  initialHours: DayHours[];
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Poniedziałek",
  TUESDAY: "Wtorek",
  WEDNESDAY: "Środa",
  THURSDAY: "Czwartek",
  FRIDAY: "Piątek",
  SATURDAY: "Sobota",
  SUNDAY: "Niedziela",
};

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export function HoursClient({ initialHours }: Props) {
  const [hours, setHours] = useState<DayHours[]>(initialHours);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggleDay(dayOfWeek: DayOfWeek) {
    setHours((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, isOpen: !h.isOpen } : h
      )
    );
  }

  function updateTime(dayOfWeek: DayOfWeek, field: "openTime" | "closeTime", value: string) {
    setHours((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  }

  function handleSave() {
    startTransition(async () => {
      await updateWorkingHours(hours);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        title="Godziny pracy"
        subtitle="Ustaw godziny otwarcia dla każdego dnia tygodnia"
        actions={
          <InkButton onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" d="M4 12a8 8 0 0 1 8-8" />
                </svg>
                Zapisywanie…
              </>
            ) : saved ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
                Zapisano
              </>
            ) : (
              "Zapisz zmiany"
            )}
          </InkButton>
        }
      />

      {/* Hours grid */}
      <GlassCard className="fade-rise fade-rise-d1 overflow-hidden">
        <CardHeader title="Godziny otwarcia" />
        <div>
          {hours.map((day, i) => (
            <div
              key={day.dayOfWeek}
              className={`flex items-center gap-4 px-5 py-3.5 ${!day.isOpen ? "opacity-55" : ""}`}
              style={i > 0 ? { borderTop: HAIRLINE } : undefined}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day.dayOfWeek)}
                role="switch"
                aria-checked={day.isOpen}
                aria-label={`${DAY_LABELS[day.dayOfWeek]} — ${day.isOpen ? "otwarte" : "zamknięte"}`}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                style={{ background: day.isOpen ? "#0F172A" : "rgba(148,163,184,0.45)" }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${day.isOpen ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>

              {/* Day name */}
              <span className="w-28 sm:w-32 text-sm font-medium text-slate-800 flex-shrink-0">
                {DAY_LABELS[day.dayOfWeek]}
              </span>

              {/* Time inputs */}
              {day.isOpen ? (
                <div className="flex items-center gap-2.5 flex-1 flex-wrap">
                  <select
                    value={day.openTime}
                    onChange={(e) => updateTime(day.dayOfWeek, "openTime", e.target.value)}
                    aria-label={`${DAY_LABELS[day.dayOfWeek]} — otwarcie`}
                    className="input-glass rounded-xl px-3 py-2 text-sm outline-none text-slate-800 tabular-nums"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-sm">–</span>
                  <select
                    value={day.closeTime}
                    onChange={(e) => updateTime(day.dayOfWeek, "closeTime", e.target.value)}
                    aria-label={`${DAY_LABELS[day.dayOfWeek]} — zamknięcie`}
                    className="input-glass rounded-xl px-3 py-2 text-sm outline-none text-slate-800 tabular-nums"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span
                    className="text-[11px] font-medium text-slate-500 px-2 py-0.5 rounded-full tabular-nums"
                    style={CHIP}
                  >
                    {calculateHours(day.openTime, day.closeTime)} godz.
                  </span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 italic">Zamknięte</span>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Special days placeholder */}
      <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
        <CardHeader title="Dni specjalne" />
        <div className="px-6 py-8 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400"
            style={CHIP}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800">Urlopy i święta</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Możliwość ustawiania dni wolnych i godzin wyjątkowych pojawi się wkrótce.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

function calculateHours(open: string, close: string): string {
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const diff = ((ch ?? 0) * 60 + (cm ?? 0)) - ((oh ?? 0) * 60 + (om ?? 0));
  if (diff <= 0) return "0";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}:${String(m).padStart(2, "0")}` : String(h);
}
