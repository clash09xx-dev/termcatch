"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { createReview } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  appointmentId: string;
  businessName: string;
  serviceName: string;
}

const INK = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

const PANEL: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.50)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.40), 0 8px 32px rgba(15,23,42,0.14), 0 32px 80px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.98)",
};

export default function ReviewForm({
  appointmentId,
  businessName,
  serviceName,
}: ReviewFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.30)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 380, damping: 30 }}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6"
        style={PANEL}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 320, damping: 18 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: "rgba(16,185,129,0.10)",
                border: "1px solid rgba(16,185,129,0.25)",
                boxShadow: "0 0 0 0.5px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.60)",
              }}
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 12.5 3 3 6-7" />
              </svg>
            </motion.div>
            <h2 id="review-modal-title" className="text-lg font-bold text-slate-900 mb-1" style={{ letterSpacing: "-0.02em" }}>
              Dziękujemy za opinię!
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Twoja ocena pomaga innym wybrać najlepszy salon.
            </p>
            <motion.button
              type="button"
              onClick={close}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.982 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{
                background: INK,
                border: "1px solid #0F172A",
                color: "#F8FAFC",
                boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              Zamknij
            </motion.button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-1">
              <h2 id="review-modal-title" className="text-lg font-bold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
                Oceń wizytę
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Zamknij"
                className="w-8 h-8 -mr-2 -mt-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                style={{ background: "transparent" }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              {serviceName} — {businessName}
            </p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 mb-5" role="group" aria-label="Ocena w skali 1-5">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hover || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`Ocena ${star} z 5`}
                    aria-pressed={rating >= star}
                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                  >
                    <svg
                      className={cn("w-9 h-9 transition-colors", active ? "text-amber-400" : "text-slate-300")}
                      viewBox="0 0 24 24"
                      fill={active ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth={active ? 0 : 1.5}
                      aria-hidden="true"
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
            <label htmlFor="review-comment" className="sr-only">Komentarz — opcjonalnie</label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Opisz swoje wrażenia — opcjonalnie"
              rows={4}
              maxLength={1000}
              className="input-glass w-full px-3.5 py-3 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800 resize-none mb-4 transition-shadow"
            />

            {error && (
              <div
                role="alert"
                className="mb-4 px-4 py-3 rounded-xl"
                style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}
              >
                <p className="text-sm font-medium" style={{ color: "#BE123C" }}>{error}</p>
              </div>
            )}

            <motion.button
              type="button"
              onClick={submit}
              disabled={isPending}
              whileHover={isPending ? undefined : { scale: 1.01, y: -1 }}
              whileTap={isPending ? undefined : { scale: 0.982 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-60"
              style={{
                background: INK,
                border: "1px solid #0F172A",
                color: "#F8FAFC",
                boxShadow: "0 1px 2px rgba(0,0,0,0.20), 0 10px 24px rgba(15,23,42,0.28), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              {isPending ? "Wysyłanie..." : "Wyślij opinię"}
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
