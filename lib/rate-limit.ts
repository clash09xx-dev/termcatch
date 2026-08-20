import "server-only";

import { headers } from "next/headers";

/**
 * Server-side rate limiting for abuse-sensitive actions.
 *
 * WHY IN-PROCESS, AND WHAT THAT COSTS
 * The project has no shared limiter store (no Redis, no Upstash), and adding one
 * for this would be a bigger change than the surfaces it protects. Counters live
 * in module memory, which means: they reset on deploy, and on a multi-instance
 * deploy each instance keeps its own — so the effective limit is
 * `limit x instanceCount`. For the surfaces here (a contact form, invitations)
 * that still turns "unbounded" into "bounded", which is the difference that
 * matters. If a shared limiter is ever added, this is the ONE module to swap.
 *
 * WHAT THIS IS NOT
 * It is not account lockout. Nothing here ever disables an account, because an
 * attacker who can lock other people out has been handed a denial-of-service
 * tool — the exact anti-pattern to avoid. A key that exceeds its budget is told
 * to come back later, and the budget refills on its own.
 *
 * TWO KEYS ARE BETTER THAN ONE
 * Per-IP alone is defeated by a botnet; per-identifier alone is defeated by
 * rotating the identifier. Callers that can cheaply do both should, and the
 * FIRST one to trip wins.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Keep the map from growing without bound on a long-lived process. */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
}

export type RateVerdict = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Consume one unit from `key`'s budget.
 *
 * Returns `retryAfterSec` when the budget is spent, so the caller can tell the
 * user when to try again instead of failing opaquely.
 */
export function consume(key: string, limit: number, windowMs: number): RateVerdict {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

/** Forget a key — for the "they proved they are legitimate" case. */
export function reset(key: string): void {
  buckets.delete(key);
}

/**
 * The caller's IP, from the proxy headers Railway sets.
 *
 * `x-forwarded-for` is a client-supplied header that a proxy APPENDS to, so the
 * left-most entry is spoofable and the right-most is the closest hop. We take
 * the FIRST entry because behind a single trusted proxy that is the real client
 * — and we treat the result as a best-effort bucketing hint, never as identity.
 * A spoofed value can only ever move an attacker between buckets, which is why
 * abuse-sensitive callers pair it with a second, non-spoofable key.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "unknown";
}
