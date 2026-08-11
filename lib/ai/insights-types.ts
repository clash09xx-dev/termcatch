/** Client-safe insight types (shared by the engine and the UI cards). */

export type InsightSeverity = "info" | "opportunity" | "warning";

export type Insight = {
  id: string;
  category: "revenue" | "calendar" | "clients" | "employees" | "services" | "reviews";
  severity: InsightSeverity;
  title: string;
  body: string;
  /** Optional headline metric shown large on the card. */
  metric?: string;
  /** Optional deep link (page or the AI assistant with a suggested prompt). */
  cta?: { label: string; href: string };
};
