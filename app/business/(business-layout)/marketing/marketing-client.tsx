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
  DORMANT_DAYS,
  REGULAR_MIN_VISITS,
  type Channel,
  type SegmentKey,
  type ChannelAvailability,
} from "@/lib/marketing";
import { sendCampaign, type SendResult } from "@/lib/actions/marketing";
import { generateCampaignCopyAction } from "@/lib/actions/ai";
import type { Insight } from "@/lib/ai/insights-types";
import { InsightCards } from "@/components/business/ai/insight-cards";
import {
  AutomationsPanel, TemplatesPanel, SegmentsPanel, ResultsPanel, PromotionsLink,
  type AutomationRow, type TemplateRow, type CampaignRow, type DeliveryStats,
} from "./marketing-panels";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";

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


export function MarketingClient({
  segments,
  channels,
  salonName,
  bookingUrl,
  totalCustomers,
  showWhatsapp = false,
  insights = [],
  automations = [],
  templates = [],
  campaigns = [],
  deliveryStats = { sent: 0, failed: 0, skipped: 0 },
}: {
  segments: SegmentView[];
  channels: ChannelAvailability;
  salonName: string;
  bookingUrl: string;
  totalCustomers: number;
  /** WhatsApp is feature-flagged off for launch — hidden entirely unless enabled server-side. */
  showWhatsapp?: boolean;
  insights?: Insight[];
  automations?: AutomationRow[];
  templates?: TemplateRow[];
  campaigns?: CampaignRow[];
  deliveryStats?: DeliveryStats;
}) {
  const t = useT();
  const T = t.pages.marketing;
  const locale = useLocale();
  const CH = (c: Channel) => t.channels[c];
  const segHint = (key: SegmentKey) =>
    interpolate(t.segments[key].hint, { n: key === "regulars" ? REGULAR_MIN_VISITS : DORMANT_DAYS });
  const SAMPLE_TEMPLATES: Record<Channel, string> = { sms: T.sampleSms, whatsapp: T.sampleWhatsapp, email: T.sampleEmail };
  const visibleChannels = CHANNELS.filter((c) => c !== "whatsapp" || showWhatsapp);
  const searchParams = useSearchParams();
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const firstAvailable = visibleChannels.find((c) => channels[c]) ?? "sms";
  const [channel, setChannel] = useState<Channel>(firstAvailable);
  const [segment, setSegment] = useState<SegmentKey>("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [isPending, start] = useTransition();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tab, setTab] = useState<"kampania" | "automatyzacje" | "szablony" | "segmenty" | "wyniki">("kampania");

  function applyTemplate(t: TemplateRow) {
    if ((t.channel === "sms" || t.channel === "email" || t.channel === "whatsapp") && channels[t.channel]) setChannel(t.channel);
    if (t.subject) setSubject(t.subject);
    setMessage(t.body);
    setTab("kampania");
  }

  async function generateWithAi() {
    setAiError(null);
    setAiBusy(true);
    try {
      const res = await generateCampaignCopyAction(segment, channel);
      if (res.ok) {
        setMessage(res.message);
        if (channel === "email" && res.subject) setSubject(res.subject);
      } else {
        setAiError(res.reason === "plan_excluded" ? T.aiPlanExcluded : res.message);
      }
    } catch {
      setAiError(T.aiFailed);
    } finally {
      setAiBusy(false);
    }
  }

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

  const previewName = seg?.sample ?? "Anna";
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
        <PageHeader title={T.title} subtitle={T.subtitleEmpty} />
        <GlassCard className="fade-rise">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
            title={T.emptyTitle}
            body={interpolate(T.emptyBody, { channels: showWhatsapp ? T.channelsWithWa : T.channelsNoWa })}
            action={
              <InkButton size="sm" onClick={copyLink}>
                {copied ? t.common.copied : T.copyBookingLink}
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
        title={T.title}
        subtitle={
          <span className="tabular-nums">
            {totalCustomers} {totalCustomers === 1 ? T.clientOne : T.clientMany} · {interpolate(T.subtitleCount, { n: totalCustomers })}
          </span>
        }
      />

      {insights.length > 0 && (
        <div className="space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{T.recommendations}</span>
          <InsightCards insights={insights} severityLabels={t.insightSeverity} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel={T.tabsAria}
          idBase="mkt-tab"
          size="sm"
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { value: "kampania", label: T.tabCampaign },
            { value: "automatyzacje", label: T.tabAutomations, count: automations.length },
            { value: "szablony", label: T.tabTemplates, count: templates.length },
            { value: "segmenty", label: T.tabSegments },
            { value: "wyniki", label: T.tabResults, count: campaigns.length },
          ]}
        />
        <PromotionsLink />
      </div>

      {tab === "automatyzacje" && <AutomationsPanel automations={automations} channels={channels} />}
      {tab === "szablony" && <TemplatesPanel templates={templates} onUse={applyTemplate} />}
      {tab === "segmenty" && <SegmentsPanel segments={segments} />}
      {tab === "wyniki" && <ResultsPanel campaigns={campaigns} delivery={deliveryStats} locale={locale} />}

      {tab === "kampania" && (
      <div className="grid gap-4 lg:grid-cols-[360px_1fr] items-start">
        {/* ── Audience + channel + link ─────────────────────── */}
        <div className="space-y-4">
          {/* Channel */}
          <GlassCard className="fade-rise fade-rise-d1 p-4">
            <Overline className="mb-2.5">{T.channelTitle}</Overline>
            <Segmented
              ariaLabel={T.channelAria}
              value={channel}
              onChange={(v) => setChannel(v as Channel)}
              idBase="mkt-channel"
              className="w-full"
              options={visibleChannels.map((c) => ({ value: c, label: CH(c) }))}
            />
            <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed">
              <span
                className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: available ? "#059669" : "#94A3B8" }}
                aria-hidden="true"
              />
              {available ? (
                <p className="text-slate-500">
                  {T.channelReadyPre} <span className="font-medium text-slate-700">{CH(channel)}</span> {T.channelReadyPost}
                </p>
              ) : (
                <p className="text-slate-500">
                  {T.channelMissingPre} <span className="font-medium text-slate-700">{CH(channel)}</span> {T.channelMissingPost}{" "}
                  <span className="font-mono text-[11px] text-slate-600">{CHANNEL_ENV_HINT[channel]}</span>.
                </p>
              )}
            </div>
          </GlassCard>

          {/* Audience */}
          <GlassCard className="fade-rise fade-rise-d2 overflow-hidden">
            <CardHeader title={T.audience} />
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
                        {t.segments[s.key].label}
                      </span>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">{s.total}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{segHint(s.key)}</p>
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-3.5" style={{ borderTop: HAIRLINE }}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-slate-500">{T.reachablePre} {CH(channel)}</span>
                <span className="text-sm font-semibold text-slate-900 tabular-nums">
                  {reach} <span className="text-slate-400 font-normal">{interpolate(T.reachableOf, { n: seg?.total ?? 0 })}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {interpolate(T.reachableNote, { contact: channel === "email" ? T.contactEmail : T.contactPhone })}
              </p>
            </div>
          </GlassCard>

          {/* Booking link */}
          <GlassCard className="fade-rise fade-rise-d3 p-4">
            <Overline className="mb-2">{t.pages.today.bookingLink}</Overline>
            <div className="px-3 py-2 rounded-xl text-xs text-slate-600 truncate tabular-nums mb-2.5" style={CHIP}>
              {bookingUrl}
            </div>
            <div className="flex gap-2">
              <GlassButton size="sm" onClick={copyLink} className="flex-1">
                {copied ? t.common.copied : t.common.copyLink}
              </GlassButton>
              <GlassButton size="sm" onClick={() => insertToken("{link}")} className="flex-1">
                {T.insertToBody}
              </GlassButton>
            </div>
          </GlassCard>
        </div>

        {/* ── Composer + preview ────────────────────────────── */}
        <div className="space-y-4">
          <GlassCard className="fade-rise fade-rise-d1">
            <CardHeader
              title={T.messageTitle}
              action={
                <div className="flex items-center gap-1.5">
                  {(["{imię}", "{salon}", "{link}"] as const).map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => insertToken(tok)}
                      className="text-[11px] font-mono font-semibold px-2 py-1 rounded-lg text-slate-600 transition-colors hover:text-slate-900"
                      style={CHIP}
                      title={interpolate(T.insertToken, { token: tok })}
                    >
                      {tok}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="p-5 space-y-4">
              {channel === "email" && (
                <div>
                  <label htmlFor="mkt-subject" className="block text-sm font-medium text-slate-700 mb-1.5">
                    {T.subject}
                  </label>
                  <input
                    id="mkt-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={T.subjectPh}
                    className={INPUT}
                  />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="mkt-body" className="text-sm font-medium text-slate-700">
                    {T.bodyLabel}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={generateWithAi}
                      disabled={aiBusy}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-60"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true"><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" /></svg>
                      {aiBusy ? T.aiGenerating : T.aiSuggest}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage(SAMPLE_TEMPLATES[channel])}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      {T.insertSample}
                    </button>
                  </div>
                </div>
                {aiError && <p className="mb-1.5 text-[11px]" style={{ color: "#BE123C" }}>{aiError}</p>}
                <textarea
                  id="mkt-body"
                  ref={composerRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={channel === "email" ? 7 : 4}
                  placeholder={T.bodyPh}
                  className={cn(INPUT, "resize-y leading-relaxed")}
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                  <span>
                    {charCount} {T.chars}
                    {channel === "sms" && (
                      <span className="text-slate-400">
                        {" "}
                        · ~{smsSegments} {smsSegments === 1 ? T.smsOne : T.smsMany}
                      </span>
                    )}
                  </span>
                  <span>{T.previewHint}</span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Preview */}
          <GlassCard className="fade-rise fade-rise-d2">
            <CardHeader title={interpolate(T.previewTitle, { channel: CH(channel) })} action={<span className="text-xs text-slate-400">{interpolate(T.previewFor, { name: previewName })}</span>} />
            <div className="p-5">
              {channel === "email" ? (
                <div className="rounded-2xl overflow-hidden" style={{ border: HAIRLINE, background: "#fff" }}>
                  <div className="px-4 py-3" style={{ borderBottom: HAIRLINE }}>
                    <p className="text-[11px] text-slate-400">{T.previewSubject}</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {previewSubject || <span className="text-slate-300">{T.previewNoSubject}</span>}
                    </p>
                  </div>
                  <div className="px-4 py-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[64px]">
                    {previewBody || <span className="text-slate-300">{T.previewNoBody}</span>}
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
                    {previewBody || <span className="text-slate-300">{T.previewNoBody}</span>}
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
                  : { background: "var(--selected)", border: "1px solid rgba(148,163,184,0.40)", color: "#334155" }
              }
            >
              {result.ok ? (
                <p className="font-medium tabular-nums">
                  {result.sent > 0
                    ? interpolate(T.resultSent, { sent: result.sent, reachable: result.reachable, channel: CH(result.channel), segment: result.segmentLabel })
                    : interpolate(T.resultNone, { n: result.reachable })}
                  {result.failed > 0 && ` ${interpolate(T.resultFailed, { n: result.failed })}`}
                </p>
              ) : (
                <p className="font-medium">{result.reason}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400" aria-live="polite">
              {draftSaved ? T.draftSaved : ""}
            </span>
            <div className="flex gap-2.5">
              <GlassButton onClick={saveDraft}>{T.saveDraft}</GlassButton>
              <InkButton onClick={() => setConfirmOpen(true)} disabled={!canSend} title={!available ? T.channelUnavailable : reach === 0 ? T.noReach : undefined}>
                {available ? interpolate(T.sendTo, { n: reach }) : T.sendUnavailable}
              </InkButton>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Confirm send */}
      <GlassModal open={confirmOpen} onOpenChange={setConfirmOpen} title={T.confirmTitle} className="max-w-md">
        <div className="space-y-4 mt-1">
          <p className="text-sm text-slate-600 leading-relaxed">
            {T.confirmBodyPre} <span className="font-semibold text-slate-900">{CH(channel)}</span> {T.confirmBodyTo}{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{reach}</span>{" "}
            {reach === 1 ? T.confirmClientOne : T.confirmClientMany} {T.confirmGroup}{" "}
            <span className="font-semibold text-slate-900">„{seg ? t.segments[seg.key].label : ""}”</span>.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">{T.confirmNote}</p>
          <div className="flex gap-3 pt-1">
            <GlassButton onClick={() => setConfirmOpen(false)} className="flex-1">
              {t.common.cancel}
            </GlassButton>
            <InkButton onClick={doSend} disabled={isPending} className="flex-1">
              {isPending ? T.sending : interpolate(T.sendTo, { n: reach })}
            </InkButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
