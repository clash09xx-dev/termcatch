"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type ChecklistStep = { key: string; label: string; hint: string; done: boolean; href: string };

const DISMISS_KEY = "tc_onboarding_dismissed";
const COPIED_KEY = "tc_booking_link_copied";

/**
 * Guided onboarding checklist (Wave 7). The first four steps are DB-derived
 * (passed as `steps`); the fifth — copying the booking link — is a client
 * action tracked in localStorage. The whole card is dismissible and reopenable
 * (preference stored in localStorage), and hides itself once everything is done.
 */
export function OnboardingChecklist({ steps, bookingUrl }: { steps: ChecklistStep[]; bookingUrl: string }) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    setCopied(localStorage.getItem(COPIED_KEY) === "1");
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(bookingUrl);
    } catch {
      /* clipboard may be unavailable — still mark as acknowledged */
    }
    localStorage.setItem(COPIED_KEY, "1");
    setCopied(true);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }
  function reopen() {
    localStorage.removeItem(DISMISS_KEY);
    setDismissed(false);
  }

  const allSteps = [
    ...steps,
    { key: "copyLink", label: "Skopiuj link do rezerwacji", hint: "Udostępnij go klientom w social media i Google.", done: copied, href: "" },
  ];
  const doneCount = allSteps.filter((s) => s.done).length;
  const total = allSteps.length;

  // Avoid an SSR/CSR flash: render nothing until we've read localStorage.
  if (!mounted) return null;
  // Nothing left to guide.
  if (doneCount === total) return null;

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={reopen}
        className="btn-spring inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600"
        style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(203,213,225,0.55)" }}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
        Kroki konfiguracji ({doneCount}/{total})
      </button>
    );
  }

  return (
    <div
      className="fade-rise rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(203,213,225,0.55)", boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 6px 20px rgba(100,116,139,0.07), inset 0 1px 0 rgba(255,255,255,0.92)" }}
    >
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid rgba(203,213,225,0.35)" }}>
        <div className="relative w-9 h-9 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(203,213,225,0.4)" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15" fill="none" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(doneCount / total) * 94.2} 94.2`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-900 tabular-nums">{doneCount}/{total}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-slate-900">Skonfiguruj swój salon</p>
          <p className="text-xs text-slate-500">Dokończ te kroki, żeby klienci mogli rezerwować online.</p>
        </div>
        <button type="button" onClick={dismiss} className="text-xs font-medium text-slate-400 hover:text-slate-700 flex-shrink-0">Ukryj</button>
      </div>

      <div className="p-2.5 sm:p-3 grid sm:grid-cols-2 gap-1.5">
        {allSteps.map((s) => {
          const inner = (
            <>
              <span className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={s.done ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" } : { background: "rgba(255,255,255,0.7)", border: "1px solid rgba(148,163,184,0.5)" }}>
                {s.done && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" /></svg>}
              </span>
              <span className="min-w-0">
                <span className={s.done ? "block text-sm text-slate-400 line-through" : "block text-sm font-medium text-slate-800"}>{s.label}</span>
                {!s.done && <span className="block text-[11px] text-slate-400 truncate">{s.hint}</span>}
              </span>
              {!s.done && <svg className="w-3.5 h-3.5 text-slate-300 ml-auto flex-shrink-0 self-center" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m9 18 6-6-6-6" /></svg>}
            </>
          );
          const cls = "row-hover flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full";
          return s.key === "copyLink" ? (
            <button key={s.key} type="button" onClick={copyLink} className={cls}>{inner}</button>
          ) : (
            <Link key={s.key} href={s.href} className={cls}>{inner}</Link>
          );
        })}
      </div>
    </div>
  );
}
