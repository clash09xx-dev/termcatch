import "server-only";

import { prisma } from "@/lib/prisma";
import { estimatedCostUsd } from "./config";

/**
 * AI usage logging + rate-limit accounting, backed by the ai_usage_logs table.
 *
 * We use a rolling 24-hour window as the "daily" budget — robust, timezone-free,
 * and abuse-resistant (no midnight burst). Nothing about the prompt content is
 * stored — only business/user id, feature, model, token counts and cost.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Number of AI requests this business has made in the last 24h. */
export async function countRequestsLast24h(businessId: string): Promise<number> {
  const since = new Date(Date.now() - DAY_MS);
  try {
    return await prisma.aiUsageLog.count({
      where: { businessId, createdAt: { gte: since } },
    });
  } catch {
    // If the ledger table is unavailable, fail OPEN on counting (don't hard-block
    // the product) — the tier gate + key gate still protect cost.
    return 0;
  }
}

/** Number of SMART-model deep analyses this business ran in the last 24h. */
export async function countDeepAnalysesLast24h(businessId: string): Promise<number> {
  const since = new Date(Date.now() - DAY_MS);
  try {
    return await prisma.aiUsageLog.count({
      where: { businessId, feature: "deep_analysis", createdAt: { gte: since } },
    });
  } catch {
    return 0;
  }
}

export type AiUsageEntry = {
  businessId: string;
  userId?: string | null;
  role?: string | null;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  ok?: boolean;
};

/**
 * Start of the current AI-cost window for a business. Prefers the Stripe
 * subscription's current_period_start (so the $60 cap resets with the real
 * billing cycle); falls back to the start of the calendar month.
 */
export async function billingPeriodStart(businessId: string): Promise<Date> {
  try {
    const sub = await prisma.businessSubscription.findFirst({
      where: { businessId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, currentPeriodStart: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { currentPeriodStart: true },
    });
    if (sub?.currentPeriodStart) return sub.currentPeriodStart;
  } catch {
    /* fall through */
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Accumulated estimated OpenAI cost (USD) for a business since `since`. */
export async function monthlyCostForBusiness(businessId: string, since: Date): Promise<number> {
  try {
    const r = await prisma.aiUsageLog.aggregate({
      where: { businessId, createdAt: { gte: since } },
      _sum: { estimatedCost: true },
    });
    return r._sum.estimatedCost ?? 0;
  } catch {
    return 0;
  }
}

/** Record one completed (or failed) AI request. Never throws. */
export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  const estimatedCost = estimatedCostUsd(entry.model, entry.inputTokens, entry.outputTokens);
  try {
    await prisma.aiUsageLog.create({
      data: {
        businessId: entry.businessId,
        userId: entry.userId ?? null,
        role: entry.role ?? null,
        feature: entry.feature,
        model: entry.model,
        inputTokens: Math.max(0, Math.round(entry.inputTokens || 0)),
        outputTokens: Math.max(0, Math.round(entry.outputTokens || 0)),
        estimatedCost,
        ok: entry.ok ?? true,
      },
    });
  } catch {
    // Logging must never break a user-facing AI response.
  }
}

/** Aggregate spend + request count for a business over the last N days (admin/analytics). */
export async function usageSummary(businessId: string, days = 30) {
  const since = new Date(Date.now() - days * DAY_MS);
  try {
    const rows = await prisma.aiUsageLog.aggregate({
      where: { businessId, createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true, estimatedCost: true },
    });
    return {
      requests: rows._count._all,
      inputTokens: rows._sum.inputTokens ?? 0,
      outputTokens: rows._sum.outputTokens ?? 0,
      estimatedCostUsd: rows._sum.estimatedCost ?? 0,
    };
  } catch {
    return { requests: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
  }
}
