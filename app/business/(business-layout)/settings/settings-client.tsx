"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBusinessSettings } from "@/lib/actions/business";
import { NotificationSettingsForm } from "@/components/business/notification-settings-form";
import { requestDangerCode, confirmBusinessDeletion, confirmSalonDeletion } from "@/lib/actions/danger";
import { sendInvite } from "@/actions/invite";
import type { BusinessNotificationSettings } from "@/lib/notification-settings";
import {
  PageHeader,
  GlassCard,
  InkButton,
  GlassButton,
  CHIP,
  INK_GRADIENT,
} from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";
import { cn } from "@/lib/utils";

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

const INPUT_CLS =
  "input-glass rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 tabular-nums";
const LABEL_CLS = "block text-sm font-medium text-slate-800 mb-1";
const HINT_CLS = "text-xs text-slate-500 mb-2.5";

// Solid rose — the one destructive primary
const DANGER_SOLID: React.CSSProperties = {
  background: "linear-gradient(180deg, #E11D48 0%, #BE123C 100%)",
  border: "1px solid #BE123C",
  color: "#FFF1F2",
  boxShadow: "0 1px 2px rgba(0,0,0,0.18), 0 6px 16px rgba(190,18,60,0.25), inset 0 1px 0 rgba(255,255,255,0.20)",
};

const DANGER_GHOST: React.CSSProperties = {
  background: "rgba(244,63,94,0.08)",
  border: "1px solid rgba(244,63,94,0.28)",
  color: "#BE123C",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.60)",
};

function SegmentedOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "btn-spring px-4 py-2 text-sm rounded-xl font-medium transition-colors",
        active ? "text-white font-semibold" : "text-slate-600"
      )}
      style={active
        ? { background: INK_GRADIENT, border: "1px solid #0F172A", boxShadow: "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15)" }
        : { background: "rgba(255,255,255,0.70)", border: "1px solid rgba(203,213,225,0.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)" }}
    >
      {children}
    </button>
  );
}

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

  const errorBox = (msg: string) => (
    <p
      role="alert"
      className="mb-4 text-sm font-medium rounded-xl px-3 py-2.5"
      style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", color: "#BE123C" }}
    >
      {msg}
    </p>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Ustawienia"
        subtitle="Konfiguracja systemu rezerwacji"
        actions={
          <>
            <GlassButton onClick={() => setShowInvite(true)}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-9 4.875v4.905c0 .92.672 1.715 1.625 1.71H16.5c.903 0 1.5-.81 1.5-1.71v-4.905M12 12v8.25" />
              </svg>
              Zaproś znajomego
            </GlassButton>
            {activeSection !== "strefa" && (
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
            )}
          </>
        }
      />

      <div className="fade-rise fade-rise-d1 flex flex-col md:flex-row gap-5">
        {/* Section nav */}
        <nav className="md:w-48 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
            {SECTIONS.map((section) => {
              const active = activeSection === section.id;
              const danger = section.id === "strefa";
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "text-left px-3 py-2.5 text-sm rounded-xl font-medium whitespace-nowrap transition-colors",
                    !active && !danger && "nav-item",
                    !active && danger && "hover:opacity-80"
                  )}
                  style={active
                    ? danger
                      ? DANGER_GHOST
                      : { background: "rgba(203,213,225,0.22)", border: "1px solid rgba(203,213,225,0.50)", color: "#1E293B", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }
                    : danger
                    ? { color: "#BE123C", border: "1px solid transparent" }
                    : undefined}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Rezerwacje */}
          {activeSection === "rezerwacje" && (
            <GlassCard className="p-6 space-y-6">
              <h3 className="text-sm font-semibold text-slate-900">Ustawienia rezerwacji</h3>
              <div className="space-y-5">
                <div>
                  <label htmlFor="set-advance" className={LABEL_CLS}>Wyprzedzenie rezerwacji (dni)</label>
                  <p className={HINT_CLS}>Klienci mogą rezerwować z wyprzedzeniem maksymalnie tylu dni.</p>
                  <input
                    id="set-advance"
                    type="number" min="1" max="365"
                    value={settings.advanceBookingDays}
                    onChange={(e) => update("advanceBookingDays", parseInt(e.target.value, 10))}
                    className={cn(INPUT_CLS, "w-40")}
                  />
                </div>
                <div>
                  <label htmlFor="set-min" className={LABEL_CLS}>Minimalne wyprzedzenie (godziny)</label>
                  <p className={HINT_CLS}>Minimalny czas od teraz do zarezerwowanej wizyty.</p>
                  <input
                    id="set-min"
                    type="number" min="0" max="72"
                    value={settings.minAdvanceHours}
                    onChange={(e) => update("minAdvanceHours", parseInt(e.target.value, 10))}
                    className={cn(INPUT_CLS, "w-40")}
                  />
                </div>
                <div>
                  <span className={LABEL_CLS}>Długość slotów czasowych</span>
                  <p className={HINT_CLS}>Co ile minut pokazywane są dostępne terminy.</p>
                  <div className="flex gap-2 flex-wrap">
                    {TIME_SLOT_OPTIONS.map((opt) => (
                      <SegmentedOption
                        key={opt}
                        active={settings.timeSlotDuration === opt}
                        onClick={() => update("timeSlotDuration", opt)}
                      >
                        {opt} min
                      </SegmentedOption>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Anulowanie */}
          {activeSection === "anulowanie" && (
            <GlassCard className="p-6 space-y-6">
              <h3 className="text-sm font-semibold text-slate-900">Polityka anulowania</h3>
              <div>
                <span className={LABEL_CLS}>Limit anulowania</span>
                <p className={HINT_CLS}>Klient może anulować wizytę najpóźniej na tyle godzin przed jej rozpoczęciem.</p>
                <div className="flex gap-2 flex-wrap">
                  {CANCELLATION_HOURS_OPTIONS.map((opt) => (
                    <SegmentedOption
                      key={opt.value}
                      active={settings.cancellationHours === opt.value}
                      onClick={() => update("cancellationHours", opt.value)}
                    >
                      {opt.label}
                    </SegmentedOption>
                  ))}
                </div>
              </div>
              <div>
                <span className={LABEL_CLS}>Opłata za anulowanie</span>
                <div className="flex gap-2 flex-wrap mb-3 mt-2">
                  {[
                    { value: "", label: "Brak" },
                    { value: "percentage", label: "Procentowa" },
                    { value: "fixed", label: "Stała kwota" },
                  ].map((opt) => (
                    <SegmentedOption
                      key={opt.value}
                      active={settings.cancellationFeeType === opt.value}
                      onClick={() => update("cancellationFeeType", opt.value)}
                    >
                      {opt.label}
                    </SegmentedOption>
                  ))}
                </div>
                {settings.cancellationFeeType && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" step="1"
                      value={settings.cancellationFeeValue}
                      onChange={(e) => update("cancellationFeeValue", parseFloat(e.target.value))}
                      aria-label="Wysokość opłaty za anulowanie"
                      className={cn(INPUT_CLS, "w-32")}
                    />
                    <span className="text-sm text-slate-500">
                      {settings.cancellationFeeType === "percentage" ? "%" : "PLN"}
                    </span>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Powiadomienia */}
          {activeSection === "powiadomienia" && (
            <NotificationSettingsForm initial={notificationSettings} />
          )}

          {/* Niebezpieczna strefa */}
          {activeSection === "strefa" && (
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={DANGER_GHOST}
                >
                  <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "#BE123C" }}>Niebezpieczna strefa</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Akcje w tej sekcji są nieodwracalne. Każda operacja wymaga potwierdzenia kodem wysłanym na Twój adres e-mail.
                  </p>
                </div>
              </div>

              {[
                {
                  key: "salon" as const,
                  title: "Usuń profil salonu",
                  desc: "Usuwa salon i wszystkie dane (usługi, pracownicy, wizyty, opinie). Twoje konto pozostaje aktywne — możesz zarejestrować nowy salon.",
                  cta: "Usuń salon",
                },
                {
                  key: "account" as const,
                  title: "Usuń konto",
                  desc: "Trwale usuwa salon, wszystkie dane oraz Twoje konto. Nie będziesz mógł się zalogować. Ta akcja nie może zostać cofnięta.",
                  cta: "Usuń konto",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="rounded-2xl p-4"
                  style={{ background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.18)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => openDangerModal(item.key)}
                      className="btn-spring ml-4 px-4 py-2 text-sm font-semibold rounded-xl flex-shrink-0"
                      style={DANGER_GHOST}
                    >
                      {item.cta}
                    </button>
                  </div>
                </div>
              ))}
            </GlassCard>
          )}
        </div>
      </div>

      {/* ── Danger modal ── */}
      <GlassModal
        open={dangerStep !== "idle"}
        onOpenChange={(o) => { if (!o) closeDangerModal(); }}
        title={dangerAction === "salon" ? "Usuń profil salonu" : "Usuń konto"}
        accent="#E11D48"
      >
        {dangerStep === "confirm" && (
          <>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Aby potwierdzić tę operację, wyślemy 6-cyfrowy kod na Twój adres e-mail.
              Wprowadź go w następnym kroku, żeby kontynuować.
            </p>
            {dangerError && errorBox(dangerError)}
            <div className="flex gap-3">
              <GlassButton onClick={closeDangerModal} className="flex-1">Anuluj</GlassButton>
              <button
                onClick={handleSendCode}
                disabled={dangerLoading}
                className="btn-spring flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={DANGER_SOLID}
              >
                {dangerLoading && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" d="M4 12a8 8 0 0 1 8-8" />
                  </svg>
                )}
                Wyślij kod
              </button>
            </div>
          </>
        )}

        {dangerStep === "code" && (
          <>
            <p className="text-sm text-slate-600 mb-2 leading-relaxed">
              Kod został wysłany na Twój adres e-mail. Wprowadź go poniżej, aby potwierdzić.
            </p>
            <p className="text-xs text-slate-400 mb-5">Kod jest ważny przez 10 minut.</p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={dangerCode}
              onChange={(e) => setDangerCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-label="Kod potwierdzający"
              className="input-glass w-full text-center text-2xl tracking-[0.5em] tabular-nums rounded-xl px-4 py-3 mb-4 outline-none text-slate-900"
            />

            {dangerError && errorBox(dangerError)}

            <div className="flex gap-3">
              <GlassButton onClick={closeDangerModal} className="flex-1">Anuluj</GlassButton>
              <button
                onClick={handleConfirmDeletion}
                disabled={dangerLoading || dangerCode.length !== 6}
                className="btn-spring flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                style={DANGER_SOLID}
              >
                {dangerLoading && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" d="M4 12a8 8 0 0 1 8-8" />
                  </svg>
                )}
                Potwierdź i usuń
              </button>
            </div>

            <button
              onClick={handleSendCode}
              disabled={dangerLoading}
              className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Nie otrzymałem kodu — wyślij ponownie
            </button>
          </>
        )}
      </GlassModal>

      {/* ── Invite modal ── */}
      <GlassModal
        open={showInvite}
        onOpenChange={(o) => { if (!o) closeInviteModal(); }}
        title="Zaproś znajomego"
        description="Podaj adres e-mail właściciela salonu. Dostanie zaproszenie do Termcatch."
      >
        {inviteState === "sent" ? (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900">Zaproszenie wysłane</p>
            <p className="text-xs text-slate-500 mt-1">{inviteEmail}</p>
            <InkButton onClick={closeInviteModal} className="mt-5 px-6">
              Gotowe
            </InkButton>
          </div>
        ) : (
          <>
            <input
              type="email"
              placeholder="znajomy@email.pl"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
              aria-label="Adres e-mail znajomego"
              className="input-glass w-full rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 mb-3"
            />
            {inviteError && errorBox(inviteError)}
            <div className="flex gap-3">
              <GlassButton onClick={closeInviteModal} className="flex-1">Anuluj</GlassButton>
              <InkButton
                onClick={handleSendInvite}
                disabled={inviteState === "loading" || !inviteEmail.trim()}
                className="flex-1"
              >
                {inviteState === "loading" && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" d="M4 12a8 8 0 0 1 8-8" />
                  </svg>
                )}
                Wyślij zaproszenie
              </InkButton>
            </div>
          </>
        )}
      </GlassModal>
    </div>
  );
}
