"use client";

import { useState, useTransition } from "react";
import { openBillingPortal } from "@/lib/actions/subscription";

// Opens the Stripe Customer Portal. The server derives the Stripe Customer from
// the authenticated business — the browser never supplies a customer id.
export function BillingManageButton({ label, opening, unconfigured }: { label: string; opening: string; unconfigured: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            const res = await openBillingPortal();
            if (res?.error === "unconfigured") setError(unconfigured);
            else if (res?.error) setError(res.error);
          })
        }
        className="btn-spring px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
        style={{ background: "var(--ink-raised)", color: "#F8FAFC", border: "1px solid #0F172A" }}
      >
        {pending ? opening : label}
      </button>
      {error && <p role="alert" className="text-xs mt-2" style={{ color: "#BE123C" }}>{error}</p>}
    </div>
  );
}
