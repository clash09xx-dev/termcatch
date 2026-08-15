"use client";

// ─── Motion — the single source of truth ─────────────────────────────────────
// Every duration, curve and spring in TermCatch comes from here. The same
// numbers are mirrored into CSS custom properties in globals.css and into the
// Tailwind config, so a CSS hover and a Framer entrance on the same card
// decelerate identically. Nothing outside this file invents a timing value.
//
// The rules behind the numbers:
//   • UI motion stays under 300ms. Sheets and drawers may go to 380ms because
//     they travel a whole screen edge.
//   • Entering / exiting uses ease-out — it starts fast, which is the frame the
//     user is actually watching.
//   • Hover and colour changes use plain ease. They are not entrances.
//   • Springs are described the way Apple describes them: a damping ratio and a
//     response time. Critically damped (no overshoot) is the default; bounce is
//     reserved for motion that followed a real gesture — a flick, a drag.
//   • Exits are faster than entrances, and travel the same path in reverse.

import type { Variants, Transition } from "framer-motion";
export { useReducedMotion } from "framer-motion";

// ── Durations (ms) ────────────────────────────────────────────

export const DUR = {
  /** Press / release feedback. Must feel like the surface reacted, not animated. */
  press: 120,
  /** Hover, tooltips, small colour and shadow changes. */
  fast: 160,
  /** Dropdowns, popovers, selects, crossfades, content swaps. */
  base: 220,
  /** Modals and anything that dims the page behind it. */
  slow: 300,
  /** Sheets and drawers — a full screen edge of travel. */
  sheet: 380,
} as const;

const s = (ms: number) => ms / 1000;

// ── Curves ────────────────────────────────────────────────────
// Kept as tuples so Framer can consume them directly, with string forms for CSS.

export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];
export const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];
export const EASE_HOVER: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const EASE_CSS = {
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
  drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
  hover: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/** Back-compat alias — the brand ease is the strong ease-out. */
export const EASE = EASE_OUT;

// ── Springs ───────────────────────────────────────────────────
// Framer's { bounce, duration } maps onto Apple's { damping, response }:
// bounce 0 ≈ damping 1.0 (critically damped), bounce 0.2 ≈ damping ~0.8.

/** Default for anything that settles into place. No overshoot. */
export const SPRING: Transition = { type: "spring", bounce: 0, duration: 0.34 };

/** Repositioning a surface that is already on screen. */
export const SPRING_MOVE: Transition = { type: "spring", bounce: 0, duration: 0.4 };

/** Only after a real gesture carried momentum — a flick, a drag release. */
export const SPRING_MOMENTUM: Transition = { type: "spring", bounce: 0.18, duration: 0.4 };

/** Sheets and drawers: the faintest overshoot, so the edge feels physical. */
export const SPRING_SHEET: Transition = { type: "spring", bounce: 0.12, duration: 0.34 };

// ── Shared variants ───────────────────────────────────────────

/** Overlay scrim. Exit is faster than enter so dismissal feels immediate. */
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: s(DUR.base), ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: s(DUR.fast), ease: EASE_OUT } },
};

/**
 * Modal panel. Materialises rather than fading: it scales and un-blurs together
 * so it reads as a surface arriving, not an image cross-dissolving.
 * Modals stay centred — they are not anchored to a trigger.
 */
export const modalIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, filter: "blur(6px)" },
  show: { opacity: 1, scale: 1, filter: "blur(0px)", transition: SPRING },
  exit: {
    opacity: 0,
    scale: 0.985,
    filter: "blur(3px)",
    transition: { duration: s(DUR.fast), ease: EASE_OUT },
  },
};

/**
 * Bottom sheet. Enters and leaves through the same edge it lives on, using a
 * percentage so it works at any sheet height.
 */
export const sheetUp: Variants = {
  hidden: { y: "100%" },
  show: { y: "0%", transition: SPRING_SHEET },
  exit: { y: "100%", transition: { duration: s(DUR.base), ease: EASE_DRAWER } },
};

/** Reduced-motion stand-in for any surface: opacity only, no travel. */
export const gentleFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: s(DUR.fast) } },
  exit: { opacity: 0, transition: { duration: s(DUR.press) } },
};

/** Horizontal step slide — the wizard's signature move. Use with custom={dir}. */
export const stepSlide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0, transition: { duration: s(DUR.base), ease: EASE_OUT } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -20, transition: { duration: s(DUR.fast), ease: EASE_OUT } }),
};

/** Reduced-motion replacement for stepSlide. */
export const stepFade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: s(DUR.fast) } },
  exit: { opacity: 0, transition: { duration: s(DUR.press) } },
};

/**
 * Scroll reveal for marketing sections. One definition, used by every landing
 * and public page, so a section never arrives at a different speed or from a
 * different distance than the one above it.
 *
 * Travel is short (10px, not 24) and the stagger is 55ms, not 100 — a fifth
 * card used to land 1.1s after the first, which reads as the page still
 * loading rather than as the page arriving.
 *
 * `show` takes the item index as Framer's `custom` value.
 */
export const reveal: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: s(DUR.slow + 120), delay: i * 0.055, ease: EASE_OUT },
  }),
};

/** The same reveal with the travel removed, for prefers-reduced-motion. */
export const revealFade: Variants = {
  hidden: { opacity: 0 },
  show: (i = 0) => ({ opacity: 1, transition: { duration: s(DUR.base), delay: i * 0.04 } }),
};

/** Viewport config for a reveal: fire once, a little before the edge. */
export const REVEAL_VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

// ── Helpers ───────────────────────────────────────────────────

/**
 * Apple's momentum projection: where a flick would come to rest.
 * Use it to choose a snap target from a release velocity, then hand the same
 * velocity to the spring so there is no seam between drag and animation.
 */
export function projectMomentum(velocityPxPerSec: number, decelerationRate = 0.998): number {
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. Real things slow before they stop, so
 * a drag beyond the edge should follow the finger less and less.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
