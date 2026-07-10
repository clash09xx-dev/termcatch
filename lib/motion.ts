"use client";

// ─── Shared motion vocabulary ────────────────────────────────────────────────
// One place for every product animation. Rules:
// - springs for things that respond to the hand (buttons, chips)
// - 240–320ms eased fades/slides for things that change layout
// - one moving thing at a time; no loops in the product
// - every consumer must gate through useReducedMotion (re-exported here)

import type { Variants, Transition } from "framer-motion";
export { useReducedMotion } from "framer-motion";

/** Brand ease — matches --smooth in globals.css */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Hand-response spring — matches marketing pages (420/26) */
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 26 };

/** Layout spring — softer, for panels and sheets */
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 380, damping: 30 };

/** Section / list-item entrance */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

/** Parent wrapper that staggers fadeUp children by 30ms */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

/** Horizontal step slide — the wizard's signature move. Use with custom={direction}. */
export const stepSlide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 32 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.26, ease: EASE } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -24, transition: { duration: 0.18, ease: EASE } }),
};

/** Reduced-motion replacement for stepSlide */
export const stepFade: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Modal / dialog panel — fade + 0.97→1 scale on a soft spring */
export const modalIn: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING_SOFT },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15, ease: EASE } },
};

/** Bottom sheet — slides up from the edge */
export const sheetUp: Variants = {
  hidden: { opacity: 0, y: 48 },
  show: { opacity: 1, y: 0, transition: SPRING_SOFT },
  exit: { opacity: 0, y: 32, transition: { duration: 0.18, ease: EASE } },
};

/** Overlay fade behind modals/sheets */
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Week/page slide for calendar navigation. Use with custom={direction}. */
export const weekSlide: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.28, ease: EASE } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28, transition: { duration: 0.18, ease: EASE } }),
};
