// ─── Central plan entitlements (single source of truth) ─────────────────────
// The ONLY place plan limits live. Server code imports from here; never scatter
// `if (plan === "TEAM")` checks. Enforced server-side (see lib/actions/*).
//
// Product rules (active resources only):
//   Solo      → 1 specialist,  1 location
//   Zespół    → 4 specialists, 1 location
//   Salon Pro → 15 specialists,2 locations
//   Ultimate  → unlimited,     unlimited
// FREE (the default until a paid subscription exists) uses the conservative Solo
// baseline. `null` = unlimited.

import type { SubscriptionPlan } from "@prisma/client";

export type PlanKey = "FREE" | "SOLO" | "TEAM" | "PRO" | "ULTIMATE";

export type Entitlements = {
  /** Max ACTIVE specialists; null = unlimited. */
  maxEmployees: number | null;
  /** Max ACTIVE locations; null = unlimited. */
  maxLocations: number | null;
  /** Future AI allowance metadata (wired in Prompt 3). */
  aiAssistant: "none" | "basic" | "unlimited";
  /** Display metadata. */
  label: string;
};

export const PLAN_ENTITLEMENTS: Record<PlanKey, Entitlements> = {
  FREE: { maxEmployees: 1, maxLocations: 1, aiAssistant: "none", label: "Darmowy" },
  SOLO: { maxEmployees: 1, maxLocations: 1, aiAssistant: "none", label: "Solo" },
  TEAM: { maxEmployees: 4, maxLocations: 1, aiAssistant: "none", label: "Zespół" },
  PRO: { maxEmployees: 15, maxLocations: 2, aiAssistant: "basic", label: "Salon Pro" },
  ULTIMATE: { maxEmployees: null, maxLocations: null, aiAssistant: "unlimited", label: "Ultimate" },
};

/** Upgrade order (cheapest → most capable) for "which plan do I need" logic. */
export const PLAN_ORDER: PlanKey[] = ["FREE", "SOLO", "TEAM", "PRO", "ULTIMATE"];

// The DB SubscriptionPlan enum (FREE/STARTER/PROFESSIONAL/ENTERPRISE) is coarser
// than the four marketing plans. Until Stripe stores the precise plan (Prompt 3)
// we map conservatively. TEAM has no enum representation yet, so it is never
// produced from the DB — it exists here so entitlements are ready for Prompt 3.
const ENUM_TO_PLAN: Record<SubscriptionPlan, PlanKey> = {
  FREE: "FREE",
  STARTER: "SOLO",
  PROFESSIONAL: "PRO",
  ENTERPRISE: "ULTIMATE",
};

export function planKeyFromEnum(plan: SubscriptionPlan | null | undefined): PlanKey {
  return (plan && ENUM_TO_PLAN[plan]) || "FREE";
}

export function entitlementsForPlanKey(key: PlanKey): Entitlements {
  return PLAN_ENTITLEMENTS[key];
}

export function entitlementsForEnum(plan: SubscriptionPlan | null | undefined): Entitlements {
  return PLAN_ENTITLEMENTS[planKeyFromEnum(plan)];
}

function isUnlimited(limit: number | null): boolean {
  return limit === null;
}

/** Can this plan hold `nextCount` active resources of the given kind? */
export function withinLimit(key: PlanKey, resource: "employee" | "location", nextCount: number): boolean {
  const limit = resource === "employee" ? PLAN_ENTITLEMENTS[key].maxEmployees : PLAN_ENTITLEMENTS[key].maxLocations;
  return isUnlimited(limit) || nextCount <= (limit as number);
}

/** The cheapest plan whose limit can hold `count` active resources (null if none). */
export function requiredPlanFor(resource: "employee" | "location", count: number): PlanKey | null {
  for (const key of PLAN_ORDER) {
    const limit = resource === "employee" ? PLAN_ENTITLEMENTS[key].maxEmployees : PLAN_ENTITLEMENTS[key].maxLocations;
    if (isUnlimited(limit) || count <= (limit as number)) return key;
  }
  return null;
}

/** Typed error thrown server-side when a plan limit would be exceeded. */
export type PlanLimitInfo = {
  resource: "employee" | "location";
  plan: PlanKey;
  planLabel: string;
  used: number;
  limit: number;
  requiredPlan: PlanKey | null;
  requiredPlanLabel: string | null;
};

export class PlanLimitError extends Error {
  info: PlanLimitInfo;
  constructor(info: PlanLimitInfo) {
    super(`plan_limit:${info.resource}`);
    this.name = "PlanLimitError";
    this.info = info;
  }
}

/** Build the typed limit info for the upgrade dialog. `used` = current active count. */
export function planLimitInfo(resource: "employee" | "location", key: PlanKey, used: number): PlanLimitInfo {
  const limit = resource === "employee" ? PLAN_ENTITLEMENTS[key].maxEmployees : PLAN_ENTITLEMENTS[key].maxLocations;
  const required = requiredPlanFor(resource, used + 1);
  return {
    resource,
    plan: key,
    planLabel: PLAN_ENTITLEMENTS[key].label,
    used,
    limit: (limit as number) ?? -1,
    requiredPlan: required && required !== key ? required : null,
    requiredPlanLabel: required && required !== key ? PLAN_ENTITLEMENTS[required].label : null,
  };
}
