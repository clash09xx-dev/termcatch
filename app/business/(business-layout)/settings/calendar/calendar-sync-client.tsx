"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PageHeader, GlassCard, Overline, GlassButton, InkButton, HAIRLINE, CHIP,
} from "@/components/ui/glass";
import { ConfirmDialog, GlassModal, ModalGlassButton } from "@/components/ui/glass-modal";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { formatRelative } from "@/lib/i18n/format";
import { notify, errorText } from "@/lib/notify";
import { SUCCESS_TINT, WARN_TINT, DANGER_TINT } from "@/components/ui/glass/tokens";
import {
  disconnectCalendar, fetchCalendarChoices, selectCalendar, setSyncDirections,
} from "@/lib/actions/calendar-sync";
import type { ConnectionView, EmployeeView } from "./page";
import { BooksyWizard } from "./booksy-wizard";

/**
 * Calendar synchronization settings.
 *
 * Two integrations are shown, and the difference between them is the point:
 * Google Calendar is a real connection this product maintains, Booksy is a
 * setup guide. The Booksy card says so on its face rather than implying parity.
 */

type Health = "connected" | "needs_action" | "disconnected";

function healthOf(c: ConnectionView | null): Health {
  if (!c || c.status === "disconnected") return "disconnected";
  if (c.status === "connected" && c.calendarId) return "connected";
  return "needs_action";
}

function StatusPill({ health, T }: { health: Health; T: Record<string, string> }) {
  const map = {
    connected: { label: T.statusConnected, style: SUCCESS_TINT },
    needs_action: { label: T.statusNeedsAction, style: WARN_TINT },
    disconnected: { label: T.statusDisconnected, style: DANGER_TINT },
  } as const;
  const it = map[health];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
      style={it.style}
    >
      {it.label}
    </span>
  );
}

