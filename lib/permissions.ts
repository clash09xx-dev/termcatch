/**
 * Centralized authorization layer (client-safe, pure).
 *
 * ONE place that maps role → capability, so permission checks aren't scattered
 * across components. Structured to grow into granular per-employee permissions
 * later without changing call-sites. Authorization is always resolved from the
 * authenticated server session — never from a model claim or a client value.
 */

export type Role = "owner" | "employee" | "admin";

export type Capability =
  | "ai.owner" // full owner AI business manager
  | "ai.employee" // lightweight operational employee AI
  | "ai.deep" // SMART / deep multi-dataset analysis
  | "analytics.revenue" // revenue, profit, business-wide financials
  | "analytics.business" // peak hours, utilization, demand business-wide
  | "employees.performance" // cross-employee comparisons
  | "employees.manage"
  | "marketing" // campaigns, automations, ROI
  | "invoices" // Fakturownia / invoicing
  | "subscription" // plan / billing
  | "reviews.manage"
  | "crm.full" // business-wide customer data + segmentation
  | "calendar.all" // whole-business calendar
  | "calendar.own" // the employee's own appointments + free slots
  | "clients.appointment"; // minimal client data for the employee's own appointments

const OWNER_CAPS: Capability[] = [
  "ai.owner", "ai.employee", "ai.deep", "analytics.revenue", "analytics.business", "employees.performance",
  "employees.manage", "marketing", "invoices", "subscription", "reviews.manage", "crm.full",
  "calendar.all", "calendar.own", "clients.appointment",
];

// Deliberately minimal — the operational subset an employee needs to do their job.
const EMPLOYEE_CAPS: Capability[] = ["ai.employee", "calendar.own", "clients.appointment"];

const CAPS: Record<Role, Capability[]> = {
  owner: OWNER_CAPS,
  admin: OWNER_CAPS, // platform admin gets owner-level business capabilities (kept separate from owner identity)
  employee: EMPLOYEE_CAPS,
};

export function can(role: Role, cap: Capability): boolean {
  return CAPS[role]?.includes(cap) ?? false;
}

export function isOwnerLevel(role: Role): boolean {
  return role === "owner" || role === "admin";
}
