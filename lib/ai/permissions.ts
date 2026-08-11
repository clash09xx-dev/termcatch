import "server-only";

import type { SubscriptionPlan } from "@prisma/client";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/is-admin";
import { planKeyFromEnum, PLAN_ENTITLEMENTS } from "@/lib/entitlements";
import type { AiTier } from "./limits-shared";
import { aiConfigured, aiEnabled, dailyRequestLimitForTier } from "./config";
import { countRequestsLast24h } from "./usage";

/**
 * The one gate every server-side AI entry point calls. It resolves the logged-in
 * owner's business, applies the entitlement.aiAssistant tier, the per-business
 * daily request budget, and the key/kill-switch gates — so no tool, insight or
 * assistant call can ever bypass authentication, ownership, or plan limits.
 *
 * Admins bypass the tier + rate gates (internal access), never the auth gate.
 */

export type AiActor = {
  supabaseUserId: string;
  dbUserId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  plan: SubscriptionPlan;
  tier: AiTier;
  isAdmin: boolean;
};

export type AiDenyReason =
  | "unauthenticated"
  | "no_business"
  | "not_configured"
  | "disabled"
  | "plan_excluded"
  | "rate_limited";

export type AiGate =
  | { ok: true; actor: AiActor }
  | { ok: false; reason: AiDenyReason; message: string; limit?: number; used?: number };

const DENY_MESSAGES: Record<AiDenyReason, string> = {
  unauthenticated: "Musisz być zalogowany.",
  no_business: "Nie masz przypisanego salonu.",
  not_configured: "Asystent AI nie jest jeszcze skonfigurowany.",
  disabled: "Asystent AI jest chwilowo wyłączony.",
  plan_excluded: "Asystent AI jest dostępny w planie Professional i Ultimate.",
  rate_limited: "Osiągnięto dzienny limit zapytań do AI. Spróbuj ponownie później.",
};

function deny(reason: AiDenyReason, extra?: { limit?: number; used?: number }): AiGate {
  return { ok: false, reason, message: DENY_MESSAGES[reason], ...extra };
}

/** Resolve the current owner's business + AI tier, without applying the rate gate. */
export async function resolveAiActor(): Promise<
  { ok: true; actor: AiActor } | { ok: false; reason: Extract<AiDenyReason, "unauthenticated" | "no_business"> }
> {
  const user = await getServerUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      id: true,
      ownedBusinesses: {
        take: 1,
        select: { id: true, name: true, slug: true, subscriptionPlan: true },
      },
    },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!dbUser || !business) return { ok: false, reason: "no_business" };

  const isAdmin = await isPlatformAdmin();
  const planKey = planKeyFromEnum(business.subscriptionPlan);
  // Admins get the top tier so internal testing is never plan-blocked.
  const tier: AiTier = isAdmin ? "unlimited" : PLAN_ENTITLEMENTS[planKey].aiAssistant;

  return {
    ok: true,
    actor: {
      supabaseUserId: user.id,
      dbUserId: dbUser.id,
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      plan: business.subscriptionPlan,
      tier,
      isAdmin,
    },
  };
}

/**
 * Full gate for a chargeable AI request: auth → business → key/flag → tier →
 * daily budget. Call this immediately before any OpenAI request.
 */
export async function gateAiRequest(): Promise<AiGate> {
  if (!aiEnabled()) return deny("disabled");
  if (!aiConfigured()) return deny("not_configured");

  const resolved = await resolveAiActor();
  if (!resolved.ok) return deny(resolved.reason);
  const { actor } = resolved;

  if (actor.tier === "none") return deny("plan_excluded");

  const limit = dailyRequestLimitForTier(actor.tier);
  const used = await countRequestsLast24h(actor.businessId);
  if (used >= limit) return deny("rate_limited", { limit, used });

  return { ok: true, actor };
}

/** Lightweight capability check for rendering UI (no rate consumption). */
export async function aiCapability(): Promise<{
  available: boolean;
  reason?: AiDenyReason;
  tier?: AiTier;
  isAdmin?: boolean;
}> {
  if (!aiEnabled()) return { available: false, reason: "disabled" };
  if (!aiConfigured()) return { available: false, reason: "not_configured" };
  const resolved = await resolveAiActor();
  if (!resolved.ok) return { available: false, reason: resolved.reason };
  if (resolved.actor.tier === "none")
    return { available: false, reason: "plan_excluded", tier: "none", isAdmin: resolved.actor.isAdmin };
  return { available: true, tier: resolved.actor.tier, isAdmin: resolved.actor.isAdmin };
}
