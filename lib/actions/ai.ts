"use server";

import { gateAiRequest, resolveAiActor } from "@/lib/ai/permissions";
import { PLAN_ENTITLEMENTS, planKeyFromEnum } from "@/lib/entitlements";
import { runAssistant } from "@/lib/ai/assistant";
import { executeAiAction } from "@/lib/ai/execute";
import { getInsights } from "@/lib/ai/insights";
import { generateReviewReply, type ReviewTone } from "@/lib/ai/features/reviews";
import { generateCampaignCopy } from "@/lib/ai/features/marketing";
import { segmentByKey, type SegmentKey, type Channel } from "@/lib/marketing";
import { prisma } from "@/lib/prisma";
import type { AssistantMessage, AssistantTurn, AiActionError } from "@/lib/ai/proposal-types";
import type { Insight } from "@/lib/ai/insights-types";

const MAX_MSG_LEN = 4000;
const VALID_TONES: ReviewTone[] = ["professional", "friendly", "short"];

function sanitizeMessages(messages: unknown): AssistantMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m): m is AssistantMessage =>
      !!m && typeof m === "object" &&
      ((m as AssistantMessage).role === "user" || (m as AssistantMessage).role === "assistant") &&
      typeof (m as AssistantMessage).content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN) }))
    .slice(-12);
}

/** Run one assistant turn. Fully gated (auth → business → key → tier → daily budget). */
export async function askAssistant(messages: AssistantMessage[]): Promise<AssistantTurn | AiActionError> {
  const gate = await gateAiRequest();
  if (!gate.ok) return { ok: false, reason: gate.reason, message: gate.message };

  const clean = sanitizeMessages(messages);
  if (clean.length === 0 || clean[clean.length - 1].role !== "user") {
    return { ok: false, reason: "error", message: "Brak pytania." };
  }
  try {
    const res = await runAssistant({ actor: gate.actor, messages: clean });
    return { ok: true, text: res.text || "Nie mam na to odpowiedzi.", proposals: res.proposals };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Błąd asystenta." };
  }
}

/** Execute an AI-proposed action AFTER the owner confirmed it in the UI. */
export async function confirmAiAction(
  actionType: string,
  params: Record<string, unknown>
): Promise<{ ok: boolean; message: string } | AiActionError> {
  const resolved = await resolveAiActor();
  if (!resolved.ok) return { ok: false, reason: resolved.reason, message: "Brak dostępu." };
  const { actor } = resolved;
  if (actor.tier === "none" && !actor.isAdmin) {
    return { ok: false, reason: "plan_excluded", message: PLAN_ENTITLEMENTS[planKeyFromEnum(actor.plan)].label };
  }
  const res = await executeAiAction(String(actionType), params ?? {}, actor);
  return { ok: res.ok, message: res.message };
}

/** Standalone: generate a suggested review reply (does NOT publish). */
export async function generateReviewReplyDraft(
  reviewId: string,
  tone: ReviewTone
): Promise<{ ok: true; text: string } | AiActionError> {
  const gate = await gateAiRequest();
  if (!gate.ok) return { ok: false, reason: gate.reason, message: gate.message };
  const t: ReviewTone = VALID_TONES.includes(tone) ? tone : "professional";

  const review = await prisma.review.findFirst({
    where: { id: String(reviewId), businessId: gate.actor.businessId, status: "PUBLISHED" },
    select: { rating: true, comment: true },
  });
  if (!review) return { ok: false, reason: "error", message: "Nie znaleziono opinii." };

  try {
    const text = await generateReviewReply({
      businessId: gate.actor.businessId,
      userId: gate.actor.dbUserId,
      businessName: gate.actor.businessName,
      rating: review.rating,
      comment: review.comment,
      tone: t,
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Błąd generowania." };
  }
}

const VALID_SEGMENTS: SegmentKey[] = ["all", "upcoming", "regulars", "dormant"];
const VALID_CHANNELS: Channel[] = ["sms", "whatsapp", "email"];

/** Generate marketing copy for a segment + channel (does NOT send). Fills the composer. */
export async function generateCampaignCopyAction(
  segment: string,
  channel: string,
  goal?: string
): Promise<{ ok: true; subject: string | null; message: string } | AiActionError> {
  const gate = await gateAiRequest();
  if (!gate.ok) return { ok: false, reason: gate.reason, message: gate.message };
  if (!VALID_SEGMENTS.includes(segment as SegmentKey)) return { ok: false, reason: "error", message: "Nieprawidłowy segment." };
  if (!VALID_CHANNELS.includes(channel as Channel)) return { ok: false, reason: "error", message: "Nieprawidłowy kanał." };

  try {
    const copy = await generateCampaignCopy({
      businessId: gate.actor.businessId,
      userId: gate.actor.dbUserId,
      businessName: gate.actor.businessName,
      segmentLabel: segmentByKey(segment as SegmentKey).label,
      channel: channel as Channel,
      goal: typeof goal === "string" && goal.trim() ? goal.trim().slice(0, 200) : undefined,
    });
    return { ok: true, subject: copy.subject, message: copy.message };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Błąd generowania." };
  }
}

/** Recompute the proactive insights digest for the current business (deterministic). */
export async function refreshInsights(): Promise<Insight[]> {
  const resolved = await resolveAiActor();
  if (!resolved.ok) return [];
  return getInsights(resolved.actor.businessId, { force: true });
}
