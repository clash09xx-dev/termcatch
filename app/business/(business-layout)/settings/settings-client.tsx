"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBusinessSettings } from "@/lib/actions/business";
import { NotificationSettingsForm } from "@/components/business/notification-settings-form";
import { TestSmsButton } from "@/components/business/test-sms-button";
import { PublicVisibilityToggle } from "@/components/business/public-visibility-toggle";
import { requestDangerCode, confirmBusinessDeletion, confirmSalonDeletion } from "@/lib/actions/danger";
import { sendInvite } from "@/actions/invite";
import type { BusinessNotificationSettings } from "@/lib/notification-settings";
import type { Business } from "@prisma/client";
import { ProfileClient } from "../profile/profile-client";
import {
  PageHeader,
  GlassCard,
  InkButton,
  GlassButton,
  Overline,
  INK_GRADIENT,
  ELEV_OVERLAY,
} from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/i18n-provider";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { FakturowniaIntegrationCard } from "@/components/business/fakturownia-integration-card";
import type { ConnectionStatus } from "@/lib/fakturownia/connection";

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
  business: Business;
  smsAvailable: boolean;
  fakturownia: ConnectionStatus;
};

type Section = "rezerwacje" | "odwolania" | "powiadomienia" | "profil" | "integracje" | "jezyk" | "strefa";

// Section ids are stable; every visible label comes from the dictionary.
const SECTIONS: { id: Section; danger?: boolean }[] = [
  { id: "rezerwacje" },
  { id: "odwolania" },
  { id: "powiadomienia" },
  { id: "profil" },
  { id: "integracje" },
  { id: "jezyk" },
  { id: "strefa", danger: true },
];

const TIME_SLOT_OPTIONS = [15, 30, 45, 60];
const CANCELLATION_HOURS_OPTIONS = [12, 24, 48, 72];
const FEE_VALUES = ["", "percentage", "fixed"] as const;

// The six fields persisted by updateBusinessSettings — the dirty-tracked set.
const TRACKED: (keyof Settings)[] = [
  "advanceBookingDays",
  "minAdvanceHours",
  "timeSlotDuration",
  "cancellationHours",
  "cancellationFeeType",
  "cancellationFeeValue",
];

const INPUT_CLS =
  "input-glass rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 tabular-nums";

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

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

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
        : { background: "var(--surface)", border: "1px solid var(--hairline)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.88)" }}
    >
      {children}
    </button>
  );
}

// A single business decision: question → control → consequence.
function DecisionCard({
  question,
  consequence,
  children,
}: {
  question: string;
  consequence: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-[15px] font-semibold text-slate-900" style={{ letterSpacing: "var(--track-heading)" }}>
        {question}
      </h3>
      <div className="mt-3">{children}</div>
      <p className="text-xs text-slate-500 mt-3 leading-relaxed">{consequence}</p>
    </GlassCard>
  );
}

