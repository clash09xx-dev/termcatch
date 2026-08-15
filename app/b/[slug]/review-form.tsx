"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createReview } from "@/lib/actions/reviews";
import { cn } from "@/lib/utils";
import { GlassModal, ModalInkButton } from "@/components/ui/glass-modal";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { DANGER_TINT, SUCCESS_TINT } from "@/components/ui/glass/tokens";

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
  const t = useT();
  const T = t.salonProfile.review;
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const close = () => router.replace(pathname, { scroll: false });

  const submit = () => {
    if (rating < 1) {
      setError(T.pickRating);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await createReview({ appointmentId, rating, comment: comment || undefined });
        setDone(true);
      } catch (err) {
        const e = err as { message?: string };
        setError(e.message ?? T.genericError);
      }
    });
  };

  // This was a hand-rolled overlay: no focus trap, no Escape, no scroll lock,
  // no focus restore, no exit animation, and a bouncing success mark that
  // grew from scale(0.4). It is now the same GlassModal every other overlay in
  // the product uses, so all of that comes for free and stays consistent.
  return (
    <GlassModal
      open
      onOpenChange={(o) => { if (!o) close(); }}
      title={done ? T.thanks : T.rate}
      description={done ? undefined : `${serviceName} · ${businessName}`}
    >
      {done ? (
        <div className="text-center pt-1">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={SUCCESS_TINT}
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 12.5 3 3 6-7" />
            </svg>
          </div>
          <p className="text-[13.5px] leading-[1.55] text-secondary mb-6">
            {T.thanksBody}
          </p>
          <ModalInkButton onClick={close}>{t.common.close}</ModalInkButton>
        </div>
      ) : (
        <>
          {/* Stars — 44px targets, and the fill is the feedback, not a bounce. */}
          <div className="flex items-center justify-center gap-1 mb-5" role="group" aria-label={T.ratingGroup}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hover || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onPointerEnter={() => setHover(star)}
                  onPointerLeave={() => setHover(0)}
                  aria-label={interpolate(T.starLabel, { n: star })}
                  aria-pressed={rating >= star}
                  className="btn-spring w-11 h-11 flex items-center justify-center rounded-xl"
                >
                  <svg
                    className={cn("w-8 h-8 transition-colors duration-fast", active ? "text-amber-400" : "text-slate-300")}
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

          <label htmlFor="review-comment" className="sr-only">{T.commentLabel}</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={T.commentPlaceholder}
            rows={4}
            maxLength={1000}
            className="input-glass w-full px-3.5 py-3 text-sm rounded-xl outline-none placeholder:text-slate-400 text-slate-800 resize-none mb-4"
          />

          {error && (
            <div role="alert" className="mb-4 px-4 py-3 rounded-xl" style={DANGER_TINT}>
              <p className="text-[13px] font-medium">{error}</p>
            </div>
          )}

          <ModalInkButton onClick={submit} disabled={isPending}>
            {isPending ? T.submitting : T.submit}
          </ModalInkButton>
        </>
      )}
    </GlassModal>
  );
}
