"use client";

import { useState } from "react";

// Copies the full canonical booking URL to the clipboard. The URL is passed in
// from the server (validated NEXT_PUBLIC_APP_URL) — the client never constructs it.
export function CopyLink({ url, className, labels }: {
  url: string;
  className?: string;
  /** Localized strings, resolved by the server page that renders this. */
  labels: { copy: string; copied: string; aria: string };
}) {
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
      aria-label={labels.aria}
      className={
        className ??
        "btn-spring w-full px-3 py-2 rounded-xl text-sm font-semibold text-white"
      }
      style={{ background: "var(--ink-raised)", border: "1px solid #0F172A" }}
    >
      {copied ? labels.copied : labels.copy}
    </button>
  );
}
