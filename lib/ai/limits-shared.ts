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
 *   • none      — AI is not part of the plan (FREE / Solo / Team).
 *   • basic     — Professional (369 zł): a real daily cap so AI cost stays a
 *                 tiny fraction of the plan price (high margin). Hitting it
 *                 shows an upsell to Ultimate.
 *   • unlimited — Ultimate (499 zł): effectively unlimited for any real salon.
 *                 The ceiling here is a pure ANTI-ABUSE guard (only a script
 *                 could hit ~one request every ~3 min for 24h) — a human team
 *                 never reaches it, so "unlimited" stays honest while a single
 *                 business still can't create runaway API cost.
 * With the assistant running on the cheap model (~$0.0015/turn), these caps
 * keep worst-case cost low: Professional ≈ $1.4/mo, Ultimate ≈ $22/mo at the
 * ceiling (typical usage far less). Overridable via env (see config.ts).
 */
export const DAILY_REQUESTS_BY_TIER: Record<AiTier, number> = {
  none: 0,
  basic: 30,
  unlimited: 500,
};

/** Human labels for the tier (Polish UI copy). */
export const AI_TIER_LABEL: Record<AiTier, string> = {
  none: "Brak w planie",
  basic: "Asystent AI",
  unlimited: "Asystent AI bez limitu",
};

/**
 * Daily SMART-model "deep analysis" allowance by tier.
 *   • basic (Professional) — intentionally limited to 3/day; the 4th prompts an
 *     upgrade to Ultimate.
 *   • unlimited (Ultimate) — high fair-use ceiling (never hit by real use).
 */
export const DEEP_ANALYSES_BY_TIER: Record<AiTier, number> = {
  none: 0,
  basic: 3,
  unlimited: 50,
};

/** Informational monthly cost budget (USD) surfaced in AI context, not hard-enforced. */
export const MONTHLY_COST_LIMIT_BY_TIER: Record<AiTier, number> = {
  none: 0,
  basic: 8,
  unlimited: 60,
};
