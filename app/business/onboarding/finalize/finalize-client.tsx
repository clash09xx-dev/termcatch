"use client";

import { useEffect, useState } from "react";
import { pollSubscriptionReady } from "@/lib/actions/subscription";

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

// Polls the server for webhook-confirmed subscription state, then redirects to
// the dashboard. Shows an honest "taking longer than usual" note if the webhook
// is slow (the owner can proceed — the plan activates as soon as it arrives).
export function FinalizeClient() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let active = true;
    let attempts = 0;

    async function tick() {
      attempts += 1;
      try {
        const { ready } = await pollSubscriptionReady();
        if (!active) return;
        if (ready) {
          window.location.assign("/business/dashboard");
          return;
        }
      } catch {
        /* transient — keep polling */
      }
      if (!active) return;
      if (attempts >= 8) setSlow(true); // ~16s
      if (attempts < 30) {
        window.setTimeout(tick, 2000);
      } else {
        setSlow(true);
      }
    }

    tick();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BG }}>
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}>
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: "#334155" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ letterSpacing: "var(--track-title)", color: "#0F172A" }}>
          Finalizujemy konfigurację…
        </h1>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Potwierdzamy Twoją subskrypcję u operatora płatności. To potrwa chwilę — nie zamykaj tej strony.
        </p>
        {slow && (
          <p className="text-xs mt-5" style={{ color: "#94A3B8" }}>
            Trwa to dłużej niż zwykle. Możesz{" "}
            <a href="/business/dashboard" className="underline font-medium" style={{ color: "#475569" }}>
              przejść do panelu
            </a>{" "}
            — plan aktywuje się automatycznie, gdy tylko potwierdzenie dotrze.
          </p>
        )}
      </div>
    </div>
  );
}
