"use client";

import { useState, useTransition } from "react";
import { InkButton, GlassButton } from "@/components/ui/glass";
import { CHIP } from "@/components/ui/glass/tokens";
import {
  connectFakturownia,
  disconnectFakturownia,
  testFakturowniaConnection,
} from "@/lib/actions/integrations";
import type { ConnectionStatus } from "@/lib/fakturownia/connection";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { intlLocale } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const INPUT_CLS =
  "input-glass w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none";

type Feedback = { kind: "ok" | "err"; text: string } | null;

// Stable action/error codes → localized copy (backend stays language-free).
const CODE_KEY: Record<string, keyof Dictionary["fakturownia"]> = {
  CONNECTED: "okConnected", DISCONNECTED: "okDisconnected", TEST_OK: "okTest",
  NO_ACCESS: "errNoAccess", ENCRYPTION_UNAVAILABLE: "errEncryption",
  ACCOUNT_REQUIRED: "errAccountRequired", ACCOUNT_INVALID: "errAccountInvalid",
  TOKEN_REQUIRED: "errTokenRequired", TOKEN_TOO_SHORT: "errTokenShort",
  NOT_CONNECTED: "errNotConnected", INVALID_TOKEN: "errInvalidToken",
  NO_PERMISSION: "errNoPermission", NOT_FOUND: "errNotFound",
  RATE_LIMITED: "errRateLimited", UNAVAILABLE: "errUnavailable",
  TIMEOUT: "errTimeout", NETWORK: "errNetwork",
};

export function FakturowniaIntegrationCard({ initial }: { initial: ConnectionStatus }) {
  const t = useT();
  const f = t.fakturownia;
  const locale = useLocale();
  const [status, setStatus] = useState<ConnectionStatus>(initial);
  const [editing, setEditing] = useState(false);
  const [account, setAccount] = useState("");
  const [token, setToken] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, start] = useTransition();

  const showForm = editing || (!status.connected && !status.needsReconnect) || status.needsReconnect;

  const msg = (code: string): string => {
    const k = CODE_KEY[code];
    return k ? f[k] : f.errGeneric;
  };

  const fmtDate = (d: Date | string | null): string => {
    if (!d) return "—";
    const date = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short" }).format(date);
  };

  function connect() {
    setFeedback(null);
    start(async () => {
      const res = await connectFakturownia(account, token);
      setFeedback({ kind: res.ok ? "ok" : "err", text: msg(res.code) });
      if (res.ok) {
        if (res.status) setStatus(res.status);
        setEditing(false);
        setAccount("");
        setToken("");
      }
    });
  }

  function disconnect() {
    setFeedback(null);
    start(async () => {
      const res = await disconnectFakturownia();
      setFeedback({ kind: res.ok ? "ok" : "err", text: msg(res.code) });
      if (res.status) setStatus(res.status);
      setEditing(false);
    });
  }

  function test() {
    setFeedback(null);
    start(async () => {
      const res = await testFakturowniaConnection();
      setFeedback({ kind: res.ok ? "ok" : "err", text: msg(res.code) });
      if (res.status) setStatus(res.status);
    });
  }

  return (
    <div className="rounded-2xl p-5" style={CHIP}>
      {/* Header + connection state */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Fakturownia</h3>
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{f.description}</p>
        </div>
        <StatusPill connected={status.connected} label={status.connected ? f.connected : f.notConnected} />
      </div>

      {/* Connected details */}
      {status.connected && !editing && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Detail label={f.account} value={status.accountName ?? "—"} />
          <Detail label={f.lastSync} value={fmtDate(status.lastSyncAt)} />
        </div>
      )}

      {status.needsReconnect && (
        <p className="mt-3 rounded-xl px-3 py-2 text-xs font-medium" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", color: "#B45309" }}>
          {f.needsReconnect}
        </p>
      )}

      {/* Connect / replace-token form */}
      {showForm && (
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="fk-account" className="mb-1 block text-xs font-medium text-slate-600">
              {f.accountNameLabel}
            </label>
            <input
              id="fk-account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={f.accountPlaceholder}
              autoComplete="off"
              className={INPUT_CLS}
            />
            <p className="mt-1 text-[11px] text-slate-400">{f.accountHint}</p>
          </div>
          <div>
            <label htmlFor="fk-token" className="mb-1 block text-xs font-medium text-slate-600">
              {f.tokenLabel}
            </label>
            <input
              id="fk-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="off"
              className={`${INPUT_CLS} tabular-nums`}
            />
            <p className="mt-1 text-[11px] text-slate-400">{f.tokenHint}</p>
          </div>
          <div className="flex items-center gap-2">
            <InkButton onClick={connect} disabled={pending || !account.trim() || !token.trim()}>
              {pending ? f.connecting : status.connected || status.needsReconnect ? f.saveToken : f.connect}
            </InkButton>
            {(editing || status.connected) && (
              <GlassButton onClick={() => { setEditing(false); setFeedback(null); setAccount(""); setToken(""); }} disabled={pending}>
                {f.cancel}
              </GlassButton>
            )}
          </div>
        </div>
      )}

      {/* Connected actions */}
      {status.connected && !editing && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <GlassButton onClick={test} disabled={pending}>
            {pending ? f.testing : f.test}
          </GlassButton>
          <GlassButton onClick={() => { setEditing(true); setAccount(status.accountName ?? ""); setFeedback(null); }} disabled={pending}>
            {f.changeToken}
          </GlassButton>
          <button
            type="button"
            onClick={disconnect}
            disabled={pending}
            className="rounded-xl px-3.5 py-2 text-sm font-medium"
            style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.28)", color: "#BE123C" }}
          >
            {f.disconnect}
          </button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <p
          role="status"
          className="mt-3 rounded-xl px-3 py-2 text-xs font-medium"
          style={
            feedback.kind === "ok"
              ? { background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.28)", color: "#047857" }
              : { background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.28)", color: "#BE123C" }
          }
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

function StatusPill({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span
      className="flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={
        connected
          ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.30)", color: "#047857" }
          : { background: "rgba(148,163,184,0.14)", border: "1px solid var(--hairline)", color: "#64748B" }
      }
    >
      {label}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/60 px-3 py-2" style={{ border: "1px solid var(--hairline-soft)" }}>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="truncate text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
