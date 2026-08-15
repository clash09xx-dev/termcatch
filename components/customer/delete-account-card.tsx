"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, DangerButton } from "@/components/ui/glass";
import { GlassModal, ModalGlassButton } from "@/components/ui/glass-modal";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { notify, errorText } from "@/lib/notify";
import { DANGER_BTN, DANGER_TINT } from "@/components/ui/glass/tokens";
import { deleteMyAccount } from "@/lib/actions/account";

/**
 * Account deletion.
 *
 * Two gates, because this is irreversible and there is no undo to fall back on:
 *   1. a dialog that states the consequences in full, including what is kept
 *      and why (the salon's accounting records)
 *   2. typing the confirmation word, so the destructive button cannot be
 *      reached by a stray click or a double-tap on the card
 *
 * The word itself is localized — a Polish user types "USUŃ", not "DELETE" —
 * because a confirmation you cannot read is a confirmation you click blindly.
 */
export function DeleteAccountCard() {
  const t = useT();
  const T = t.pages.settings.accountDeletion;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [isPending, start] = useTransition();

  const confirmed = typed.trim().toUpperCase() === T.word.toUpperCase();

  function close(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) { setTyped(""); setError(""); }
  }

  function confirm() {
    if (!confirmed) return;
    setError("");
    start(async () => {
      try {
        const res = await deleteMyAccount();
        if (res.ok) {
          // The session is gone server-side; a hard navigation is the honest
          // way to drop every cached client view of a now-deleted account.
          window.location.href = "/";
        } else {
          setError(res.error);
        }
      } catch (e) {
        setError(errorText(e, T.failed));
      }
    });
  }

  return (
    <>
      <GlassCard className="fade-rise p-6">
        <h3 className="text-[15px] font-semibold text-slate-900 track-heading">{T.title}</h3>
        <p className="text-[13px] leading-[1.55] text-secondary mt-1.5 max-w-[62ch]">{T.body}</p>
        <div className="mt-5">
          <DangerButton onClick={() => setOpen(true)}>{T.cta}</DangerButton>
        </div>
      </GlassCard>

      <GlassModal open={open} onOpenChange={close} title={T.confirmTitle}>
        <div className="rounded-xl px-4 py-3 mb-5" style={DANGER_TINT}>
          <p className="text-[13px] leading-[1.6]">{T.confirmBody}</p>
        </div>

        <label htmlFor="delete-confirm" className="block text-[13px] font-medium text-slate-700 mb-1.5">
          {interpolate(T.typeToConfirm, { word: T.word })}
        </label>
        <input
          id="delete-confirm"
          value={typed}
          onChange={(e) => { setTyped(e.target.value); setError(""); }}
          autoComplete="off"
          spellCheck={false}
          className="input-glass w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl outline-none uppercase tracking-[0.1em] text-slate-800"
        />

        {error && (
          <p role="alert" className="mt-3 text-[12.5px] font-medium" style={{ color: "#BE123C" }}>
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
          <button
            type="button"
            onClick={confirm}
            disabled={!confirmed || isPending}
            className="btn-spring flex-1 rounded-[10px] px-4 py-[9px] min-h-[44px] text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed"
            style={DANGER_BTN}
          >
            {isPending ? T.deleting : T.confirmCta}
          </button>
          <ModalGlassButton onClick={() => close(false)}>{t.common.cancel}</ModalGlassButton>
        </div>
      </GlassModal>
    </>
  );
}
