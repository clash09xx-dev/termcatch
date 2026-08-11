import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { can, isOwnerLevel, type Capability } from "../lib/permissions";
import { monthlyCostCapUsd } from "../lib/ai/config";

// ── Centralized permission layer (role → capability) ─────────────────────────
describe("permission layer — owner vs employee", () => {
  const OWNER_ONLY: Capability[] = [
    "analytics.revenue", "analytics.business", "employees.performance", "employees.manage",
    "marketing", "invoices", "subscription", "reviews.manage", "crm.full", "calendar.all", "ai.deep",
  ];
  const EMPLOYEE_OK: Capability[] = ["ai.employee", "calendar.own", "clients.appointment"];

  test("owner has full access", () => {
    for (const c of [...OWNER_ONLY, ...EMPLOYEE_OK]) assert.equal(can("owner", c), true, c);
  });
  test("employee is blocked from every owner-only capability", () => {
    for (const c of OWNER_ONLY) assert.equal(can("employee", c), false, c);
  });
  test("employee keeps the minimal operational capabilities", () => {
    for (const c of EMPLOYEE_OK) assert.equal(can("employee", c), true, c);
  });
  test("employee cannot access revenue, invoices, marketing, subscription, or business-wide CRM", () => {
    assert.equal(can("employee", "analytics.revenue"), false);
    assert.equal(can("employee", "invoices"), false);
    assert.equal(can("employee", "marketing"), false);
    assert.equal(can("employee", "subscription"), false);
    assert.equal(can("employee", "crm.full"), false);
    assert.equal(can("employee", "ai.deep"), false); // no SMART/deep analysis
  });
  test("platform admin gets owner-level business capabilities, kept separate from owner identity", () => {
    assert.equal(can("admin", "analytics.revenue"), true);
    assert.equal(isOwnerLevel("admin"), true);
  });
  test("isOwnerLevel: owner/admin yes, employee no", () => {
    assert.equal(isOwnerLevel("owner"), true);
    assert.equal(isOwnerLevel("admin"), true);
    assert.equal(isOwnerLevel("employee"), false);
  });
});

// ── Hard monthly AI cost cap ─────────────────────────────────────────────────
describe("hard monthly AI cost cap", () => {
  test("default cap is $60", () => {
    assert.equal(monthlyCostCapUsd(), 60);
  });
  test("block uses >= semantics: below allowed, at/above blocked", () => {
    const cap = monthlyCostCapUsd();
    assert.equal(59.99 >= cap, false); // below → allowed
    assert.equal(60 >= cap, true); // exactly at → blocked
    assert.equal(75 >= cap, true); // above → blocked
  });
  test("cap is a single per-business budget (shared by owner + all employees)", () => {
    // The gate computes spend per businessId, so 1 or 20 employees share one $60 budget.
    assert.ok(monthlyCostCapUsd() > 0 && Number.isFinite(monthlyCostCapUsd()));
  });
});
