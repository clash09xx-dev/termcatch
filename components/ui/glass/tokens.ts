// ─── Machined Silver — the one design system ─────────────────────────────────
// Three elevations, one ink, glass-tinted status trio, two radii.
// Every business-panel surface imports from here; nothing hand-tunes shadows.

import type { CSSProperties } from "react";

// ── Elevations ────────────────────────────────────────────────

/** Page-level section wrapper — quiet, blurred */
export const ELEV_SURFACE: CSSProperties = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",
  border: "1px solid rgba(203,213,225,0.40)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.25), 0 1px 2px rgba(0,0,0,0.02), 0 4px 14px rgba(100,116,139,0.05), inset 0 1px 0 rgba(255,255,255,0.90)",
};

/** Default card — feature blocks, stat cards, panels */
export const ELEV_RAISED: CSSProperties = {
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(28px) saturate(200%)",
  WebkitBackdropFilter: "blur(28px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.45)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.30), 0 1px 2px rgba(0,0,0,0.03), 0 6px 20px rgba(100,116,139,0.08), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(203,213,225,0.08)",
};

/** Modals / popovers / sheets — most opaque, deepest shadow */
export const ELEV_OVERLAY: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(40px) saturate(200%)",
  WebkitBackdropFilter: "blur(40px) saturate(200%)",
  border: "1px solid rgba(203,213,225,0.50)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.40), 0 8px 32px rgba(15,23,42,0.14), 0 32px 80px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.98)",
};

/** List row — repeats many times, so NO backdrop blur (perf rule) */
export const ROW: CSSProperties = {
  background: "rgba(255,255,255,0.80)",
  border: "1px solid rgba(203,213,225,0.45)",
  boxShadow:
    "0 0 0 0.5px rgba(203,213,225,0.22), 0 1px 2px rgba(0,0,0,0.02), 0 4px 14px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.92)",
};

/** Quiet inset chip / meta container */
export const CHIP: CSSProperties = {
  background: "rgba(203,213,225,0.18)",
  border: "1px solid rgba(203,213,225,0.45)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.70)",
};

export const HAIRLINE = "1px solid rgba(203,213,225,0.30)";

// ── Ink — the one primary color ───────────────────────────────

export const INK_GRADIENT = "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)";

export const INK_BTN: CSSProperties = {
  background: INK_GRADIENT,
  border: "1px solid #0F172A",
  color: "#F8FAFC",
  boxShadow:
    "0 1px 2px rgba(0,0,0,0.20), 0 8px 20px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.15)",
};

export const GLASS_BTN: CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(203,213,225,0.55)",
  color: "#334155",
  boxShadow: "0 0 0 0.5px rgba(203,213,225,0.20), inset 0 1px 0 rgba(255,255,255,0.88)",
};

export const DANGER_BTN: CSSProperties = {
  background: "rgba(244,63,94,0.08)",
  border: "1px solid rgba(244,63,94,0.28)",
  color: "#BE123C",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.60)",
};

// ── Status trio — desaturated tints on glass ──────────────────

export type StatusKey =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED_CUSTOMER"
  | "CANCELLED_BUSINESS"
  | "NO_SHOW"
  | "RESCHEDULED";

export const STATUS_TINT: Record<StatusKey, { label: string; style: CSSProperties; rail: string }> = {
  PENDING: {
    label: "Oczekuje",
    rail: "#D97706",
    style: { background: "rgba(251,191,36,0.10)", border: "1px solid rgba(217,119,6,0.25)", color: "#B45309" },
  },
  CONFIRMED: {
    label: "Potwierdzona",
    rail: "#059669",
    style: { background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", color: "#047857" },
  },
  IN_PROGRESS: {
    label: "W trakcie",
    rail: "#475569",
    style: { background: "rgba(203,213,225,0.25)", border: "1px solid rgba(148,163,184,0.40)", color: "#334155" },
  },
  COMPLETED: {
    label: "Zakończona",
    rail: "#94A3B8",
    style: { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" },
  },
  CANCELLED_CUSTOMER: {
    label: "Odwołana",
    rail: "#E11D48",
    style: { background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.22)", color: "#BE123C" },
  },
  CANCELLED_BUSINESS: {
    label: "Odwołana",
    rail: "#E11D48",
    style: { background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.22)", color: "#BE123C" },
  },
  NO_SHOW: {
    label: "No-show",
    rail: "#E11D48",
    style: { background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.22)", color: "#BE123C" },
  },
  RESCHEDULED: {
    label: "Przełożona",
    rail: "#94A3B8",
    style: { background: "rgba(203,213,225,0.18)", border: "1px solid rgba(203,213,225,0.45)", color: "#64748B" },
  },
};

// ── Type scale (classes) ──────────────────────────────────────
// H1 20/semibold/-0.02  ·  section 15/semibold  ·  body 14  ·  caption 12
// overline 11/uppercase/+0.08em  ·  numbers always tabular

export const OVERLINE_CLS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
