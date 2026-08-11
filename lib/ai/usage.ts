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

export type AiUsageEntry = {
  businessId: string;
  userId?: string | null;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  ok?: boolean;
};

/** Record one completed (or failed) AI request. Never throws. */
export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  const estimatedCost = estimatedCostUsd(entry.model, entry.inputTokens, entry.outputTokens);
  try {
    await prisma.aiUsageLog.create({
      data: {
        businessId: entry.businessId,
        userId: entry.userId ?? null,
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