export function CalendarSyncClient({
  configured,
  salonWide,
  employees,
}: {
  configured: boolean;
  salonWide: ConnectionView | null;
  employees: EmployeeView[];
}) {
  const t = useT();
  const T = t.pages.calendarSync;
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [wizardOpen, setWizardOpen] = useState(false);

  // Surface the OAuth round-trip outcome, then clean the URL so a refresh does
  // not replay the toast.
  useEffect(() => {
    const code = params.get("calendar");
    if (!code) return;
    if (code === "connected") notify.saved(T.statusConnected);
    else if (code === "denied") notify.info(T.errDenied);
    else if (code === "forbidden") notify.error(T.errForbidden);
    else if (code === "not_configured") notify.error(T.notConfigured);
    else notify.error(t.errors.generic);
    router.replace("/business/settings/calendar");
  }, [params, router, T, t]);

  const connectHref = (employeeId?: string) =>
    `/api/integrations/google-calendar/start?returnTo=${encodeURIComponent("/business/settings/calendar")}` +
    (employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : "");

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader title={T.title} subtitle={T.subtitle} />

      {!configured && (
        <GlassCard className="p-5">
          <p className="text-[13.5px] leading-[1.55]" style={{ color: "#B45309" }}>{T.notConfigured}</p>
        </GlassCard>
      )}

      {/* ── Google Calendar — the real integration ── */}
      <ConnectionCard
        connection={salonWide}
        title={T.googleTitle}
        body={T.googleBody}
        subtitle={T.salonWide}
        connectHref={connectHref()}
        configured={configured}
        locale={locale}
      />

      {/* ── Booksy — a setup guide, and labelled as one ── */}
      <GlassCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Overline>{T.booksyTitle}</Overline>
            <p className="text-[13px] font-medium text-slate-700 mt-2">{T.booksyStatus}</p>
            <p className="text-[13px] leading-[1.6] text-secondary mt-1.5 max-w-[62ch]">{T.booksyBody}</p>
          </div>
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: HAIRLINE }}>
          <GlassButton size="sm" onClick={() => setWizardOpen(true)}>{T.booksySetup}</GlassButton>
        </div>
      </GlassCard>

      {/* ── Per-specialist connections ── */}
      {employees.length > 0 && (
        <GlassCard className="p-5">
          <Overline>{T.employeesTitle}</Overline>
          <p className="text-[13px] leading-[1.6] text-secondary mt-2 max-w-[62ch]">{T.employeesBody}</p>

          <div className="mt-4">
            {employees.map((e) => {
              const health = healthOf(e.connection);
              return (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5"
                  style={{ borderTop: HAIRLINE }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-slate-900 truncate">{e.name}</p>
                    <p className="text-[12px] text-secondary truncate">
                      {e.connection?.calendarSummary ?? (health === "connected" ? T.noCalendarYet : T.employeeNotConnected)}
                    </p>
                  </div>
                  <StatusPill health={health} T={T as unknown as Record<string, string>} />
                  <a
                    href={connectHref(e.id)}
                    className="btn-spring text-[13px] font-semibold text-slate-700 underline underline-offset-[3px] decoration-slate-300 hover:decoration-slate-900 transition-colors"
                  >
                    {e.connection && health !== "disconnected" ? T.reconnect : T.connect}
                  </a>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Privacy is a feature here, so it is stated on the page, not buried. */}
      <p className="text-[12px] leading-[1.6] text-muted-glass max-w-[68ch] px-1">{T.privacyNote}</p>

      <BooksyWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        connected={healthOf(salonWide) === "connected"}
        connectHref={connectHref()}
      />
    </div>
  );
}

// ── One connection ───────────────────────────────────────────

function ConnectionCard({
  connection, title, body, subtitle, connectHref, configured, locale,
}: {
  connection: ConnectionView | null;
  title: string;
  body: string;
  subtitle: string;
  connectHref: string;
  configured: boolean;
  locale: string;
}) {
  const t = useT();
  const T = t.pages.calendarSync;
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [choices, setChoices] = useState<{ id: string; summary: string; primary: boolean }[]>([]);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const health = healthOf(connection);

  function openPicker() {
    if (!connection) return;
    start(async () => {
      const res = await fetchCalendarChoices(connection.id);
      if (!res.ok) { notify.error(res.error); return; }
      setChoices(res.calendars);
      setPickerOpen(true);
    });
  }

  function choose(id: string, summary: string) {
    if (!connection) return;
    start(async () => {
      try {
        const res = await selectCalendar(connection.id, id, summary);
        if (res.ok) { notify.saved(t.feedback.saved); setPickerOpen(false); router.refresh(); }
        else notify.error(res.error);
      } catch (e) {
        notify.error(errorText(e, t.errors.generic));
      }
    });
  }

  function toggle(field: "readBusy" | "writeEvents", value: boolean) {
    if (!connection) return;
    start(async () => {
      const res = await setSyncDirections(connection.id, { [field]: value });
      if (res.ok) { notify.saved(t.feedback.saved); router.refresh(); }
      else notify.error(res.error);
    });
  }

  function disconnect() {
    if (!connection) return;
    start(async () => {
      try {
        const res = await disconnectCalendar(connection.id);
        if (res.ok) { notify.saved(t.feedback.updated); router.refresh(); }
        else notify.error(res.error);
      } finally {
        setConfirmDisconnect(false);
      }
    });
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Overline>{title}</Overline>
          <p className="text-[13px] leading-[1.6] text-secondary mt-2 max-w-[62ch]">{body}</p>
        </div>
        <StatusPill health={health} T={T as unknown as Record<string, string>} />
      </div>

      {connection && health !== "disconnected" ? (
        <>
          <dl className="mt-4 pt-4 space-y-2 text-[13px]" style={{ borderTop: HAIRLINE }}>
            {connection.accountEmail && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-secondary">{subtitle}</dt>
                <dd className="font-medium text-slate-900 truncate">
                  {interpolate(T.connectedAs, { email: connection.accountEmail })}
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-secondary">{T.calendarLabel}</dt>
              <dd className="font-medium text-slate-900 truncate">
                {connection.calendarSummary ?? T.noCalendarYet}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-secondary">{T.lastSync.split(":")[0]}</dt>
              <dd className="text-slate-700">
                {connection.lastSyncedAt
                  ? formatRelative(connection.lastSyncedAt, locale as never, t.common.justNow ?? "")
                  : T.neverSynced}
              </dd>
            </div>
          </dl>

          {/* The two directions are separate decisions, so they are separate
              switches — see lib/actions/calendar-sync. */}
          <div className="mt-4 pt-4 space-y-3" style={{ borderTop: HAIRLINE }}>
            <SwitchRow
              title={T.dirReadTitle}
              body={T.dirReadBody}
              checked={connection.readBusy}
              disabled={isPending}
              onChange={(v) => toggle("readBusy", v)}
            />
            <SwitchRow
              title={T.dirWriteTitle}
              body={T.dirWriteBody}
              checked={connection.writeEvents}
              disabled={isPending}
              onChange={(v) => toggle("writeEvents", v)}
            />
          </div>

          <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: HAIRLINE }}>
            <GlassButton size="sm" onClick={openPicker} disabled={isPending}>
              {connection.calendarId ? T.changeCalendar : T.chooseCalendar}
            </GlassButton>
            <GlassButton size="sm" onClick={() => setConfirmDisconnect(true)} disabled={isPending}>
              {T.disconnect}
            </GlassButton>
          </div>
        </>
      ) : (
        <div className="mt-4 pt-4" style={{ borderTop: HAIRLINE }}>
          {configured ? (
            <a href={connectHref} data-on-ink className="btn-spring inline-flex items-center px-5 py-2.5 min-h-[42px] text-sm font-semibold rounded-[10px]"
               style={{ background: "var(--ink-raised)", border: "1px solid #0F172A", color: "#F8FAFC" }}>
              {T.connect}
            </a>
          ) : (
            <InkButton size="sm" disabled>{T.connect}</InkButton>
          )}
        </div>
      )}

      <GlassModal open={pickerOpen} onOpenChange={setPickerOpen} title={T.chooseCalendar}>
        <div className="space-y-1.5">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => choose(c.id, c.summary)}
              disabled={isPending}
              className="w-full text-left px-3.5 py-3 min-h-[48px] rounded-xl text-sm text-slate-800"
              style={{
                background: connection?.calendarId === c.id ? "var(--selected)" : "var(--surface)",
                border: `1px solid ${connection?.calendarId === c.id ? "var(--hairline)" : "var(--hairline-soft)"}`,
              }}
            >
              {c.summary}
              {c.primary && <span className="ml-2 text-[11px] text-slate-500">({T.salonWide})</span>}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <ModalGlassButton onClick={() => setPickerOpen(false)}>{t.common.close}</ModalGlassButton>
        </div>
      </GlassModal>

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title={T.disconnectTitle}
        body={T.disconnectBody}
        confirmLabel={T.disconnect}
        cancelLabel={t.common.cancel}
        busy={isPending}
        onConfirm={disconnect}
      />
    </GlassCard>
  );
}

function SwitchRow({
  title, body, checked, disabled, onChange,
}: {
  title: string; body: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-slate-900">{title}</p>
        <p className="text-[12.5px] leading-[1.55] text-secondary mt-0.5 max-w-[58ch]">{body}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 mt-0.5 disabled:opacity-60"
        style={{ background: checked ? "#0F172A" : "rgba(148,163,184,0.45)" }}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}
