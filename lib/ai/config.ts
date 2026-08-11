/**
 * Central AI configuration — models, feature flags, cost + usage limits.
 *
 * Mirrors the codebase's "enabled / configured / ready" env idiom
 * (see lib/sms-config.ts, lib/subscription.ts#billingConfigured):
 *   • aiEnabled()    — kill switch (AI_ENABLED, defaults ON)
 *   • aiConfigured() — a real OPENAI_API_KEY is present (non-placeholder)
 *   • aiReady()      — enabled && configured  (what call-sites gate on)
 *
 * NOTE: this module reads server-side env. The raw OPENAI_API_KEY is never
 * exported — only the boolean aiConfigured(). Do not import into client
 * components; the limit constants live in lib/ai/limits-shared.ts for the UI.
 */

import type { AiTier } from "./limits-shared";
import { DAILY_REQUESTS_BY_TIER } from "./limits-shared";

// ── Models ──────────────────────────────────────────────────────────────────
// Two tiers so we never hardcode an expensive model into every request.
// Fully overridable via env. Defaults are widely-available Responses-API models.
export const AI_MODEL_FAST = process.env.AI_MODEL_FAST || "gpt-4o-mini";
export const AI_MODEL_SMART = process.env.AI_MODEL_SMART || "gpt-4o";

export type AiModelTier = "fast" | "smart";
export function modelFor(tier: AiModelTier): string {
  return tier === "smart" ? AI_MODEL_SMART : AI_MODEL_FAST;
}

// ── Flags ─────────────────────────────────────────────────────────────────--
function present(v: string | undefined | null): boolean {
  return typeof v === "string" && v.trim().length > 0 && !v.includes("...");
}

/** Kill switch. Defaults ON (AI is a first-class product); set AI_ENABLED=false to disable. */
export function aiEnabled(): boolean {
  return process.env.AI_ENABLED !== "false";
}

/** A usable OpenAI key is present. The key itself is never returned. */
export function aiConfigured(): boolean {
  return present(process.env.OPENAI_API_KEY);
}

/** The gate every server-side AI call-site checks. */
export function aiReady(): boolean {
  return aiEnabled() && aiConfigured();
}

// ── Output / context bounds ───────────────────────────────────────────────--
/** Hard cap on model output tokens per request (cost protection). */
export const MAX_OUTPUT_TOKENS = clampInt(process.env.AI_MAX_OUTPUT_TOKENS, 1200, 128, 4000);

/** Soft budget for the compact business context we send (chars, ~4 chars/token). */
export const MAX_CONTEXT_CHARS = clampInt(process.env.AI_MAX_CONTEXT_CHARS, 12000, 2000, 40000);

// ── Per-request cost estimation (USD) ─────────────────────────────────────--
// Approximate list prices per 1M tokens, used ONLY for internal usage logging /
// budget accounting. Not billed to anyone. Override via env if prices change.
const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4.1": { in: 2.0, out: 8 },
  "gpt-4.1-mini": { in: 0.4, out: 1.6 },
};

/** Estimated USD cost for a completed request. Falls back to the smart-model price. */
export function estimatedCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE_PER_MTOK[model] ?? PRICE_PER_MTOK[AI_MODEL_SMART] ?? { in: 2.5, out: 10 };
  const cost = (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
  // round to 6 decimal places (fractions of a cent)
  return Math.round(cost * 1_000_000) / 1_000_000;
}

// ── Per-business daily request budget by entitlement tier ─────────────────--
// Even the "unlimited" tier carries a high safety ceiling so a single business
// can never create runaway API cost. Overridable via env.
export function dailyRequestLimitForTier(tier: AiTier): number {
  const envKey =
    tier === "unlimited" ? "AI_DAILY_LIMIT_UNLIMITED"
    : tier === "basic" ? "AI_DAILY_LIMIT_BASIC"
    : "AI_DAILY_LIMIT_NONE";
  const override = clampInt(process.env[envKey], DAILY_REQUESTS_BY_TIER[tier], 0, 100000);
  return override;
}

// ── helpers ─────────────────────────────────────────────────────────────────
function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = raw != null && raw.trim() !== "" ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
