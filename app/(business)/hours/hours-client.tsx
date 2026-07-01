"use client";

import { useState, useTransition } from "react";
import { updateWorkingHours } from "@/lib/actions/business";
import type { DayOfWeek } from "@prisma/client";

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
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Godziny pracy</h1>
          <p className="text-sm text-surface-700 mt-0.5">
            Ustaw godziny otwarcia dla każdego dnia tygodnia
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {isPending ? (
            <>
              <SpinnerIcon className="w-4 h-4 animate-spin" />
              Zapisywanie...
            </>
          ) : saved ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Zapisano
            </>
          ) : (
            "Zapisz zmiany"
          )}
        </button>
      </div>

      {/* Hours grid */}
      <div className="bg-white border border-surface-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h3 className="text-sm font-semibold text-gray-900">Godziny otwarcia</h3>
        </div>
        <div className="divide-y divide-surface-100">
          {hours.map((day) => (
            <div
              key={day.dayOfWeek}
              className={`flex items-center gap-4 px-6 py-4 ${!day.isOpen ? "opacity-60" : ""}`}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day.dayOfWeek)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                  day.isOpen ? "bg-brand-600" : "bg-surface-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    day.isOpen ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>

              {/* Day name */}
              <span className="w-32 text-sm font-medium text-gray-900 flex-shrink-0">
                {DAY_LABELS[day.dayOfWeek]}
              </span>

              {/* Time inputs */}
              {day.isOpen ? (
                <div className="flex items-center gap-3 flex-1">
                  <select
                    value={day.openTime}
                    onChange={(e) => updateTime(day.dayOfWeek, "openTime", e.target.value)}
                    className="border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-surface-700 text-sm">–</span>
                  <select
                    value={day.closeTime}
                    onChange={(e) => updateTime(day.dayOfWeek, "closeTime", e.target.value)}
                    className="border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-xs text-surface-700">
                    {calculateHours(day.openTime, day.closeTime)} godz.
                  </span>
                </div>
              ) : (
                <span className="text-sm text-surface-700 italic">Zamknięte</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Special days placeholder */}
      <div className="bg-white border border-surface-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h3 className="text-sm font-semibold text-gray-900">Dni specjalne</h3>
          <p className="text-xs text-surface-700 mt-0.5">Urlopy, święta i inne wyjątki</p>
        </div>
        <div className="px-6 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-3">
            <CalendarIcon className="w-5 h-5 text-surface-700" />
          </div>
          <p className="text-sm font-medium text-gray-900">Wkrótce</p>
          <p className="text-xs text-surface-700 mt-1">
            Możliwość ustawiania dni wolnych i godzin wyjątkowych pojawi się wkrótce.
          </p>
        </div>
      </div>
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

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
    </svg>
  );
}
