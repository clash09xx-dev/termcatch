"use client";

import { useState, useTransition } from "react";
import { GlassModal, ModalGlassButton, ModalInkButton } from "@/components/ui/glass-modal";
import { useT } from "@/components/i18n/i18n-provider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { CHIP, SUCCESS_TINT, WARN_TINT } from "@/components/ui/glass/tokens";
import { testCalendarSync } from "@/lib/actions/calendar-sync";

/**
 * The Booksy bridge wizard.
 *
 * WHAT THIS IS NOT: a Booksy integration. Booksy publishes no usable public API
 * (verified 2026-08-15 — the developer docs are not publicly reachable and
 * OAuth clients are issued only by arrangement), so there is nothing to connect
 * to and the product never claims otherwise.
 *
 * WHAT IT IS: instructions for pointing two systems at the same Google
 * Calendar, plus a real test of the half we control. Step 1 and step 4 do
 * something; steps 2 and 3 are guidance the user carries out elsewhere, and the
 * wizard is explicit about which is which.
 *
 * The limits panel is shown on the last step rather than hidden in a footnote,
 * because the most important thing a salon needs to know is that Booksy does
 * NOT push its own bookings out to Google.
 */

const BOOKSY_HELP_URL =
  "https://support.booksy.com/hc/en-us/articles/17499276381458-Can-I-import-my-external-calendar-to-Booksy";

const TOTAL_STEPS = 5;

export function BooksyWizard({
  open,
  onOpenChange,
  connected,
  connectHref,
  configured,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  connected: boolean;
  connectHref: string;
  /**
   * Google Calendar credentials exist on this server.
   *
   * The wizard's whole first step is "connect Google Calendar", so without this
   * it happily handed the user a live link into the not_configured bounce. The
   * guide itself stays available — the steps are still worth reading — only the
   * action that cannot succeed is withheld.
   */
  configured: boolean;
}) {
  const t = useT();
  const T = t.pages.calendarSync;
  const [step, setStep] = useState(1);
  const [testState, setTestState] = useState<null | { kind: "ok" | "empty" | "degraded"; n: number }>(null);
  const [isPending, start] = useTransition();

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) { setStep(1); setTestState(null); }
  }

  function runTest() {
    start(async () => {
      const res = await testCalendarSync();
      if (!res.ok) { setTestState({ kind: "degraded", n: 0 }); return; }
      if (res.degraded) { setTestState({ kind: "degraded", n: res.busyCount }); return; }
      setTestState(res.busyCount > 0 ? { kind: "ok", n: res.busyCount } : { kind: "empty", n: 0 });
    });
  }

  const titles = [T.step1Title, T.step2Title, T.step3Title, T.step4Title, T.step5Title];

  return (
    <GlassModal
      open={open}
      onOpenChange={close}
      title={T.wizardTitle}
      description={step === 1 ? T.wizardIntro : undefined}
      className="max-w-lg"
    >
      <p className="text-[11px] font-semibold uppercase track-overline text-slate-400 mb-3 tabular-nums">
        {interpolate(T.wizardStep, { n: step, total: TOTAL_STEPS })}
      </p>

      <h3 className="text-[16px] font-semibold text-slate-900 track-heading">{titles[step - 1]}</h3>

      {step === 1 && (
        <div className="mt-3">
          <p className="text-[13.5px] leading-[1.6] text-secondary">{T.step1Body}</p>
          <div className="mt-4">
            {connected ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold" style={SUCCESS_TINT}>
                {T.statusConnected}
              </span>
            ) : !configured ? (
              // Nothing to click: say why, in the user's language, instead of
              // sending them to a redirect that cannot work.
              <p className="text-[13px] leading-[1.55]" style={{ color: "#B45309" }}>
                {T.setupUnavailable}
              </p>
            ) : (
              <a
                href={connectHref}
                data-on-ink
                className="btn-spring inline-flex items-center px-5 py-2.5 min-h-[42px] text-sm font-semibold rounded-[10px]"
                style={{ background: "var(--ink-raised)", border: "1px solid #0F172A", color: "#F8FAFC" }}
              >
                {T.connect}
              </a>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-3">
          <p className="text-[13.5px] leading-[1.6] text-secondary">{T.step2Body}</p>
          {/* Booksy's own UI can change, so the wizard links to their live help
              page rather than pretending our screenshot of it is permanent. */}
          <a
            href={BOOKSY_HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-[13px] font-semibold text-slate-900 underline underline-offset-[3px] decoration-slate-300 hover:decoration-slate-900 transition-colors"
          >
            {T.step2Link}
          </a>
        </div>
      )}

      {step === 3 && <p className="mt-3 text-[13.5px] leading-[1.6] text-secondary">{T.step3Body}</p>}

      {step === 4 && (
        <div className="mt-3">
          <p className="text-[13.5px] leading-[1.6] text-secondary">{T.step4Body}</p>
          <div className="mt-4">
            <ModalGlassButton onClick={runTest} disabled={isPending || !connected}>
              {T.step4Cta}
            </ModalGlassButton>
          </div>
          {testState && (
            <p
              className="mt-3 text-[13px] leading-[1.55] px-3.5 py-2.5 rounded-xl"
              style={testState.kind === "ok" ? SUCCESS_TINT : WARN_TINT}
              role="status"
            >
              {testState.kind === "ok"
                ? interpolate(T.step4Ok, { n: testState.n })
                : testState.kind === "empty"
                  ? T.step4Empty
                  : T.step4Degraded}
            </p>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="mt-3">
          <p className="text-[13.5px] leading-[1.6] text-secondary">{T.step5Body}</p>

          {/* The honest part. Shown, not buried. */}
          <div className="mt-5 rounded-xl p-4" style={CHIP}>
            <p className="text-[12px] font-semibold uppercase track-overline text-slate-500">{T.limitsTitle}</p>
            <ul className="mt-2.5 space-y-2">
              {[T.limit1, T.limit2, T.limit3, T.limit4].map((line, i) => (
                <li key={i} className="text-[12.5px] leading-[1.6] text-secondary flex gap-2">
                  <span aria-hidden="true" className="text-slate-400 flex-shrink-0">·</span>
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] leading-[1.6] font-medium text-slate-700">{T.limitsNote}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
        {step < TOTAL_STEPS ? (
          <>
            <ModalInkButton onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}>
              {T.next}
            </ModalInkButton>
            {step > 1 && (
              <ModalGlassButton onClick={() => setStep((s) => Math.max(1, s - 1))}>{T.back}</ModalGlassButton>
            )}
          </>
        ) : (
          <ModalInkButton onClick={() => close(false)}>{T.finish}</ModalInkButton>
        )}
      </div>
    </GlassModal>
  );
}
