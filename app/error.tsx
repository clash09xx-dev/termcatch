"use client";

// Root error boundary. Catches uncaught render/server-action errors, showing a
// friendly localized page + a short REFERENCE ID (the Next.js `digest`) so a
// production failure can be correlated with the real, un-redacted error in the
// server logs — the client never sees the technical message (Next redacts it).
// Self-contained: the root layout (and the i18n provider) is NOT applied to the
// root error boundary, so copy is inlined and the locale is read from the cookie.

import { useEffect } from "react";

type Copy = { title: string; body: string; retry: string; home: string; ref: string };

const DICT: Record<string, Copy> = {
  pl: {
    title: "Coś poszło nie tak",
    body: "Nie udało się wykonać tej operacji. Spróbuj ponownie — jeśli problem się powtarza, napisz na hello@termcatch.com i podaj numer referencyjny.",
    retry: "Spróbuj ponownie",
    home: "Wróć do panelu",
    ref: "Numer referencyjny",
  },
  en: {
    title: "Something went wrong",
    body: "We couldn't complete this operation. Please try again — if it keeps happening, email hello@termcatch.com with the reference number.",
    retry: "Try again",
    home: "Back to dashboard",
    ref: "Reference",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    body: "Dieser Vorgang konnte nicht abgeschlossen werden. Bitte erneut versuchen — falls es weiter auftritt, schreiben Sie an hello@termcatch.com mit der Referenznummer.",
    retry: "Erneut versuchen",
    home: "Zurück zum Dashboard",
    ref: "Referenz",
  },
  tr: {
    title: "Bir şeyler ters gitti",
    body: "Bu işlem tamamlanamadı. Lütfen tekrar deneyin — sorun devam ederse referans numarasıyla hello@termcatch.com adresine yazın.",
    retry: "Tekrar dene",
    home: "Panele dön",
    ref: "Referans",
  },
};

function readLocale(): keyof typeof DICT {
  if (typeof document === "undefined") return "pl";
  const m = document.cookie.match(/(?:^|;\s*)tc-locale=([^;]+)/);
  const v = m?.[1];
  return v && v in DICT ? (v as keyof typeof DICT) : "pl";
}

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The reference is the Next.js digest (matches the server-side log line) or a
  // short client-generated id when there is no digest.
  const ref = error?.digest ?? Math.random().toString(36).slice(2, 8).toUpperCase();

  useEffect(() => {
    // Safe diagnostic only — digest correlates with the full server-side error.
    console.error(`[app:error] ref=${ref}`);
  }, [ref]);

  const t = DICT[readLocale()];

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
      }}
    >
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>{t.title}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#64748B", margin: "0 0 8px" }}>{t.body}</p>
        <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 20px", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}>
          {t.ref}: {ref}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "#F8FAFC",
              background: "linear-gradient(180deg,#1E293B,#0F172A)", border: "1px solid #0F172A",
              borderRadius: 12, cursor: "pointer",
            }}
          >
            {t.retry}
          </button>
          <a
            href="/"
            style={{
              padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "#334155",
              background: "rgba(148,163,184,0.14)", border: "1px solid rgba(203,213,225,0.55)",
              borderRadius: 12, textDecoration: "none", display: "inline-flex", alignItems: "center",
            }}
          >
            {t.home}
          </a>
        </div>
      </div>
    </div>
  );
}
