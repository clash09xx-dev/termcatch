// ─── Machined Silver — the one design system ─────────────────────────────────
//
// The governing rule: CHROME FLOATS, CONTENT IS SOLID.
//
//   Translucency is a material, not a finish. It belongs to surfaces that float
//   over moving content — navigation, topbars, sheets, modals, popovers,
//   floating controls — where the blur communicates "there is content beneath
//   this". It does not belong to content itself: a card, a row, a form field or
//   a table is the thing you are reading, and text on a blurred backdrop is
//   never as crisp. Stacking one translucent surface on another destroys
//   legibility outright, and every backdrop-filter costs a composited layer
//   that samples everything painted behind it.
//
//   So: ELEV_SURFACE / ELEV_RAISED / ROW / CHIP are opaque.
//   CHROME / CHROME_STRONG / ELEV_OVERLAY are translucent.
//
// Elevation comes from the four-step ladder in globals.css (--e1…--e4), so a
// shadow written in CSS and one written here are literally the same value.

import type { CSSProperties } from "react";

// ── Content surfaces — opaque ─────────────────────────────────

/** Page-level section wrapper. Quiet: hairline, barely any shadow. */
export const ELEV_SURFACE: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e1)",
};

/** The default card: feature blocks, stat cards, panels. */
export const ELEV_RAISED: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e2)",
};

/** A list row. Repeats many times, so it carries no ambient shadow at all. */
export const ROW: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "var(--e1)",
};

/** A quiet inset region: wells, meta containers, grouped controls, chips. */
export const CHIP: CSSProperties = {
  background: "var(--surface-inset)",
  border: "1px solid var(--hairline-soft)",
};

/** A recessed well — deeper than CHIP, for content that sits *under* the page. */
export const WELL: CSSProperties = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--hairline-soft)",
  boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
};

export const HAIRLINE = "1px solid var(--hairline-soft)";
export const HAIRLINE_FIRM = "1px solid var(--hairline)";

// ── Chrome — translucent, floats over content ─────────────────

/** Navigation, topbars, mobile tab bars. Content scrolls underneath. */
export const CHROME: CSSProperties = {
  background: "var(--chrome)",
  backdropFilter: "var(--chrome-blur)",
  WebkitBackdropFilter: "var(--chrome-blur)",
};

/** Sheets and popovers: more opaque, because they carry primary content. */
export const CHROME_STRONG: CSSProperties = {
  background: "var(--chrome-strong)",
  backdropFilter: "var(--chrome-blur-lg)",
  WebkitBackdropFilter: "var(--chrome-blur-lg)",
};

/** Modals, sheets, popovers — the only content-bearing translucent surface. */
export const ELEV_OVERLAY: CSSProperties = {
  ...CHROME_STRONG,
  border: "1px solid var(--hairline)",
  boxShadow: "var(--e4)",
};

/** The dimming layer behind a blocking task. No blur: the scrim already
 *  separates, and blurring the whole viewport on every dialog is the single
 *  most expensive thing an overlay can do. */
export const SCRIM: CSSProperties = {
  background: "var(--scrim)",
};

// ── On-ink — the inverted half of the system ──────────────────
// Used only inside `.band-ink`, the single dark anchor a page is
// allowed. Kept here so an inverted surface is a token like any
// other, rather than a one-off rgba written at the call site.

/** A button that reads as primary *on* the dark band: silver on ink. */
export const ON_INK_BTN: CSSProperties = {
  background: "#F1F5F9",
  border: "1px solid #F1F5F9",
  color: "#0F172A",
  boxShadow: "0 1px 2px rgba(0,0,0,0.28), 0 8px 20px -8px rgba(0,0,0,0.45)",
};

/** Its quiet counterpart: outlined, no fill. */
export const ON_INK_GHOST_BTN: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(226,232,240,0.28)",
  color: "#E2E8F0",
};

// ── Ink — the one primary colour ──────────────────────────────

