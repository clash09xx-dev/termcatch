"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  GlassCard,
  CardHeader,
  EmptyState,
  InkButton,
  GlassButton,
  Overline,
  CHIP,
  HAIRLINE,
} from "@/components/ui/glass";
import { GlassModal } from "@/components/ui/glass-modal";
import { Segmented } from "@/components/ui/segmented";
import {
  CHANNEL_LABEL,
  CHANNEL_ENV_HINT,
  renderMessage,
  type Channel,
  type SegmentKey,
  type ChannelAvailability,
} from "@/lib/marketing";
import { sendCampaign, type SendResult } from "@/lib/actions/marketing";

export type SegmentView = {
  key: SegmentKey;
  label: string;
  hint: string;
  total: number;
  reach: Record<Channel, number>;
  sample: string | null;
};

const INPUT = "input-glass w-full px-3.5 py-2.5 text-sm rounded-xl outline-none text-slate-800 placeholder:text-slate-400";
const DRAFT_KEY = "tc-marketing-draft-v1";
const CHANNELS: Channel[] = ["sms", "whatsapp", "email"];

type Draft = { channel: Channel; segment: SegmentKey; subject: string; message: string };

const SAMPLE_TEMPLATES: Record<Channel, string> = {
  sms: "Cześć {imię}! W {salon} zwolnił się termin w tym tygodniu — zarezerwuj online: {link}",
  whatsapp: "Cześć {imię}! 👋 Tu {salon}. Mamy dla Ciebie wolne terminy — wybierz dogodny: {link}",
  email: "Cześć {imię},\n\nDawno Cię u nas nie było! W {salon} czekają na Ciebie nowe terminy.\n\nDo zobaczenia!",
};

