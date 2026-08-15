"use client";

import { useState, useMemo, useTransition } from "react";
import { replyToReview } from "@/lib/actions/reviews";
import { generateReviewReplyDraft } from "@/lib/actions/ai";
import type { ReviewTone } from "@/lib/ai/features/reviews";
import {
  PageHeader, GlassCard, EmptyState, InkButton, GlassButton, ChromeAvatar, Overline,
  HAIRLINE, CHIP, INK_GRADIENT, STATUS_TINT,
} from "@/components/ui/glass";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "@/components/i18n/i18n-provider";
import { formatDate as fmtDate } from "@/lib/i18n/format";
import { interpolate } from "@/lib/i18n/dictionaries";
import { notify, errorText } from "@/lib/notify";

type ReviewData = {
  id: string; rating: number; comment: string | null;
  replyText: string | null; repliedAt: string | null; createdAt: string; customerName: string;
};
type StarDist = { star: number; count: number; pct: number };
type Props = { reviews: ReviewData[]; avgRating: number; totalCount: number; starDistribution: StarDist[] };

const STAR = "M11.48 3.5a.56.56 0 0 1 1.04 0l2.12 5.11a.56.56 0 0 0 .48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.38a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.6 0l-4.72 2.88a.56.56 0 0 1-.84-.61l1.28-5.38a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .48-.35Z";

function Stars({ rating, label, cls = "w-3.5 h-3.5" }: { rating: number; label: string; cls?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={cn(cls, s <= rating ? "text-amber-400" : "text-slate-300")} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={STAR} /></svg>
      ))}
    </span>
  );
}

