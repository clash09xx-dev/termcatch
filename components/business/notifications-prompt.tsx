"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CHIP, INK_BTN } from "@/components/ui/glass/tokens";

const STORAGE_KEY = "tc-notif-prompt-dismissed";

/**
 * Quiet inline banner (previously a modal ambush): invite the salon to
 * configure SMS/WhatsApp notifications. Shows only until configured
 * or dismissed.
 */
export type NotifPromptLabels = { title: string; body: string; cta: string; later: string; aria: string; dismiss: string };

export function NotificationsPrompt({ configured, labels }: { configured: boolean; labels: NotifPromptLabels }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (configured) return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, [configured]);

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fade-rise rounded-[20px] px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hairline)",
        boxShadow: "var(--e2)",
      }}
      role="region"
      aria-label={labels.aria}
    >
      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0" style={CHIP}>
        <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900" style={{ letterSpacing: "var(--track-heading)" }}>
          {labels.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          {labels.body}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/business/settings"
          onClick={dismiss}
          className="btn-spring px-4 py-2 rounded-xl text-xs font-semibold"
          style={INK_BTN}
        >
          {labels.cta}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          aria-label={labels.dismiss}
        >
          {labels.later}
        </button>
      </div>
    </div>
  );
}
