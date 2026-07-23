"use client";

import { useState } from "react";

// Copies the full canonical booking URL to the clipboard. The URL is passed in
// from the server (validated NEXT_PUBLIC_APP_URL) — the client never constructs it.
export function CopyLink({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable — the URL is still shown for manual copy */
        }
      }}
      aria-label="Kopiuj link do rezerwacji"
      className={
        className ??
        "btn-spring w-full px-3 py-2 rounded-xl text-sm font-semibold text-white"
      }
      style={{ background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)", border: "1px solid #0F172A" }}
    >
      {copied ? "Skopiowano ✓" : "Kopiuj link"}
    </button>
  );
}
