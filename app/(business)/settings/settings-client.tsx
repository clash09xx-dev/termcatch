"use client";

import { useState, useTransition } from "react";
import { updateBusinessSettings } from "@/lib/actions/business";

type Settings = {
  advanceBookingDays: number;
  minAdvanceHours: number;
  timeSlotDuration: number;
  cancellationHours: number;
  cancellationFeeType: string;
  cancellationFeeValue: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
};

type Props = {
  settings: Settings;
};

type Section = "rezerwacje" | "anulowanie" | "powiadomienia" | "strefa";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "rezerwacje", label: "Rezerwacje" },
  { id: "anulowanie", label: "Anulowanie" },
  { id: "powiadomienia", label: "Powiadomienia" },
  { id: "strefa", label: "Niebezpieczna strefa" },
];

const TIME_SLOT_OPTIONS = [15, 30, 45, 60];
const CANCELLATION_HOURS_OPTIONS = [
  { value: 12, label: "12 godzin" },
  { value: 24, label: "24 godziny" },
  { value: 48, label: "48 godzin" },
  { value: 72, label: "72 godziny" },
];

export function SettingsClient({ settings: initialSettings }: Props) {
  const [activeSection, setActiveSection] = useState<Section>("rezerwacje");
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateBusinessSettings({
        advanceBookingDays: settings.advanceBookingDays,
        minAdvanceHours: settings.minAdvanceHours,
        timeSlotDuration: settings.timeSlotDuration,
        cancellationHours: settings.cancellationHours,
        cancellationFeeType: settings.cancellationFeeType || undefined,
        cancellationFeeValue: settings.cancellationFeeValue || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ustawienia</h1>
          <p className="text-sm text-surface-700 mt-0.5">
            Konfiguracja systemu rezerwacji
          </p>
        </div>
        {activeSection !== "strefa" && (
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
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-48 flex-shrink-0">
          <div className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-colors font-medium ${
                  activeSection === section.id
                    ? section.id === "strefa"
                      ? "bg-danger-50 text-danger-600"
                      : "bg-surface-100 text-gray-900"
                    : section.id === "strefa"
                    ? "text-danger-600 hover:bg-danger-50"
                    : "text-surface-700 hover:text-gray-900 hover:bg-surface-50"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1">
          {/* Rezerwacje */}
          {activeSection === "rezerwacje" && (
            <div className="bg-white border border-surface-100 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Ustawienia rezerwacji</h3>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Wyprzedzenie rezerwacji (dni)
                    </label>
                    <p className="text-xs text-surface-700 mb-2">
                      Klienci mogą rezerwować z wyprzedzeniem maksymalnie tylu dni.
                    </p>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.advanceBookingDays}
                      onChange={(e) => update("advanceBookingDays", parseInt(e.target.value, 10))}
                      className="w-40 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Minimalne wyprzedzenie (godziny)
                    </label>
                    <p className="text-xs text-surface-700 mb-2">
                      Minimalny czas od teraz do zarezerwowanej wizyty.
                    </p>
                    <input
                      type="number"
                      min="0"
                      max="72"
                      value={settings.minAdvanceHours}
                      onChange={(e) => update("minAdvanceHours", parseInt(e.target.value, 10))}
                      className="w-40 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Długość slotów czasowych
                    </label>
                    <p className="text-xs text-surface-700 mb-2">
                      Co ile minut pokazywane są dostępne terminy.
                    </p>
                    <div className="flex gap-2">
                      {TIME_SLOT_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => update("timeSlotDuration", opt)}
                          className={`px-4 py-2 text-sm rounded-xl border transition-colors font-medium ${
                            settings.timeSlotDuration === opt
                              ? "bg-gray-900 text-white border-gray-900"
                              : "border-surface-200 text-gray-900 hover:bg-surface-50"
                          }`}
                        >
                          {opt} min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Anulowanie */}
          {activeSection === "anulowanie" && (
            <div className="bg-white border border-surface-100 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-gray-900">Polityka anulowania</h3>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Limit anulowania
                </label>
                <p className="text-xs text-surface-700 mb-3">
                  Klient może anulować wizytę najpóźniej na tyle godzin przed jej rozpoczęciem.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {CANCELLATION_HOURS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("cancellationHours", opt.value)}
                      className={`px-4 py-2 text-sm rounded-xl border transition-colors font-medium ${
                        settings.cancellationHours === opt.value
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-surface-200 text-gray-900 hover:bg-surface-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Opłata za anulowanie
                </label>
                <div className="flex gap-3 mb-3">
                  {[
                    { value: "", label: "Brak" },
                    { value: "percentage", label: "Procentowa" },
                    { value: "fixed", label: "Stała kwota" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("cancellationFeeType", opt.value)}
                      className={`px-4 py-2 text-sm rounded-xl border transition-colors font-medium ${
                        settings.cancellationFeeType === opt.value
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-surface-200 text-gray-900 hover:bg-surface-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {settings.cancellationFeeType && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings.cancellationFeeValue}
                      onChange={(e) =>
                        update("cancellationFeeValue", parseFloat(e.target.value))
                      }
                      className="w-32 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    />
                    <span className="text-sm text-surface-700">
                      {settings.cancellationFeeType === "percentage" ? "%" : "PLN"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Powiadomienia */}
          {activeSection === "powiadomienia" && (
            <div className="bg-white border border-surface-100 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Powiadomienia</h3>
              <p className="text-sm text-surface-700">
                Wybierz w jaki sposób chcesz otrzymywać powiadomienia o wizytach i klientach.
              </p>

              {[
                {
                  key: "emailNotifications" as keyof Settings,
                  label: "Powiadomienia e-mail",
                  description: "Otrzymuj e-maile o nowych, potwierdzonych i anulowanych wizytach.",
                },
                {
                  key: "smsNotifications" as keyof Settings,
                  label: "Powiadomienia SMS",
                  description: "Otrzymuj SMS-y z przypomnieniami i alertami (dodatkowe koszty).",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between p-4 bg-surface-50 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-surface-700 mt-0.5">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => update(item.key, !settings[item.key] as Settings[typeof item.key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 mt-0.5 ${
                      settings[item.key] ? "bg-brand-600" : "bg-surface-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        settings[item.key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Niebezpieczna strefa */}
          {activeSection === "strefa" && (
            <div className="bg-white border border-danger-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-danger-50 flex items-center justify-center flex-shrink-0">
                  <WarningIcon className="w-5 h-5 text-danger-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-danger-600">Niebezpieczna strefa</h3>
                  <p className="text-sm text-surface-700 mt-1">
                    Akcje w tej sekcji są nieodwracalne. Postępuj ostrożnie.
                  </p>
                </div>
              </div>

              <div className="border border-danger-100 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Usuń konto biznesowe</p>
                    <p className="text-xs text-surface-700 mt-1">
                      Trwale usuwa Twój salon i wszystkie dane: usługi, pracowników, klientów, wizyty i opinie.
                      Ta akcja nie może zostać cofnięta.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="ml-4 px-4 py-2 text-sm font-semibold text-danger-600 border border-danger-200 hover:bg-danger-50 rounded-xl transition-colors flex-shrink-0"
                  >
                    Usuń konto
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-soft-xl w-full max-w-md animate-scale-in p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger-50 flex items-center justify-center">
                <WarningIcon className="w-5 h-5 text-danger-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Usuń konto biznesowe</h3>
            </div>
            <p className="text-sm text-surface-700 mb-6">
              Czy na pewno chcesz usunąć konto? Wszystkie dane zostaną trwale usunięte i nie będzie
              możliwości ich odzyskania. Skontaktuj się z pomocą techniczną aby potwierdzić tę operację.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-surface-200 text-gray-900 hover:bg-surface-50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  alert("Aby usunąć konto, skontaktuj się z pomocą techniczną: support@termcatch.pl");
                }}
                className="flex-1 bg-danger-600 hover:bg-danger-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                Rozumiem, usuń konto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  );
}
