"use client";

import Link from "next/link";
import type { PlanLimitInfo } from "@/lib/entitlements";

// Blocking upgrade dialog shown when a plan limit is hit server-side. Honest:
// it never pretends the upgrade succeeded — the CTA leads to the billing route
// (Prompt 3 wires the actual Stripe upgrade there).
export function PlanLimitDialog({ info, onClose }: { info: PlanLimitInfo; onClose: () => void }) {
  const title = info.resource === "employee" ? "Osiągnięto limit specjalistów" : "Osiągnięto limit lokalizacji";
  const word = info.resource === "employee" ? "aktywnych specjalistów" : "aktywnych lokalizacji";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-limit-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(203,213,225,0.5)",
          boxShadow: "0 20px 48px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.98)",
        }}
      >
        <h2 id="plan-limit-title" className="text-lg font-bold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
          {title}
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Twój plan <span className="font-semibold text-slate-900">{info.planLabel}</span> pozwala na{" "}
          <span className="font-semibold text-slate-900 tabular-nums">{info.limit}</span> {word}. Obecnie
          wykorzystano <span className="font-semibold text-slate-900 tabular-nums">{info.used}</span>.
        </p>
        {info.requiredPlanLabel && (
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Aby dodać kolejn{info.resource === "employee" ? "ego specjalistę" : "ą lokalizację"}, przejdź na plan{" "}
            <span className="font-semibold text-slate-900">{info.requiredPlanLabel}</span>.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <Link
            href="/business/payments?upgrade=1"
            className="btn-spring flex-1 text-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)", border: "1px solid #0F172A" }}
          >
            Przejdź na wyższy plan
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