export function SettingsClient({ settings: initialSettings, notificationSettings, business, smsAvailable, fakturownia }: Props) {
  const t = useT();
  const T = t.pages.settings;
  const SECTION_LABEL: Record<Section, string> = {
    rezerwacje: T.secBooking,
    odwolania: T.secCancellation,
    powiadomienia: T.secNotifications,
    profil: T.secPublicProfile,
    integracje: t.fakturownia.section,
    jezyk: t.lang.label,
    strefa: T.secSecurity,
  };
  const FEE_LABEL: Record<(typeof FEE_VALUES)[number], string> = {
    "": T.feeNone,
    percentage: T.feePercentage,
    fixed: T.feeFixed,
  };
  const router = useRouter();
  // Deep-link: /business/settings?section=integrations opens Integrations.
  const initialSection: Section =
    typeof window !== "undefined" && /[?&]section=integ/.test(window.location.search) ? "integracje" : "rezerwacje";
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [baseline, setBaseline] = useState<Settings>(initialSettings);
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

  const dirty = useMemo(
    () => TRACKED.some((k) => settings[k] !== baseline[k]),
    [settings, baseline]
  );

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
      setBaseline(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function resetChanges() {
    setSettings(baseline);
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
      setDangerError(T.codeSixDigits);
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

  const feeUnit = settings.cancellationFeeType === "percentage" ? "%" : "PLN";

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-4">
      <PageHeader
        title={T.title}
        subtitle={T.subtitle}
        actions={
          <GlassButton onClick={() => setShowInvite(true)}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-9 4.875v4.905c0 .92.672 1.715 1.625 1.71H16.5c.903 0 1.5-.81 1.5-1.71v-4.905M12 12v8.25" />
            </svg>
            {T.inviteFriend}
          </GlassButton>
        }
      />

      <div className="fade-rise fade-rise-d1 flex flex-col md:flex-row gap-5">
        {/* Section nav */}
        <nav className="md:w-52 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
            {SECTIONS.map((section) => {
              const active = activeSection === section.id;
              const danger = section.danger;
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
                      : { background: "var(--selected)", border: "1px solid var(--hairline)", color: "#1E293B", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)" }
                    : danger
                    ? { color: "#BE123C", border: "1px solid transparent" }
                    : undefined}
                >
                  {SECTION_LABEL[section.id]}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Rezerwacje */}
          {activeSection === "rezerwacje" && (
            <>
              <DecisionCard
                question={T.qAdvance}
                consequence={
                  <>
                    {T.cAdvancePre}{" "}
                    <span className="font-medium text-slate-700 tabular-nums">{settings.advanceBookingDays}</span>{" "}
                    {T.cAdvancePost}
                  </>
                }
              >
                <div className="flex items-center gap-2">
                  <input
                    id="set-advance"
                    type="number"
                    min={1}
                    max={365}
                    value={settings.advanceBookingDays}
                    onChange={(e) => update("advanceBookingDays", clampInt(e.target.value, 1, 365, settings.advanceBookingDays))}
                    className={cn(INPUT_CLS, "w-28")}
                    aria-label={T.ariaAdvance}
                  />
                  <span className="text-sm text-slate-500">{T.days}</span>
                </div>
              </DecisionCard>

              <DecisionCard
                question={T.qMinAdvance}
                consequence={
                  settings.minAdvanceHours === 0 ? (
                    T.cMinAdvanceZero
                  ) : (
                    <>
                      {T.cMinAdvancePre}{" "}
                      <span className="font-medium text-slate-700 tabular-nums">{settings.minAdvanceHours}</span>{" "}
                      {T.cMinAdvancePost}
                    </>
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <input
                    id="set-min"
                    type="number"
                    min={0}
                    max={72}
                    value={settings.minAdvanceHours}
                    onChange={(e) => update("minAdvanceHours", clampInt(e.target.value, 0, 72, settings.minAdvanceHours))}
                    className={cn(INPUT_CLS, "w-28")}
                    aria-label={T.ariaMinAdvance}
                  />
                  <span className="text-sm text-slate-500">{T.hours}</span>
                </div>
              </DecisionCard>

              <DecisionCard
                question={T.qSlot}
                consequence={
                  <>
                    {T.cSlotPre}{" "}
                    <span className="font-medium text-slate-700 tabular-nums">{settings.timeSlotDuration}</span>{" "}
                    {T.cSlotPost}
                  </>
                }
              >
                <div className="flex gap-2 flex-wrap">
                  {TIME_SLOT_OPTIONS.map((opt) => (
                    <SegmentedOption key={opt} active={settings.timeSlotDuration === opt} onClick={() => update("timeSlotDuration", opt)}>
                      {opt} min
                    </SegmentedOption>
                  ))}
                </div>
              </DecisionCard>
            </>
          )}

          {/* Odwołania */}
          {activeSection === "odwolania" && (
            <>
              <DecisionCard
                question={T.qCancelWindow}
                consequence={
                  <>
                    {T.cCancelWindowPre}{" "}
                    <span className="font-medium text-slate-700 tabular-nums">{settings.cancellationHours}</span>{" "}
                    {T.cCancelWindowPost}
                  </>
                }
              >
                <div className="flex gap-2 flex-wrap">
                  {CANCELLATION_HOURS_OPTIONS.map((opt) => (
                    <SegmentedOption key={opt} active={settings.cancellationHours === opt} onClick={() => update("cancellationHours", opt)}>
                      {opt} {T.hours}
                    </SegmentedOption>
                  ))}
                </div>
              </DecisionCard>

              <DecisionCard
                question={T.qFee}
                consequence={
                  settings.cancellationFeeType === "" ? (
                    T.cFeeNone
                  ) : (
                    <>
                      {T.cFeePre}{" "}
                      <span className="font-medium text-slate-700 tabular-nums">
                        {settings.cancellationFeeValue || 0}
                        {feeUnit === "%" ? "%" : " PLN"}
                      </span>{" "}
                      {T.cFeePost}
                    </>
                  )
                }
              >
                <div className="flex gap-2 flex-wrap">
                  {FEE_VALUES.map((v) => (
                    <SegmentedOption key={v} active={settings.cancellationFeeType === v} onClick={() => update("cancellationFeeType", v)}>
                      {FEE_LABEL[v]}
                    </SegmentedOption>
                  ))}
                </div>
                {settings.cancellationFeeType && (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={settings.cancellationFeeValue}
                      onChange={(e) => update("cancellationFeeValue", Math.max(0, parseFloat(e.target.value) || 0))}
                      aria-label={T.ariaFee}
                      className={cn(INPUT_CLS, "w-32")}
                    />
                    <span className="text-sm text-slate-500">{feeUnit}</span>
                  </div>
                )}
              </DecisionCard>
            </>
          )}

          {/* Powiadomienia */}
          {activeSection === "powiadomienia" && (
            <>
              <NotificationSettingsForm initial={notificationSettings} smsAvailable={smsAvailable} />
              <TestSmsButton />
            </>
          )}

          {/* Profil publiczny */}
          {activeSection === "profil" && (
            <GlassCard className="p-5 sm:p-6">
              <Overline className="mb-4">{T.secPublicProfile}</Overline>
              <PublicVisibilityToggle initialActive={business.isActive} published={business.status === "ACTIVE"} />
              <ProfileClient business={business} embedded />
            </GlassCard>
          )}

          {/* Integracje / Integrations */}
          {activeSection === "integracje" && (
            <div className="space-y-5">
              <FakturowniaIntegrationCard initial={fakturownia} />
              {/* Calendar sync lives on its own page: it holds per-employee
                  connections and an OAuth round trip, neither of which belongs
                  inside a tab that the user may navigate away from mid-flow. */}
              <GlassCard className="p-5 sm:p-6">
                <Overline className="mb-3">{t.pages.calendarSync.title}</Overline>
                <p className="text-sm text-slate-500 leading-relaxed">{t.pages.calendarSync.subtitle}</p>
                <a
                  href="/business/settings/calendar"
                  className="btn-spring inline-flex items-center mt-4 px-4 py-2.5 min-h-[42px] text-sm font-semibold rounded-[10px] text-slate-800 bg-white/70 border border-slate-200 hover:bg-white transition-colors"
                >
                  {t.pages.calendarSync.openSettings}
                </a>
              </GlassCard>
            </div>
          )}

          {/* Język / Language */}
          {activeSection === "jezyk" && (
            <GlassCard className="p-5 sm:p-6">
              <Overline className="mb-4">{t.lang.label}</Overline>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">{t.lang.description}</p>
              <LanguageSelector className="w-full max-w-xs cursor-pointer rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-sm text-slate-800 outline-none" />
            </GlassCard>
          )}

          {/* Bezpieczeństwo / Niebezpieczna strefa */}
          {activeSection === "strefa" && (
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={DANGER_GHOST}>
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "#BE123C" }}>{T.dangerTitle}</h3>
                  <p className="text-sm text-slate-500 mt-1">{T.dangerBody}</p>
                </div>
              </div>

              {[
                {
                  key: "salon" as const,
                  title: T.deleteSalonTitle,
                  desc: T.deleteSalonDesc,
                  cta: T.deleteSalonCta,
                },
                {
                  key: "account" as const,
                  title: T.deleteAccountTitle,
                  desc: T.deleteAccountDesc,
                  cta: T.deleteAccountCta,
                },
              ].map((item) => (
                <div key={item.key} className="rounded-2xl p-4" style={{ background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.18)" }}>
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

      {/* ── Sticky save bar — only when there are unsaved setting changes ── */}
      {dirty && (
        <div className="sticky bottom-4 z-30 flex justify-center fade-rise pointer-events-none">
          <div
            className="flex items-center gap-3 rounded-2xl pl-4 pr-2 py-2 pointer-events-auto"
            style={ELEV_OVERLAY}
            role="status"
          >
            <span className="text-sm text-slate-600">{t.pages.hours.unsaved}</span>
            <GlassButton size="sm" onClick={resetChanges} disabled={isPending}>{t.common.cancel}</GlassButton>
            <InkButton size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? t.pages.hours.saving : t.common.save}
            </InkButton>
          </div>
        </div>
      )}

      {/* Transient saved confirmation (when nothing is dirty anymore) */}
      {saved && !dirty && (
        <div className="sticky bottom-4 z-30 flex justify-center pointer-events-none">
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium pointer-events-auto"
            style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.30)", color: "#047857" }}
            role="status"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
            </svg>
            {t.pages.profile.saved}
          </div>
        </div>
      )}

      {/* ── Danger modal ── */}
      <GlassModal
        open={dangerStep !== "idle"}
        onOpenChange={(o) => { if (!o) closeDangerModal(); }}
        title={dangerAction === "salon" ? T.deleteSalonTitle : T.deleteAccountTitle}
        accent="#E11D48"
      >
        {dangerStep === "confirm" && (
          <>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{T.dangerIntro}</p>
            {dangerError && errorBox(dangerError)}
            <div className="flex gap-3">
              <GlassButton onClick={closeDangerModal} className="flex-1">{t.common.cancel}</GlassButton>
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
                {T.sendCode}
              </button>
            </div>
          </>
        )}

        {dangerStep === "code" && (
          <>
            <p className="text-sm text-slate-600 mb-2 leading-relaxed">{T.codeSent}</p>
            <p className="text-xs text-slate-400 mb-5">{T.codeValid}</p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={dangerCode}
              onChange={(e) => setDangerCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              aria-label={T.ariaCode}
              className="input-glass w-full text-center text-2xl tracking-[0.5em] tabular-nums rounded-xl px-4 py-3 mb-4 outline-none text-slate-900"
            />

            {dangerError && errorBox(dangerError)}

            <div className="flex gap-3">
              <GlassButton onClick={closeDangerModal} className="flex-1">{t.common.cancel}</GlassButton>
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
                {T.confirmDelete}
              </button>
            </div>

            <button
              onClick={handleSendCode}
              disabled={dangerLoading}
              className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {T.resendCode}
            </button>
          </>
        )}
      </GlassModal>

      {/* ── Invite modal ── */}
      <GlassModal
        open={showInvite}
        onOpenChange={(o) => { if (!o) closeInviteModal(); }}
        title={T.inviteTitle}
        description={T.inviteDesc}
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
            <p className="text-sm font-semibold text-slate-900">{T.inviteSent}</p>
            <p className="text-xs text-slate-500 mt-1">{inviteEmail}</p>
            <InkButton onClick={closeInviteModal} className="mt-5 px-6">
              {T.done}
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
              aria-label={T.ariaInviteEmail}
              className="input-glass w-full rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 mb-3"
            />
            {inviteError && errorBox(inviteError)}
            <div className="flex gap-3">
              <GlassButton onClick={closeInviteModal} className="flex-1">{t.common.cancel}</GlassButton>
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
                {T.sendInvite}
              </InkButton>
            </div>
          </>
        )}
      </GlassModal>
    </div>
  );
}
