"use client";

import { useState, useTransition } from "react";
import { startSubscriptionCheckout } from "@/lib/actions/subscription";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const PLAN_KEYS = ["SOLO", "TEAM", "PRO", "ULTIMATE"] as const;

// Starts a 7-day-trial subscription Checkout for the chosen plan. On success the
// server action redirects to Stripe; on failure it returns an honest message.
export function SubscribeButtons({ plans, note }: { plans: Dictionary["plans"]; note: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PLAN_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError("");
                const res = await startSubscriptionCheckout(key);
                if (res?.error) setError(res.error);
              })
            }
            className="btn-spring px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 disabled:opacity-50"
            style={{ background: "var(--surface)", border: "1px solid var(--hairline)" }}
          >
            {plans[key]}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">{note}</p>
      {error && (
        <p role="alert" className="text-xs mt-2" style={{ color: "#BE123C" }}>
          {error}
        </p>
      )}
    </div>
  );
}
