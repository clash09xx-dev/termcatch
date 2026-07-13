"use client";

import { useState, useMemo, useTransition } from "react";
import { replyToReview } from "@/lib/actions/reviews";
import {
  PageHeader, GlassCard, EmptyState, InkButton, GlassButton, ChromeAvatar, Overline,
  HAIRLINE, CHIP, INK_GRADIENT,
} from "@/components/ui/glass";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

type ReviewData = {
  id: string; rating: number; comment: string | null;
  replyText: string | null; repliedAt: string | null; createdAt: string; customerName: string;
};
type StarDist = { star: number; count: number; pct: number };
type Props = { reviews: ReviewData[]; avgRating: number; totalCount: number; starDistribution: StarDist[] };

const STAR = "M11.48 3.5a.56.56 0 0 1 1.04 0l2.12 5.11a.56.56 0 0 0 .48.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.38a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.6 0l-4.72 2.88a.56.56 0 0 1-.84-.61l1.28-5.38a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .48-.35Z";

function Stars({ rating, cls = "w-3.5 h-3.5" }: { rating: number; cls?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Ocena ${rating} na 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={cn(cls, s <= rating ? "text-amber-400" : "text-slate-300")} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={STAR} /></svg>
      ))}
    </span>
  );
}

export function ReviewsClient({ reviews: initial, avgRating, totalCount, starDistribution }: Props) {
  const [reviews, setReviews] = useState(initial);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();

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
    startTransition(async () => {
      await replyToReview(id, replyText.trim());
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, replyText: replyText.trim(), repliedAt: new Date().toISOString() } : r));
      setReplyingTo(null); setReplyText("");
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title="Opinie" subtitle="Odpowiadaj na opinie, buduj reputację" />

      {totalCount === 0 ? (
        <GlassCard className="fade-rise fade-rise-d1">
          <EmptyState
            icon={<svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={STAR} /></svg>}
            title="Brak opinii"
            body="Opinię wystawia klient po zakończonej wizycie — oznacz wizyty jako zakończone w kalendarzu, a prośba o ocenę wyśle się sama."
          />
        </GlassCard>
      ) : (
        <>
          {/* Reputation summary — rating + distribution + response ring */}
          <GlassCard className="fade-rise fade-rise-d1 p-5">
            <div className="grid sm:grid-cols-[auto_1fr_auto] gap-6 items-center">
              <div className="text-center">
                <p className="text-5xl font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.03em" }}>{avgRating.toFixed(1)}</p>
                <div className="mt-1.5 flex justify-center"><Stars rating={Math.round(avgRating)} cls="w-4 h-4" /></div>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">{totalCount} opinii</p>
              </div>
              <div className="space-y-1.5 min-w-0">
                {starDistribution.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2.5">
                    <span className="w-3 text-xs text-slate-500 tabular-nums text-right">{star}</span>
                    <svg className="w-3 h-3 text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d={STAR} /></svg>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(203,213,225,0.35)" }}>
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
                <p className="text-[10px] text-slate-500 text-center leading-tight">odpowiedzi</p>
              </div>
            </div>
          </GlassCard>

          {/* Filter */}
          <div className="fade-rise fade-rise-d2 flex items-center justify-between gap-3">
            <Segmented
              ariaLabel="Filtr opinii" idBase="rev-filter" size="sm" value={filter} onChange={(v) => setFilter(v as typeof filter)}
              options={[
                { value: "unanswered", label: "Bez odpowiedzi", count: unanswered },
                { value: "all", label: "Wszystkie", count: totalCount },
                { value: "low", label: "Niskie oceny", count: reviews.filter((r) => r.rating <= 3).length },
              ]}
            />
          </div>

          {/* Stream */}
          <div className="fade-rise fade-rise-d2 space-y-3">
            {list.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-800">{filter === "unanswered" ? "Wszystkie opinie mają odpowiedź 🎉" : "Brak opinii w tym filtrze"}</p>
              </GlassCard>
            ) : list.map((r) => {
              const needsReply = !r.replyText;
              const editing = replyingTo === r.id;
              return (
                <div key={r.id} className="rounded-[20px] p-5" style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(203,213,225,0.45)", borderLeft: needsReply ? "3px solid #0F172A" : "1px solid rgba(203,213,225,0.45)", boxShadow: "0 0 0 0.5px rgba(203,213,225,0.2), 0 4px 14px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)" }}>
                  <div className="flex items-start gap-3">
                    <ChromeAvatar initials={r.customerName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{r.customerName}</p>
                        <Stars rating={r.rating} />
                        {needsReply && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#0F172A" }}>WYMAGA ODPOWIEDZI</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{new Date(r.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                  </div>

                  {r.comment && <p className="text-sm text-slate-700 mt-3 leading-relaxed">{r.comment}</p>}

                  {r.replyText && !editing && (
                    <div className="mt-4 pl-4 py-2" style={{ borderLeft: "3px solid rgba(148,163,184,0.45)" }}>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Twoja odpowiedź</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{r.replyText}</p>
                    </div>
                  )}

                  {editing ? (
                    <div className="mt-4 space-y-2.5">
                      <textarea autoFocus rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Napisz odpowiedź…" aria-label="Odpowiedź na opinię" className="input-glass w-full rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 resize-none" />
                      <div className="flex gap-2">
                        <GlassButton size="sm" onClick={() => { setReplyingTo(null); setReplyText(""); }}>Anuluj</GlassButton>
                        <InkButton size="sm" onClick={() => submit(r.id)} disabled={isPending || !replyText.trim()}>{isPending ? "Wysyłanie…" : "Wyślij odpowiedź"}</InkButton>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyingTo(r.id); setReplyText(r.replyText ?? ""); }} className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                      {r.replyText ? "Edytuj odpowiedź" : "Odpowiedz →"}
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
