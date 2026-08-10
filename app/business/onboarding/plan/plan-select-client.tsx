"use client";

import { useState, useTransition } from "react";
import { startSubscriptionCheckout, validateWelcomeCode, type WelcomePreview } from "@/lib/actions/subscription";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import { TRIAL_DAYS, WELCOME_FREE_MONTHS, type PlanKey } from "@/lib/subscription";

const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.55) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.22) 0%, transparent 55%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

const INK = { background: "linear-gradient(180deg,#1E293B,#0F172A)", color: "#F8FAFC", border: "1px solid #0F172A" };

function fmt(d: Date): string {
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

export function PlanSelectClient({
  billingReady,
  welcomeReady,
  preselect,
}: {
  billingReady: boolean;
  welcomeReady: boolean;
  preselect: PlanKey | null;
}) {
  const [selected, setSelected] = useState<PlanKey | null>(preselect);
  const [pending, start] = useTransition();
  const [validating, startValidate] = useTransition();
  const [error, setError] = useState("");
  const [alreadySub, setAlreadySub] = useState(false);
  const [code, setCode] = useState("");
  const [welcome, setWelcome] = useState<WelcomePreview | null>(null);

  const welcomeApplied = welcome?.status === "ok";

  // Exact end of the free period, shown before redirecting to Stripe.
  const freeUntil = welcomeApplied
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + WELCOME_FREE_MONTHS);
        return d;
      })()
    : new Date(Date.now() + TRIAL_DAYS * 86400000);
  const freeLabel = welcomeApplied
    ? `Pierwsze ${WELCOME_FREE_MONTHS} miesiące gratis — pierwsza płatność ${fmt(freeUntil)}.`
    : `${TRIAL_DAYS} dni za darmo — pierwsza płatność ${fmt(freeUntil)} (chyba że anulujesz wcześniej).`;

  function applyCode() {
    if (!code.trim()) return;
    startValidate(async () => {
      setError("");
      const res = await validateWelcomeCode(code);
      setWelcome(res);
    });
  }

  function checkout() {
    // A plan is mandatory. When billing isn't configured yet, still attempt so
    // the server returns "unconfigured" and we surface it — we never skip ahead.
    if (!selected) return;
    start(async () => {
      setError("");
      setAlreadySub(false);
      const res = await startSubscriptionCheckout(selected, welcomeApplied ? code : undefined);
      // Success → the action redirects to Stripe; only failures return here.
      if (res?.alreadySubscribed) {
        setAlreadySub(true);
        setError(res.error ?? "Masz już aktywną subskrypcję.");
      } else if (res?.error === "unconfigured") {
        setError("Płatności są jeszcze konfigurowane. Spróbuj ponownie później.");
      } else if (res?.error) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="min-h-screen px-6 py-14" style={{ background: BG }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#64748B" }}>Ostatni krok</p>
          <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: "-0.03em", color: "#0F172A" }}>
            Wybierz plan dla swojego salonu
          </h1>
          <p className="text-sm" style={{ color: "#64748B" }}>
            {TRIAL_DAYS} dni za darmo na start. Plan zmienisz w każdej chwili.
          </p>
        </div>

        {!billingReady && (
          <div className="max-w-2xl mx-auto mb-6 px-5 py-3.5 rounded-2xl text-sm" style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(148,163,184,0.40)", color: "#475569" }}>
            Płatności są w trakcie konfiguracji. Wybór planu jest wymagany — dokończ go, gdy tylko płatności będą gotowe.
          </div>
        )}

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-6">
          {PLAN_CATALOG.map((plan) => {
            const active = selected === plan.key;
            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelected(plan.key)}
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
                {active && (
                  <span className="block mt-3 text-center py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(15,23,42,0.08)", color: "#0F172A" }}>
                    Wybrany
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* WELCOME promo — validated server-side, non-consuming */}
        {billingReady && welcomeReady && (
          <div className="max-w-md mx-auto mb-6">
            <label htmlFor="promo" className="block text-xs font-medium mb-1.5" style={{ color: "#64748B" }}>
              Masz kod promocyjny?
            </label>
            <div className="flex gap-2">
              <input
                id="promo"
                value={code}
                onChange={(e) => { setCode(e.target.value); setWelcome(null); }}
                placeholder="np. WELCOME"
                className="flex-1 h-10 px-3.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(203,213,225,0.6)", color: "#0F172A" }}
              />
              <button
                type="button"
                onClick={applyCode}
                disabled={validating || !code.trim()}
                className="px-4 h-10 rounded-xl text-sm font-semibold btn-spring disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(203,213,225,0.6)", color: "#334155" }}
              >
                {validating ? "…" : "Zastosuj"}
              </button>
            </div>
            {welcome && (
              <p className="text-xs mt-1.5" style={{ color: welcome.status === "ok" ? "#047857" : "#B45309" }}>
                {welcome.message}
                {welcome.status === "ok" && welcome.slotsRemaining != null && welcome.slotsRemaining <= 20 && (
                  <> Pozostało miejsc: {welcome.slotsRemaining}.</>
                )}
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-center mb-3" style={{ color: "#BE123C" }}>
            {error}
            {alreadySub && (
              <> <a href="/business/payments" className="underline font-semibold">Zarządzaj subskrypcją →</a></>
            )}
          </p>
        )}

        <div className="flex flex-col items-center gap-3">
          {selected && billingReady && (
            <p className="text-xs text-center" style={{ color: "#64748B" }}>{freeLabel}</p>
          )}
          {/* Plan selection is mandatory — the only way forward is to choose a
              plan and continue to checkout. No "skip to dashboard" path. */}
          <button
            type="button"
            disabled={!selected || pending}
            onClick={checkout}
            className="px-8 py-3 rounded-xl text-sm font-semibold btn-spring disabled:opacity-50"
            style={INK}
          >
            {pending ? "Przekierowanie do płatności…" : "Kontynuuj do płatności"}
          </button>
          {!selected && (
            <p className="text-xs text-center" style={{ color: "#94A3B8" }}>
              Wybierz plan, aby kontynuować.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
