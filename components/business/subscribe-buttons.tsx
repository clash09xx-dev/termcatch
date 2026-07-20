"use client";

import { useState, useTransition } from "react";
import { startSubscriptionCheckout } from "@/lib/actions/subscription";

const PLANS: { key: string; label: string }[] = [
  { key: "SOLO", label: "Solo" },
  { key: "TEAM", label: "Zespół" },
  { key: "PRO", label: "Salon Pro" },
  { key: "ULTIMATE", label: "Ultimate" },
];

// Starts a 7-day-trial subscription Checkout for the chosen plan. On success the
// server action redirects to Stripe; on failure it returns an honest message.
export function SubscribeButtons() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PLANS.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError("");
                const res = await startSubscriptionCheckout(p.key);
                if (res?.error) setError(res.error);
              })
            }
            className="btn-spring px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(203,213,225,0.55)" }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">7 dni za darmo, potem miesięczny abonament.</p>
      {error && (
        <p role="alert" className="text-xs mt-2" style={{ color: "#BE123C" }}>
          {error}
        </p>
      )}
    </div>
  );
}
