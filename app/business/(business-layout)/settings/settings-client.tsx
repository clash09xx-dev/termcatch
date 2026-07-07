"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBusinessSettings } from "@/lib/actions/business";
import { NotificationSettingsForm } from "@/components/business/notification-settings-form";
import { requestDangerCode, confirmBusinessDeletion, confirmSalonDeletion } from "@/lib/actions/danger";
import { sendInvite } from "@/actions/invite";
import type { BusinessNotificationSettings } from "@/lib/notification-settings";

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
  notificationSettings: BusinessNotificationSettings;
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

export function SettingsClient({ settings: initialSettings, notificationSettings }: Props) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("rezerwacje");
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Danger zone state
  const [dangerStep, setDangerStep] = useState<"idle" | "confirm" | "code">("idle");
  const [dangerAction, setDangerAction] = useState<"salon" | "account">("salon");
  const [dangerCode, setDangerCode] = useState("");
  const [dangerError, setDangerError] = useState("");
  const [dangerLoading, setDangerLoading] = useState(false);

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteState, setInviteState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [inviteError, setInviteError] = useState("");

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

  async function handleSendCode() {
    setDangerLoading(true);
    setDangerError("");
    const result = await requestDangerCode();
    setDangerLoading(false);
    if (result.error) {
      setDangerError(result.error);
    } else {
      setDangerStep("code");
    }
  }

  async function handleConfirmDeletion() {
    if (dangerCode.replace(/\s/g, "").length !== 6) {
      setDangerError("Kod musi mieć 6 cyfr.");
      return;
    }
    setDangerLoading(true);
    setDangerError("");
    const result = dangerAction === "salon"
      ? await confirmSalonDeletion(dangerCode)
      : await confirmBusinessDeletion(dangerCode);
    setDangerLoading(false);
    if (result.error && !result.deleted) {
      setDangerError(result.error);
    } else {
      setDangerStep("idle");
      router.push(dangerAction === "salon" ? "/business/onboarding" : "/");
    }
  }

  function openDangerModal(action: "salon" | "account") {
    setDangerAction(action);
    setDangerCode("");
    setDangerError("");
    setDangerStep("confirm");
  }

  function closeDangerModal() {
    setDangerStep("idle");
    setDangerCode("");
    setDangerError("");
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteState("loading");
    setInviteError("");
    const result = await sendInvite(inviteEmail.trim());
    if (result.error) {
      setInviteState("error");
      setInviteError(result.error);
    } else {
      setInviteState("sent");
    }
  }

  function closeInviteModal() {
    setShowInvite(false);
    setInviteEmail("");
    setInviteState("idle");
    setInviteError("");
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ustawienia</h1>
          <p className="text-sm text-gray-500 mt-0.5">Konfiguracja systemu rezerwacji</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Invite button */}
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-3.5 py-2 border border-gold-300 bg-gold-50 hover:bg-gold-100 text-gold-700 rounded-xl text-sm font-medium transition-colors"
          >
            <GiftIcon className="w-4 h-4" />
            Zaproś znajomego
          </button>

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
                      ? "bg-red-50 text-red-600"
                      : "bg-gray-100 text-gray-900"
                    : section.id === "strefa"
                    ? "text-red-500 hover:bg-red-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6">
              <h3 className="text-sm font-semibold text-gray-900">Ustawienia rezerwacji</h3>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Wyprzedzenie rezerwacji (dni)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Klienci mogą rezerwować z wyprzedzeniem maksymalnie tylu dni.
                  </p>
                  <input
                    type="number" min="1" max="365"
                    value={settings.advanceBookingDays}
                    onChange={(e) => update("advanceBookingDays", parseInt(e.target.value, 10))}
                    className="w-40 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Minimalne wyprzedzenie (godziny)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Minimalny czas od teraz do zarezerwowanej wizyty.
                  </p>
                  <input
                    type="number" min="0" max="72"
                    value={settings.minAdvanceHours}
                    onChange={(e) => update("minAdvanceHours", parseInt(e.target.value, 10))}
                    className="w-40 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1.5">
                    Długość slotów czasowych
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Co ile minut pokazywane są dostępne terminy.
                  </p>
                  <div className="flex gap-2">
                    {TIME_SLOT_OPTIONS.map((opt) => (
                      <button
                        key={opt} type="button"
                        onClick={() => update("timeSlotDuration", opt)}
                        className={`px-4 py-2 text-sm rounded-xl border transition-colors font-medium ${
                          settings.timeSlotDuration === opt
                            ? "bg-gray-900 text-white border-gray-900"
                            : "border-gray-200 text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        {opt} min
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Anulowanie */}
          {activeSection === "anulowanie" && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-gray-900">Polityka anulowania</h3>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Limit anulowania</label>
                <p className="text-xs text-gray-500 mb-3">
                  Klient może anulować wizytę najpóźniej na tyle godzin przed jej rozpoczęciem.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {CANCELLATION_HOURS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => update("cancellationHours", opt.value)}
                      className={`px-4 py-2 text-sm rounded-xl border transition-colors font-medium ${
                        settings.cancellationHours === opt.value
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-200 text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Opłata za anulowanie</label>
                <div className="flex gap-3 mb-3">
                  {[
                    { value: "", label: "Brak" },
                    { value: "percentage", label: "Procentowa" },
                    { value: "fixed", label: "Stała kwota" },
                  ].map((opt) => (
                    <button
                      key={opt.value} type="button"
                      onClick={() => update("cancellationFeeType", opt.value)}
                      className={`px-4 py-2 text-sm rounded-xl border transition-colors font-medium ${
                        settings.cancellationFeeType === opt.value
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-200 text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {settings.cancellationFeeType && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" step="1"
                      value={settings.cancellationFeeValue}
                      onChange={(e) => update("cancellationFeeValue", parseFloat(e.target.value))}
                      className="w-32 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                    />
                    <span className="text-sm text-gray-500">
                      {settings.cancellationFeeType === "percentage" ? "%" : "PLN"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Powiadomienia */}
          {activeSection === "powiadomienia" && (
            <NotificationSettingsForm initial={notificationSettings} />
          )}

          {/* Niebezpieczna strefa */}
          {activeSection === "strefa" && (
            <div className="bg-white border border-red-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <WarningIcon className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-600">Niebezpieczna strefa</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Akcje w tej sekcji są nieodwracalne. Każda operacja wymaga potwierdzenia kodem wysłanym na Twój adres e-mail.
                  </p>
                </div>
              </div>

              {/* Usuń profil salonu */}
              <div className="border border-red-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Usuń profil salonu</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Usuwa salon i wszystkie dane (usługi, pracownicy, wizyty, opinie). Twoje konto pozostaje aktywne — możesz zarejestrować nowy salon.
                    </p>
                  </div>
                  <button
                    onClick={() => openDangerModal("salon")}
                    className="ml-4 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                  >
                    Usuń salon
                  </button>
                </div>
              </div>

              {/* Usuń konto */}
              <div className="border border-red-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Usuń konto</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Trwale usuwa salon, wszystkie dane oraz Twoje konto. Nie będziesz mógł się zalogować. Ta akcja nie może zostać cofnięta.
                    </p>
                  </div>
                  <button
                    onClick={() => openDangerModal("account")}
                    className="ml-4 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                  >
                    Usuń konto
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Danger zone modal ── */}
      {dangerStep !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeDangerModal} />
          <div className="relative bg-white rounded-2xl shadow-soft-xl w-full max-w-md animate-scale-in p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <WarningIcon className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                {dangerAction === "salon" ? "Usuń profil salonu" : "Usuń konto"}
              </h3>
            </div>

            {dangerStep === "confirm" && (
              <>
                <p className="text-sm text-gray-600 mb-6">
                  Aby potwierdzić tę operację, wyślemy 6-cyfrowy kod na Twój adres e-mail.
                  Wprowadź go w następnym kroku, żeby kontynuować.
                </p>
                {dangerError && (
                  <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    {dangerError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={closeDangerModal}
                    className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSendCode}
                    disabled={dangerLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {dangerLoading ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : null}
                    Wyślij kod
                  </button>
                </div>
              </>
            )}

            {dangerStep === "code" && (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  Kod został wysłany na Twój adres e-mail. Wprowadź go poniżej, aby potwierdzić usunięcie konta.
                </p>
                <p className="text-xs text-gray-400 mb-5">Kod jest ważny przez 10 minut.</p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={dangerCode}
                  onChange={(e) => setDangerCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] border border-gray-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-gray-400 transition-colors"
                />

                {dangerError && (
                  <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    {dangerError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={closeDangerModal}
                    className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleConfirmDeletion}
                    disabled={dangerLoading || dangerCode.length !== 6}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {dangerLoading ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : null}
                    Potwierdź i usuń
                  </button>
                </div>

                <button
                  onClick={handleSendCode}
                  disabled={dangerLoading}
                  className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Nie otrzymałem kodu — wyślij ponownie
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Invite modal ── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeInviteModal} />
          <div className="relative bg-white rounded-2xl shadow-soft-xl w-full max-w-md animate-scale-in p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center">
                <GiftIcon className="w-5 h-5 text-gold-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Zaproś znajomego</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5 ml-[52px]">
              Podaj adres e-mail właściciela salonu. Dostanie zaproszenie do Termcatch.
            </p>

            {inviteState === "sent" ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-gold-50 border border-gold-200 flex items-center justify-center mx-auto mb-3">
                  <CheckIcon className="w-6 h-6 text-gold-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Zaproszenie wysłane</p>
                <p className="text-xs text-gray-500 mt-1">{inviteEmail}</p>
                <button
                  onClick={closeInviteModal}
                  className="mt-5 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Gotowe
                </button>
              </div>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="znajomy@email.pl"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors mb-3"
                />
                {inviteError && (
                  <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    {inviteError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={closeInviteModal}
                    className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSendInvite}
                    disabled={inviteState === "loading" || !inviteEmail.trim()}
                    className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {inviteState === "loading" ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : null}
                    Wyślij zaproszenie
                  </button>
                </div>
              </>
            )}
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

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-9 4.875v4.905c0 .92.672 1.715 1.625 1.71H16.5c.903 0 1.5-.81 1.5-1.71v-4.905M12 12v8.25" />
    </svg>
  );
}