export function ReviewsClient({ reviews: initial, avgRating, totalCount, starDistribution }: Props) {
  const t = useT();
  const T = t.pages.reviews;
  const locale = useLocale();
  const starLabel = (n: number) => interpolate(T.ratingAria, { n });
  const [reviews, setReviews] = useState(initial);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [tone, setTone] = useState<ReviewTone>("professional");
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function generate(id: string) {
    setAiError(null);
    setAiPending(true);
    try {
      const res = await generateReviewReplyDraft(id, tone);
      if (res.ok) setReplyText(res.text);
      else setAiError(res.reason === "plan_excluded" ? T.aiPlanExcluded : res.message);
    } catch {
      setAiError(T.aiFailed);
    } finally {
      setAiPending(false);
    }
  }

  const unanswered = reviews.filter((r) => !r.replyText).length;
  const answered = totalCount - unanswered;
  const responseRate = totalCount > 0 ? Math.round((answered / totalCount) * 100) : 100;
  const [filter, setFilter] = useState<"unanswered" | "all" | "low">(unanswered > 0 ? "unanswered" : "all");

  const list = useMemo(() => {
    let l = reviews;
    if (filter === "unanswered") l = l.filter((r) => !r.replyText);
    if (filter === "low") l = l.filter((r) => r.rating <= 3);
    // unanswered first, then newest
    return [...l].sort((a, b) => {
      const au = a.replyText ? 1 : 0, bu = b.replyText ? 1 : 0;
      if (au !== bu) return au - bu;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reviews, filter]);

  function submit(id: string) {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    startTransition(async () => {
      try {
        await replyToReview(id, text);
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, replyText: text, repliedAt: new Date().toISOString() } : r)));
        setReplyingTo(null);
        setReplyText("");
        notify.saved(t.feedback.published);
      } catch (e) {
        notify.error(errorText(e, t.feedback.failed));
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title={T.title} subtitle={T.subtitle} />

      {totalCount === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={STAR} /></svg>}
            title={T.emptyTitle}
            body={T.emptyBody}
          />
        </GlassCard>
      ) : (
        <>
          {/* Reputation summary — rating + distribution + response ring */}
          <GlassCard className="fade-rise fade-rise-d1 p-5">
            <div className="grid sm:grid-cols-[auto_1fr_auto] gap-6 items-center">
              <div className="text-center">
                <p className="text-5xl font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "var(--track-display)" }}>{avgRating.toFixed(1)}</p>
                <div className="mt-1.5 flex justify-center"><Stars rating={Math.round(avgRating)} label={starLabel(Math.round(avgRating))} cls="w-4 h-4" /></div>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">{interpolate(T.reviewsCount, { n: totalCount })}</p>
              </div>
              <div className="space-y-1.5 min-w-0">
                {starDistribution.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2.5">
                    <span className="w-3 text-xs text-slate-500 tabular-nums text-right">{star}</span>
                    <svg className="w-3 h-3 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d={STAR} /></svg>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--selected)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: INK_GRADIENT }} />
                    </div>
                    <span className="w-5 text-xs text-slate-500 tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
              {/* Response ring */}
              <div className="hidden sm:flex flex-col items-center gap-1.5 pl-4" style={{ borderLeft: HAIRLINE }}>
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(203,213,225,0.4)" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={responseRate === 100 ? "#059669" : "#0F172A"} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(responseRate / 100) * 94.2} 94.2`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 tabular-nums">{responseRate}%</span>
                </div>
                <p className="text-[10px] text-slate-500 text-center leading-tight">{T.responses}</p>
              </div>
            </div>
          </GlassCard>

          {/* Filter */}
          <div className="fade-rise fade-rise-d2 flex items-center justify-between gap-3">
            <Segmented
              ariaLabel={T.filterAria} idBase="rev-filter" size="sm" value={filter} onChange={(v) => setFilter(v as typeof filter)}
              options={[
                { value: "unanswered", label: T.filterUnanswered, count: unanswered },
                { value: "all", label: T.filterAll, count: totalCount },
                { value: "low", label: T.filterLow, count: reviews.filter((r) => r.rating <= 3).length },
              ]}
            />
          </div>

          {/* Stream */}
          <div className="fade-rise fade-rise-d2 space-y-3">
            {list.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-800">{filter === "unanswered" ? T.allAnswered : T.noneInFilter}</p>
              </GlassCard>
            ) : list.map((r) => {
              const needsReply = !r.replyText;
              const editing = replyingTo === r.id;
              return (
                <div key={r.id} className="rounded-[20px] p-5" style={{ background: "var(--surface)", border: "1px solid var(--hairline)", borderLeft: needsReply ? "3px solid #0F172A" : "1px solid var(--hairline)", boxShadow: "var(--e1)" }}>
                  <div className="flex items-start gap-3">
                    <ChromeAvatar initials={r.customerName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{r.customerName}</p>
                        <Stars rating={r.rating} label={starLabel(r.rating)} />
                        {needsReply && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide" style={STATUS_TINT.PENDING.style}>{T.needsReply}</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{fmtDate(new Date(r.createdAt), locale)}</p>
                    </div>
                  </div>

                  {r.comment && <p className="text-sm text-slate-700 mt-3 leading-relaxed">{r.comment}</p>}

                  {r.replyText && !editing && (
                    <div className="mt-4 pl-4 py-2" style={{ borderLeft: "3px solid var(--hairline-firm)" }}>
                      <p className="text-xs font-semibold text-slate-700 mb-1">{T.yourReply}</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{r.replyText}</p>
                    </div>
                  )}

                  {editing ? (
                    <div className="mt-4 space-y-2.5">
                      {r.rating <= 3 && (
                        <p className="text-xs rounded-lg px-3 py-2" style={{ background: "rgba(225,29,72,0.06)", color: "#9F1239", border: "1px solid rgba(225,29,72,0.2)" }}>
                          {T.criticalNote}
                        </p>
                      )}
                      {/* AI-assisted draft (generation only — publishing stays a separate, explicit click) */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{T.toneLabel}</span>
                        {(["professional", "friendly", "short"] as ReviewTone[]).map((tone2) => (
                          <button
                            key={tone2}
                            type="button"
                            onClick={() => setTone(tone2)}
                            className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", tone === tone2 ? "text-white" : "text-slate-600 hover:text-slate-900")}
                            style={tone === tone2 ? { background: INK_GRADIENT } : { border: "1px solid var(--hairline)" }}
                          >
                            {tone2 === "professional" ? T.toneProfessional : tone2 === "friendly" ? T.toneFriendly : T.toneShort}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => generate(r.id)}
                          disabled={aiPending}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-60"
                          style={{ border: "1px solid var(--hairline)" }}
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" /></svg>
                          {aiPending ? T.aiGenerating : T.aiSuggest}
                        </button>
                      </div>
                      {aiError && <p className="text-xs" style={{ color: "#BE123C" }}>{aiError}</p>}
                      <textarea autoFocus rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={T.replyPh} aria-label={T.replyAria} className="input-glass w-full rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 resize-none" />
                      <div className="flex gap-2">
                        <GlassButton size="sm" onClick={() => { setReplyingTo(null); setReplyText(""); setAiError(null); }}>{t.common.cancel}</GlassButton>
                        <InkButton size="sm" onClick={() => submit(r.id)} disabled={isPending || !replyText.trim()}>{isPending ? T.publishing : T.publish}</InkButton>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyingTo(r.id); setReplyText(r.replyText ?? ""); setAiError(null); setTone(r.rating <= 3 ? "professional" : "friendly"); }} className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                      {r.replyText ? T.edit : `${T.reply} →`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