export const INK_GRADIENT = "var(--ink-raised)";

export const INK_BTN: CSSProperties = {
  background: "var(--ink-raised)",
  border: "1px solid #0F172A",
  color: "#F8FAFC",
  boxShadow: "0 1px 2px rgba(15,23,42,0.24), 0 6px 16px -6px rgba(15,23,42,0.34), inset 0 1px 0 rgba(255,255,255,0.14)",
};

export const GLASS_BTN: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  color: "#334155",
  boxShadow: "var(--e1)",
};

export const DANGER_BTN: CSSProperties = {
  background: "rgba(244,63,94,0.07)",
  border: "1px solid rgba(244,63,94,0.26)",
  color: "#BE123C",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
};

// ── Feedback tints — one language for every state ─────────────
// The only surfaces allowed to carry semantic colour. Everything else is
// silver and ink, so a coloured surface always means something.

export const DANGER_TINT: CSSProperties = {
  background: "rgba(244,63,94,0.07)",
  border: "1px solid rgba(244,63,94,0.22)",
  color: "#BE123C",
};

export const SUCCESS_TINT: CSSProperties = {
  background: "rgba(16,185,129,0.09)",
  border: "1px solid rgba(16,185,129,0.24)",
  color: "#047857",
};

export const WARN_TINT: CSSProperties = {
  background: "rgba(251,191,36,0.10)",
  border: "1px solid rgba(217,119,6,0.24)",
  color: "#B45309",
};

// ── Status trio: desaturated tints on the page surface ────────
// Tint + rail ONLY. The visible label always comes from the dictionary
// (t.statuses[status]) so no Polish can leak out of the token layer.

export type StatusKey =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED_CUSTOMER"
  | "CANCELLED_BUSINESS"
  | "NO_SHOW"
  | "RESCHEDULED";

export const STATUS_TINT: Record<StatusKey, { style: CSSProperties; rail: string }> = {
  PENDING: {
    rail: "#D97706",
    style: WARN_TINT,
  },
  CONFIRMED: {
    rail: "#059669",
    style: SUCCESS_TINT,
  },
  IN_PROGRESS: {
    rail: "#475569",
    style: { background: "rgba(100,116,139,0.12)", border: "1px solid rgba(100,116,139,0.26)", color: "#334155" },
  },
  COMPLETED: {
    rail: "#94A3B8",
    style: { background: "rgba(148,163,184,0.12)", border: "1px solid rgba(148,163,184,0.26)", color: "#55637A" },
  },
  CANCELLED_CUSTOMER: {
    rail: "#E11D48",
    style: DANGER_TINT,
  },
  CANCELLED_BUSINESS: {
    rail: "#E11D48",
    style: DANGER_TINT,
  },
  NO_SHOW: {
    rail: "#E11D48",
    style: DANGER_TINT,
  },
  RESCHEDULED: {
    rail: "#94A3B8",
    style: { background: "rgba(148,163,184,0.12)", border: "1px solid rgba(148,163,184,0.26)", color: "#55637A" },
  },
};

// ── Type scale ────────────────────────────────────────────────
// Tracking is size-specific: letters read further apart as type grows, so
// display sizes tighten and small caps open up. Leading moves the other way.
//
//   display  32–44 / 1.05 / -0.035em   marketing headlines
//   title    20–24 / 1.15 / -0.022em   page titles
//   heading  15–17 / 1.35 / -0.014em   card and section headers
//   body     14–15 / 1.55 /  0         running text
//   caption  12–13 / 1.45 / +0.005em   meta, hints
//   overline 11    / 1.2  / +0.075em   uppercase labels

export const TITLE_CLS = "text-[20px] leading-[1.15] font-semibold text-slate-900 track-title";
export const HEADING_CLS = "text-[15px] leading-[1.35] font-semibold text-slate-800 track-heading";
export const OVERLINE_CLS =
  "text-[11px] leading-[1.2] font-semibold uppercase track-overline text-slate-500";
