/** Client-safe insight types (shared by the engine and the UI cards). */

export type InsightSeverity = "info" | "opportunity" | "warning";

export type InsightCategory = "revenue" | "calendar" | "clients" | "employees" | "services" | "reviews";

/** Rendered, localized insight consumed by the UI cards. */
export type Insight = {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  body: string;
  /** Optional headline metric shown large on the card. */
  metric?: string;
  /** Optional deep link (page or the AI assistant with a suggested prompt). */
  cta?: { label: string; href: string };
};

/**
 * Language-neutral insight — a stable `type` + interpolation `vars`. This is what
 * gets CACHED (no rendered Polish stored), then rendered per-locale from the
 * dictionary at read time. `ctaKey` selects a localized button label.
 */
export type InsightType =
  | "free-slots-tomorrow" | "inactive-clients" | "revenue-down" | "revenue-up"
  | "no-show-rate" | "negative-reviews" | "employee-imbalance" | "top-service" | "quiet-block";

export type InsightCtaKey = "askAssistant" | "prepareCampaign" | "howRevenue" | "replyAi";

export type StructuredInsight = {
  id: string;
  type: InsightType;
  category: InsightCategory;
  severity: InsightSeverity;
  metric?: string;
  vars: Record<string, string | number>;
  ctaKey?: InsightCtaKey;
  ctaHref: string;
};
