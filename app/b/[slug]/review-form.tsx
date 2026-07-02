"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createReview } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  appointmentId: string;
  businessName: string;
  serviceName: string;
}

export default function ReviewForm({
  appointmentId,
  businessName,
  serviceName,
}: ReviewFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const close = () => router.replace(pathname, { scroll: false });

  const submit = () => {
    if (rating < 1) {
      setError("Wybierz ocenę w skali 1-5.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await createReview({ appointmentId, rating, comment: comment || undefined });
        setDone(true);
      } catch (err) {
        const e = err as { message?: string };
        setError(e.message ?? "Wystąpił błąd. Spróbuj ponownie.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Dziękujemy za opinię!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Twoja ocena pomaga innym wybrać najlepszy salon.
            </p>
            <button
              type="button"
              onClick={close}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">Oceń wizytę</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Zamknij"
                className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {serviceName} — {businessName}
            </p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hover || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`Ocena ${star}`}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <svg
                      className={cn("w-9 h-9 transition-colors", active ? "text-amber-400" : "text-gray-200")}
                      viewBox="0 0 24 24"
                      fill={active ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={active ? 0 : 1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Opisz swoje wrażenia — opcjonalnie"
              rows={4}
              maxLength={1000}
              className="w-full px-3.5 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder-gray-400 text-gray-800 resize-none mb-4"
            />

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {isPending ? "Wysyłanie..." : "Wyślij opinię"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
