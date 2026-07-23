"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { startSubscriptionCheckout } from "@/lib/actions/subscription";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import type { PlanKey } from "@/lib/subscription";

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.22) 0%, transparent 55%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

export function PlanSelectClient({
  billingReady,
  preselect,
}: {
  billingReady: boolean;
  preselect: PlanKey | null;
}) {
  const [selected, setSelected] = useState<PlanKey | null>(preselect);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function choosePlan(key: PlanKey) {
    setSelected(key);
    if (!billingReady) return; // pending state — no Stripe call, user continues to dashboard
    start(async () => {
      setError("");
      const res = await startSubscriptionCheckout(key);
      // On success the action redirects to Stripe; only errors return here.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="min-h-screen px-6 py-14" style={{ background: BG }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#64748B" }}>
            Ostatni krok
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: "-0.03em", color: "#0F172A" }}>
            Wybierz plan dla swojego salonu
          </h1>
          <p className="text-sm" style={{ color: "#64748B" }}>
            7 dni za darmo, bez karty na start. Plan zmienisz w każdej chwili.
          </p>
        </div>

        {!billingReady && (
          <div
            className="max-w-2xl mx-auto mb-6 px-5 py-3.5 rounded-2xl text-sm"
            style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(148,163,184,0.40)", color: "#475569" }}
          >
            Płatności online uruchomimy wkrótce. Wybierz plan orientacyjnie i przejdź do panelu —
            skonfigurujesz subskrypcję, gdy będzie gotowa. Twój salon działa już w pełni.
          </div>
        )}

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-8">
          {PLAN_CATALOG.map((plan) => {
            const active = selected === plan.key;
            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => choosePlan(plan.key)}
                disabled={pending}
                aria-pressed={active}
                className="text-left p-5 rounded-2xl transition-all btn-spring disabled:opacity-60"
                style={{
                  background: active ? "rgba(241,246,251,0.95)" : "rgba(255,255,255,0.72)",
                  border: active ? "1.5px solid #0F172A" : "1px solid rgba(203,213,225,0.55)",
                  boxShadow: active
                    ? "0 8px 28px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,1)"
                    : "0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.90)",
                }}
              >
                {plan.highlight && (
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mb-2" style={{ background: "rgba(148,163,184,0.20)", color: "#475569" }}>
                    Najczęściej wybierany
                  </span>
                )}
                <h2 className="text-base font-bold" style={{ color: "#0F172A" }}>{plan.name}</h2>
                <div className="flex items-baseline gap-1 mt-1 mb-2">
                  <span className="text-2xl font-bold" style={{ color: "#0F172A", letterSpacing: "-0.03em" }}>{plan.price}</span>
                  <span className="text-xs" style={{ color: "#94A3B8" }}>/ {plan.period}</span>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "#64748B" }}>{plan.tagline}</p>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "#475569" }}>
                      <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {active && billingReady && (
                  <span className="block mt-3 text-center py-2 rounded-xl text-sm font-semibold" style={{ background: "linear-gradient(180deg,#1E293B,#0F172A)", color: "#F8FAFC" }}>
                    {pending ? "Przekierowanie…" : "Rozpocznij 7 dni za darmo"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-sm text-center mb-4" style={{ color: "#BE123C" }}>{error}</p>
        )}

        <div className="flex flex-col items-center gap-3">
          {billingReady ? (
            <>
              <button
                type="button"
                disabled={!selected || pending}
                onClick={() => selected && choosePlan(selected)}
                className="px-8 py-3 rounded-xl text-sm font-semibold btn-spring disabled:opacity-50"
                style={{ background: "linear-gradient(180deg,#1E293B,#0F172A)", color: "#F8FAFC", border: "1px solid #0F172A" }}
              >
                {pending ? "Przekierowanie do płatności…" : "Kontynuuj z wybranym planem"}
              </button>
              <a href="/business/dashboard" className="text-sm font-medium" style={{ color: "#64748B" }}>
                Pomiń teraz — wybiorę plan później
              </a>
            </>
          ) : (
            <a
              href="/business/dashboard"
              className="px-8 py-3 rounded-xl text-sm font-semibold btn-spring"
              style={{ background: "linear-gradient(180deg,#1E293B,#0F172A)", color: "#F8FAFC", border: "1px solid #0F172A" }}
            >
              Przejdź do panelu →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
