/**
 * Client-safe AI limit constants + types.
 *
 * Kept separate from lib/ai/config.ts (which reads server-side env, incl. the
 * OpenAI key) so UI components can display limits/tiers without pulling any
 * secret-reading code into the client bundle.
 */

/** The AI entitlement tier, mirrored from lib/entitlements.ts `Entitlements.aiAssistant`. */
export type AiTier = "none" | "basic" | "unlimited";

/**
 * Default per-business daily request ceilings by entitlement tier.
 *   • none      — AI is not part of the plan (FREE/SOLO/TEAM).
 *   • basic     — included assistant (PRO).
 *   • unlimited — high safety ceiling (ULTIMATE) so no single business can
 *                 create runaway API cost even on the "unlimited" plan.
 * Overridable via env (see dailyRequestLimitForTier in config.ts).
 */
export const DAILY_REQUESTS_BY_TIER: Record<AiTier, number> = {
  none: 0,
  basic: 40,
  unlimited: 400,
};

/** Human labels for the tier (Polish UI copy). */
export const AI_TIER_LABEL: Record<AiTier, string> = {
  none: "Brak w planie",
  basic: "Asystent AI",
  unlimited: "Asystent AI bez limitu",
};