export function MarketingClient({
  segments,
  channels,
  salonName,
  bookingUrl,
  totalCustomers,
}: {
  segments: SegmentView[];
  channels: ChannelAvailability;
  salonName: string;
  bookingUrl: string;
  totalCustomers: number;
}) {
  const searchParams = useSearchParams();
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const firstAvailable = CHANNELS.find((c) => channels[c]) ?? "sms";
  const [channel, setChannel] = useState<Channel>(firstAvailable);
  const [segment, setSegment] = useState<SegmentKey>("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [isPending, start] = useTransition();

  // Restore a saved draft on mount; focus the composer on ?action=new.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<Draft>;
        if (d.channel && channels[d.channel]) setChannel(d.channel);
        if (d.segment) setSegment(d.segment);
        if (typeof d.subject === "string") setSubject(d.subject);
        if (typeof d.message === "string") setMessage(d.message);
      }
    } catch {
      /* ignore malformed draft */
    }
    if (searchParams.get("action") === "new") {
      setTimeout(() => composerRef.current?.focus(), 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seg = segments.find((s) => s.key === segment) ?? segments[0];
  const reach = seg ? seg.reach[channel] : 0;
  const available = channels[channel];

  const previewName = seg?.sample ?? "Aniu";
  const previewBody = useMemo(
    () => renderMessage(message || "", { firstName: previewName, salon: salonName, link: bookingUrl }),
    [message, previewName, salonName, bookingUrl]
  );
  const previewSubject = useMemo(
    () => renderMessage(subject || "", { firstName: previewName, salon: salonName, link: bookingUrl }),
    [subject, previewName, salonName, bookingUrl]
  );
  const charCount = previewBody.length;
  const smsSegments = Math.max(1, Math.ceil(charCount / 160));

  const canSend =
    available && reach > 0 && message.trim().length > 0 && (channel !== "email" || subject.trim().length > 0) && !isPending;

  function insertToken(token: string) {
    const el = composerRef.current;
    if (!el) {
      setMessage((m) => m + token);
      return;
    }
    const startPos = el.selectionStart ?? message.length;
    const endPos = el.selectionEnd ?? message.length;
    const next = message.slice(0, startPos) + token + message.slice(endPos);
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = startPos + token.length;
      el.setSelectionRange(caret, caret);
    });
  }

  function saveDraft() {
    const draft: Draft = { channel, segment, subject, message };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2200);
    } catch {
      /* storage unavailable — non-critical */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  function doSend() {
    setResult(null);
    start(async () => {
      const res = await sendCampaign({ segment, channel, subject, message });
      setResult(res);
      setConfirmOpen(false);
    });
  }

  // ── New salon / no customers yet ──────────────────────────────
  if (totalCustomers === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <PageHeader title="Marketing" subtitle="Kampanie do Twojej bazy klientów" />
        <GlassCard className="fade-rise">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
            title="Twoja baza klientów jest jeszcze pusta"
            body="Kampanie SMS, WhatsApp i e-mail pojawią się, gdy zdobędziesz pierwszych klientów. Zacznij od udostępnienia linku do rezerwacji."
            action={
              <InkButton size="sm" onClick={copyLink}>
                {copied ? "Skopiowano ✓" : "Kopiuj link do rezerwacji"}
              </InkButton>
            }
          />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Marketing"
        subtitle={
          <span className="tabular-nums">
            {totalCustomers} {totalCustomers === 1 ? "klient" : "klientów"} w bazie · przygotuj kampanię
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr] items-start">
        {/* ── Audience + channel + link ─────────────────────── */}
        <div className="space-y-4">
          {/* Channel */}
          <GlassCard className="fade-rise fade-rise-d1 p-4">
            <Overline className="mb-2.5">Kanał</Overline>
            <Segmented
              ariaLabel="Kanał wysyłki"
              value={channel}
              onChange={(v) => setChannel(v as Channel)}
              idBase="mkt-channel"
              className="w-full"
              options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))}
            />
            <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed">
              <span
                className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: available ? "#059669" : "#94A3B8" }}
                aria-hidden="true"
              />
              {available ? (
                <p className="text-slate-500">
                  Wysyłka <span className="font-medium text-slate-700">{CHANNEL_LABEL[channel]}</span> jest
                  skonfigurowana — kampania zostanie realnie wysłana.
                </p>
              ) : (
                <p className="text-slate-500">
                  Wysyłka <span className="font-medium text-slate-700">{CHANNEL_LABEL[channel]}</span> nie jest jeszcze
                  skonfigurowana. Możesz przygotować treść i zapisać roboczą — wyślesz, gdy dodasz{" "}
                  <span className="font-mono text-[11px] text-slate-600">{CHANNEL_ENV_HINT[channel]}</span>.
                </p>
              )}
            </div>
          </GlassCard>

          {/* Audience */}
          <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
            <CardHeader title="Odbiorcy" />
            <div className="p-2">
              {segments.map((s) => {
                const active = s.key === segment;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSegment(s.key)}
                    aria-pressed={active}
                    className={cn(
                      "w-full text-left rounded-xl px-3.5 py-3 transition-colors",
                      active ? "" : "hover:bg-slate-500/5"
                    )}
                    style={active ? CHIP : undefined}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("text-sm font-semibold", active ? "text-slate-900" : "text-slate-700")}>
                        {s.label}
                      </span>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">{s.total}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.hint}</p>
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-3.5" style={{ borderTop: HAIRLINE }}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-slate-500">Osiągalnych przez {CHANNEL_LABEL[channel]}</span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                  {reach} <span className="text-slate-400 font-normal">z {seg?.total ?? 0}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Liczymy tylko klientów, którzy mają {channel === "email" ? "adres e-mail" : "numer telefonu"} i zgodę na
                wiadomości marketingowe.
              </p>
            </div>
          </GlassCard>

          {/* Booking link */}
          <GlassCard className="fade-rise fade-rise-d3 p-4">
            <Overline className="mb-2">Link do rezerwacji</Overline>
            <div className="px-3 py-2 rounded-xl text-xs text-slate-600 truncate tabular-nums mb-2.5" style={CHIP}>
              {bookingUrl}
            </div>
            <div className="flex gap-2">
              <GlassButton size="sm" onClick={copyLink} className="flex-1">
                {copied ? "Skopiowano ✓" : "Kopiuj link"}
              </GlassButton>
              <GlassButton size="sm" onClick={() => insertToken("{link}")} className="flex-1">
                Wstaw do treści
              </GlassButton>
            </div>
          </GlassCard>
        </div>

        {/* ── Composer + preview ────────────────────────────── */}
        <div className="space-y-4">
          <GlassCard className="fade-rise fade-rise-d1">
            <CardHeader
              title="Wiadomość"
              action={
                <div className="flex items-center gap-1.5">
                  {(["{imię}", "{salon}", "{link}"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => insertToken(t)}
                      className="text-[11px] font-mono font-semibold px-2 py-1 rounded-lg text-slate-600 transition-colors hover:text-slate-900"
                      style={CHIP}
                      title={`Wstaw ${t}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="p-5 space-y-4">
              {channel === "email" && (
                <div>
                  <label htmlFor="mkt-subject" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Temat
                  </label>
                  <input
                    id="mkt-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Wolne terminy w tym tygodniu"
                    className={INPUT}
                  />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="mkt-body" className="text-sm font-medium text-slate-700">
                    Treść
                  </label>
                  <button
                    type="button"
                    onClick={() => setMessage(SAMPLE_TEMPLATES[channel])}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Wstaw przykład
                  </button>
                </div>
                <textarea
                  id="mkt-body"
                  ref={composerRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={channel === "email" ? 7 : 4}
                  placeholder={`Napisz wiadomość do klientów. Użyj {imię}, {salon} lub {link}, aby wstawić dane każdego odbiorcy.`}
                  className={cn(INPUT, "resize-y leading-relaxed")}
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                  <span>
                    {charCount} znaków
                    {channel === "sms" && (
                      <span className="text-slate-400">
                        {" "}
                        · ~{smsSegments} {smsSegments === 1 ? "SMS" : "SMS-y"}
                      </span>
                    )}
                  </span>
                  <span>podgląd z realnymi danymi odbiorcy poniżej</span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Preview */}
          <GlassCard className="fade-rise fade-rise-d2">
            <CardHeader title={`Podgląd — ${CHANNEL_LABEL[channel]}`} action={<span className="text-xs text-slate-400">dla: {previewName}</span>} />
            <div className="p-5">
              {channel === "email" ? (
                <div className="rounded-2xl overflow-hidden" style={{ border: HAIRLINE, background: "#fff" }}>
                  <div className="px-4 py-3" style={{ borderBottom: HAIRLINE }}>
                    <p className="text-[11px] text-slate-400">Temat</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {previewSubject || <span className="text-slate-300">— temat —</span>}
                    </p>
                  </div>
                  <div className="px-4 py-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[64px]">
                    {previewBody || <span className="text-slate-300">— treść wiadomości —</span>}
                  </div>
                </div>
              ) : (
                <div className="flex">
                  <div
                    className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed"
                    style={{
                      background: channel === "whatsapp" ? "rgba(16,185,129,0.10)" : "rgba(203,213,225,0.22)",
                      border: channel === "whatsapp" ? "1px solid rgba(16,185,129,0.25)" : HAIRLINE,
                    }}
                  >
                    {previewBody || <span className="text-slate-300">— treść wiadomości —</span>}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Result */}
          {result && (
            <div
              className="rounded-2xl px-4 py-3.5 text-sm fade-rise"
              style={
                result.ok && result.sent > 0
                  ? { background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" }
                  : { background: "rgba(203,213,225,0.20)", border: "1px solid rgba(148,163,184,0.40)", color: "#334155" }
              }
            >
              {result.ok ? (
                <p className="font-medium tabular-nums">
                  {result.sent > 0
                    ? `Wysłano ${result.sent} z ${result.reachable} wiadomości (${CHANNEL_LABEL[result.channel]}, grupa „${result.segmentLabel}”).`
                    : `Nie udało się wysłać żadnej wiadomości (${result.reachable} prób).`}
                  {result.failed > 0 && ` Nieudanych: ${result.failed}.`}
                </p>
              ) : (
                <p className="font-medium">{result.reason}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400" aria-live="polite">
              {draftSaved ? "Zapisano roboczą wersję ✓" : ""}
            </span>
            <div className="flex gap-2.5">
              <GlassButton onClick={saveDraft}>Zapisz roboczą</GlassButton>
              <InkButton onClick={() => setConfirmOpen(true)} disabled={!canSend} title={!available ? "Kanał niedostępny" : reach === 0 ? "Brak osiągalnych odbiorców" : undefined}>
                {available ? `Wyślij do ${reach}` : "Wysyłka niedostępna"}
              </InkButton>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm send */}
      <GlassModal open={confirmOpen} onOpenChange={setConfirmOpen} title="Wysłać kampanię?" className="max-w-md">
        <div className="space-y-4 mt-1">
          <p className="text-sm text-slate-600 leading-relaxed">
            Wyślesz wiadomość <span className="font-semibold text-slate-900">{CHANNEL_LABEL[channel]}</span> do{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{reach}</span>{" "}
            {reach === 1 ? "klienta" : "klientów"} z grupy{" "}
            <span className="font-semibold text-slate-900">„{seg?.label}”</span>.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Otrzymają ją tylko klienci z ważnym kontaktem i zgodą marketingową. Wiadomości nie można cofnąć po wysłaniu.
          </p>
          <div className="flex gap-3 pt-1">
            <GlassButton onClick={() => setConfirmOpen(false)} className="flex-1">
              Anuluj
            </GlassButton>
            <InkButton onClick={doSend} disabled={isPending} className="flex-1">
              {isPending ? "Wysyłanie…" : `Wyślij do ${reach}`}
            </InkButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
