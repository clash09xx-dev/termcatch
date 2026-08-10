"use client";

// Root error boundary. Catches uncaught render/server-action errors (e.g. a
// too-late cancel or a lost-race confirm submitted via a bare <form action>),
// showing a friendly Polish page + retry instead of Next's default error screen.

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Safe diagnostic only — no user data.
    console.error("[app:error]", error?.digest ?? error?.message ?? "unknown");
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
          Coś poszło nie tak
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#64748B", margin: "0 0 20px" }}>
          Nie udało się wykonać tej operacji. Spróbuj ponownie — jeśli problem się powtarza,
          napisz na <strong>hello@termcatch.com</strong>.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: "#F8FAFC",
            background: "linear-gradient(180deg,#1E293B,#0F172A)",
            border: "1px solid #0F172A",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  );
}
