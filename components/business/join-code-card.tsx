"use client";

import { useState, useTransition } from "react";
import { GlassCard, Overline, GlassButton, HAIRLINE, CHIP } from "@/components/ui/glass";
import { ConfirmDialog } from "@/components/ui/glass-modal";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { notify, errorText } from "@/lib/notify";
import { formatJoinCode } from "@/lib/employee/join-code";
import { regenerateJoinCode } from "@/lib/actions/join-code";

/**
 * The owner's view of the salon join code.
 *
 * Deliberately a quiet panel above the team grid rather than a modal: the code
 * is something an owner reads out or pastes into a message, so it should be on
 * screen where the team is, not two clicks away.
 *
 * Regeneration is destructive in the sense that matters here — anyone holding
 * the old code silently loses access — so it goes through the same
 * ConfirmDialog the rest of the product uses for irreversible actions, and the
 * body text says exactly what breaks.
 */
export function JoinCodeCard({ code: initialCode, salonName }: { code: string | null; salonName: string }) {
  const t = useT();
  const T = t.pages.staff;
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, start] = useTransition();

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      notify.saved(T.codeCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the code is on screen to copy by hand */
    }
  }

  function regenerate() {
    start(async () => {
      try {
        const res = await regenerateJoinCode();
        if (res.ok) {
          setCode(res.code);
          notify.saved(T.codeRegenerated);
        } else {
          notify.error(res.error);
        }
      } catch (e) {
        notify.error(errorText(e, t.errors.generic));
      } finally {
        setConfirmOpen(false);
      }
    });
  }

  return (
    <GlassCard className="p-5 fade-rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Overline>{T.codeTitle}</Overline>
          <p className="text-[13px] leading-[1.55] text-secondary mt-2 max-w-[62ch]">
            {interpolate(T.codeBody, { salon: salonName })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          aria-expanded={helpOpen}
          aria-label={T.codeHelp}
          className="icon-btn w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ color: "#94A3B8" }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-1 .8-1 1.4v.4" strokeLinecap="round" />
            <path d="M12 17h.01" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* What to actually SAY when handing the code over. The owner is the one
          explaining this to someone else, so the sentence they need is on
          screen rather than left to be improvised — and it must not promise
          instant joining, because the code no longer does that. */}
      <p className="text-[12.5px] leading-[1.6] text-muted-glass mt-3 max-w-[68ch]">{T.codeShareHint}</p>

      {helpOpen && (
        <p className="text-[12.5px] leading-[1.6] text-secondary mt-3 p-3 rounded-xl" style={CHIP} role="note">
          {T.codeHelpBody}
        </p>
      )}

      <div className="mt-4 pt-4 flex flex-wrap items-center gap-3" style={{ borderTop: HAIRLINE }}>
        <code
          className="text-[20px] font-semibold tabular-nums tracking-[0.14em] px-4 py-2.5 rounded-xl select-all"
          style={{ background: "var(--surface-inset)", border: "1px solid var(--hairline)", color: "#0F172A" }}
        >
          {code ? formatJoinCode(code) : "————————"}
        </code>
        <div className="flex items-center gap-2 ml-auto">
          <GlassButton size="sm" onClick={copy} disabled={!code}>
            {copied ? T.codeCopied : T.codeCopy}
          </GlassButton>
          <GlassButton size="sm" onClick={() => setConfirmOpen(true)} disabled={isPending}>
            {T.codeRegenerate}
          </GlassButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={T.codeRegenerateTitle}
        body={T.codeRegenerateBody}
        confirmLabel={T.codeRegenerate}
        cancelLabel={t.common.cancel}
        busy={isPending}
        onConfirm={regenerate}
      />
    </GlassCard>
  );
}
