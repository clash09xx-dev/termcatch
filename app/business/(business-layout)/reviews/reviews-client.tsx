"use client";

import { useState, useTransition } from "react";
import { replyToReview } from "@/lib/actions/reviews";
import {
  PageHeader,
  GlassCard,
  EmptyState,
  InkButton,
  GlassButton,
  ChromeAvatar,
  INK_GRADIENT,
} from "@/components/ui/glass";

type ReviewData = {
  id: string;
  rating: number;
  comment: string | null;
  replyText: string | null;
  repliedAt: string | null;
  createdAt: string;
  customerName: string;
};

type StarDist = { star: number; count: number; pct: number };

type Props = {
  reviews: ReviewData[];
  avgRating: number;
  totalCount: number;
  starDistribution: StarDist[];
};

const STAR_PATH =
  "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z";

// Five-star row filled to the rating — amber reserved for stars only
function Stars({ rating, sizeClass = "w-3.5 h-3.5" }: { rating: number; sizeClass?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Ocena ${rating} na 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClass} ${star <= rating ? "text-amber-400" : "text-slate-300"}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

export function ReviewsClient({ reviews: initialReviews, avgRating, totalCount, starDistribution }: Props) {
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isPending, startTransition] = useTransition();

  function startReply(reviewId: string, existing: string | null) {
    setReplyingTo(reviewId);
    setReplyText(existing ?? "");
  }

  function handleReply(reviewId: string) {
    if (!replyText.trim()) return;
    startTransition(async () => {
      await replyToReview(reviewId, replyText.trim());
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, replyText: replyText.trim(), repliedAt: new Date().toISOString() }
            : r
        )
      );
      setReplyingTo(null);
      setReplyText("");
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title="Opinie" subtitle="Zarządzaj opiniami swoich klientów" />

      {/* Summary + distribution */}
      {totalCount > 0 && (
        <GlassCard className="fade-rise fade-rise-d1 p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
            <div className="text-center flex-shrink-0">
              <p className="text-5xl font-bold text-slate-900 tabular-nums" style={{ letterSpacing: "-0.03em" }}>
                {avgRating.toFixed(1)}
              </p>
              <div className="mt-2 flex justify-center">
                <Stars rating={Math.round(avgRating)} sizeClass="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 tabular-nums">{totalCount} opinii</p>
            </div>

            <div className="flex-1 w-full space-y-2">
              {starDistribution.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-10 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-500 tabular-nums">{star}</span>
                    <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={STAR_PATH} />
                    </svg>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(203,213,225,0.35)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: INK_GRADIENT }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-6 text-right tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <GlassCard className="fade-rise fade-rise-d2">
          <EmptyState
            icon={
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
              </svg>
            }
            title="Brak opinii"
            body="Opinie mogą wystawiać klienci po zakończonej wizycie — oznacz wizyty jako zakończone w kalendarzu, a prośba o ocenę wyśle się sama."
          />
        </GlassCard>
      ) : (
        <div className="fade-rise fade-rise-d2 space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-[20px] p-5"
              style={{
                background: "rgba(255,255,255,0.80)",
                border: "1px solid rgba(203,213,225,0.45)",
                boxShadow: "0 0 0 0.5px rgba(203,213,225,0.22), 0 1px 2px rgba(0,0,0,0.02), 0 4px 14px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
              }}
            >
              <div className="flex items-start gap-3">
                <ChromeAvatar
                  initials={review.customerName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{review.customerName}</p>
                    <Stars rating={review.rating} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                    {new Date(review.createdAt).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {review.comment && (
                <p className="text-sm text-slate-700 mt-3 leading-relaxed">{review.comment}</p>
              )}

              {/* Existing reply */}
              {review.replyText && replyingTo !== review.id && (
                <div
                  className="mt-4 pl-4 py-2"
                  style={{ borderLeft: "3px solid rgba(148,163,184,0.45)" }}
                >
                  <p className="text-xs font-semibold text-slate-700 mb-1">Odpowiedź salonu</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{review.replyText}</p>
                  {review.repliedAt && (
                    <p className="text-xs text-slate-400 mt-1 tabular-nums">
                      {new Date(review.repliedAt).toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Reply editor */}
              {replyingTo === review.id ? (
                <div className="mt-4 space-y-2.5">
                  <textarea
                    autoFocus
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Napisz odpowiedź na opinię…"
                    aria-label="Odpowiedź na opinię"
                    className="input-glass w-full rounded-xl px-3.5 py-2.5 text-sm outline-none text-slate-800 placeholder:text-slate-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <GlassButton
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                    >
                      Anuluj
                    </GlassButton>
                    <InkButton
                      size="sm"
                      onClick={() => handleReply(review.id)}
                      disabled={isPending || !replyText.trim()}
                    >
                      {isPending ? "Wysyłanie…" : "Wyślij odpowiedź"}
                    </InkButton>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startReply(review.id, review.replyText)}
                  className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {review.replyText ? "Edytuj odpowiedź" : "Odpowiedz →"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
