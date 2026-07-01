"use client";

import { useState, useTransition } from "react";
import { replyToReview } from "@/lib/actions/reviews";

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

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sizes = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizes} ${
            star <= rating ? "text-warning-500" : "text-gray-200"
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
            clipRule="evenodd"
          />
        </svg>
      ))}
    </div>
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
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Opinie</h1>
        <p className="text-sm text-gray-700 mt-0.5">
          Zarządzaj opiniami swoich klientów
        </p>
      </div>

      {/* Stats */}
      {totalCount > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-start gap-8">
            {/* Average */}
            <div className="text-center flex-shrink-0">
              <p className="text-5xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
              <Stars rating={Math.round(avgRating)} size="md" />
              <p className="text-xs text-gray-700 mt-1">{totalCount} opinii</p>
            </div>

            {/* Distribution */}
            <div className="flex-1 space-y-2">
              {starDistribution.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12 flex-shrink-0">
                    <span className="text-xs text-gray-700">{star}</span>
                    <svg className="w-3 h-3 text-warning-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-warning-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <StarIcon className="w-6 h-6 text-gray-700" />
          </div>
          <p className="text-sm font-medium text-gray-900">Brak opinii</p>
          <p className="text-sm text-gray-700 mt-1 max-w-sm">
            Opinie pojawią się po zakończonych wizytach.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-gray-100 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {review.customerName}
                    </p>
                    <Stars rating={review.rating} />
                  </div>
                  <p className="text-xs text-gray-700">
                    {new Date(review.createdAt).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {review.comment && (
                <p className="text-sm text-gray-900 mt-3 leading-relaxed">{review.comment}</p>
              )}

              {/* Reply */}
              {review.replyText && replyingTo !== review.id && (
                <div className="mt-4 pl-4 border-l-2 border-gray-200">
                  <p className="text-xs font-semibold text-gray-900 mb-1">Odpowiedź salonu</p>
                  <p className="text-sm text-gray-900">{review.replyText}</p>
                  {review.repliedAt && (
                    <p className="text-xs text-gray-700 mt-1">
                      {new Date(review.repliedAt).toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === review.id ? (
                <div className="mt-4 space-y-2">
                  <textarea
                    autoFocus
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Napisz odpowiedź na opinię..."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      className="text-sm px-3 py-2 border border-gray-200 text-gray-900 hover:bg-gray-50 rounded-xl transition-colors font-medium"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={() => handleReply(review.id)}
                      disabled={isPending || !replyText.trim()}
                      className="text-sm px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors font-medium disabled:opacity-60"
                    >
                      {isPending ? "Wysyłanie..." : "Wyślij odpowiedź"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startReply(review.id, review.replyText)}
                  className="mt-3 text-xs font-medium text-gray-900 hover:text-gray-800 transition-colors"
                >
                  {review.replyText ? "Edytuj odpowiedź" : "Odpowiedz"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
    </svg>
  );
}
