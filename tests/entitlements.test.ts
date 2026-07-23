import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PLAN_ENTITLEMENTS,
  planKeyFromEnum,
  entitlementsForEnum,
  withinLimit,
  requiredPlanFor,
  planLimitInfo,
} from "../lib/entitlements";

describe("plan entitlement table — the non-negotiable limits", () => {
  test("employee limits: Solo 1 / Zespół 4 / Salon Pro 15 / Ultimate unlimited", () => {
    assert.equal(PLAN_ENTITLEMENTS.SOLO.maxEmployees, 1);
    assert.equal(PLAN_ENTITLEMENTS.TEAM.maxEmployees, 4);
    assert.equal(PLAN_ENTITLEMENTS.PRO.maxEmployees, 15);
    assert.equal(PLAN_ENTITLEMENTS.ULTIMATE.maxEmployees, null);
  });
  test("location limits: Solo 1 / Zespół 1 / Salon Pro 2 / Ultimate unlimited", () => {
    assert.equal(PLAN_ENTITLEMENTS.SOLO.maxLocations, 1);
    assert.equal(PLAN_ENTITLEMENTS.TEAM.maxLocations, 1);
    assert.equal(PLAN_ENTITLEMENTS.PRO.maxLocations, 2);
    assert.equal(PLAN_ENTITLEMENTS.ULTIMATE.maxLocations, null);
  });
  test("FREE defaults to the conservative Solo baseline (1/1)", () => {
    assert.equal(PLAN_ENTITLEMENTS.FREE.maxEmployees, 1);
    assert.equal(PLAN_ENTITLEMENTS.FREE.maxLocations, 1);
  });
});

describe("enum → plan mapping (until Stripe stores the precise plan)", () => {
  test("maps the coarse DB enum conservatively", () => {
    assert.equal(planKeyFromEnum("FREE"), "FREE");
    assert.equal(planKeyFromEnum("STARTER"), "SOLO");
    assert.equal(planKeyFromEnum("PROFESSIONAL"), "PRO");
    assert.equal(planKeyFromEnum("ENTERPRISE"), "ULTIMATE");
    assert.equal(planKeyFromEnum(null), "FREE");
    assert.equal(entitlementsForEnum("ENTERPRISE").maxEmployees, null);
  });
});

describe("withinLimit — server-side boundary checks", () => {
  test("Solo blocks a 2nd active specialist", () => {
    assert.equal(withinLimit("SOLO", "employee", 1), true);
    assert.equal(withinLimit("SOLO", "employee", 2), false);
  });
  test("Zespół allows up to 4 specialists, blocks the 5th", () => {
    assert.equal(withinLimit("TEAM", "employee", 4), true);
    assert.equal(withinLimit("TEAM", "employee", 5), false);
  });
  test("Salon Pro allows up to 15 specialists + 2 locations", () => {
    assert.equal(withinLimit("PRO", "employee", 15), true);
    assert.equal(withinLimit("PRO", "employee", 16), false);
    assert.equal(withinLimit("PRO", "location", 2), true);
    assert.equal(withinLimit("PRO", "location", 3), false);
  });
  test("Ultimate is unlimited for both", () => {
    assert.equal(withinLimit("ULTIMATE", "employee", 9999), true);
    assert.equal(withinLimit("ULTIMATE", "location", 9999), true);
  });
});

describe("requiredPlanFor — upgrade targeting", () => {
  test("a 2nd specialist needs Zespół; a 5th needs Salon Pro; a 16th needs Ultimate", () => {
    assert.equal(requiredPlanFor("employee", 2), "TEAM");
    assert.equal(requiredPlanFor("employee", 5), "PRO");
    assert.equal(requiredPlanFor("employee", 16), "ULTIMATE");
  });
  test("a 2nd location needs Salon Pro; a 3rd needs Ultimate", () => {
    assert.equal(requiredPlanFor("location", 2), "PRO");
    assert.equal(requiredPlanFor("location", 3), "ULTIMATE");
  });
});

describe("planLimitInfo — the upgrade dialog payload", () => {
  test("Solo at 1 specialist points to Zespół as the required upgrade", () => {
    const info = planLimitInfo("employee", "SOLO", 1);
    assert.equal(info.used, 1);
    assert.equal(info.limit, 1);
    assert.equal(info.requiredPlan, "TEAM");
    assert.equal(info.requiredPlanLabel, "Zespół");
    assert.equal(info.planLabel, "Solo");
  });
  test("Ultimate never yields a required upgrade", () => {
    const info = planLimitInfo("employee", "ULTIMATE", 100);
    assert.equal(info.requiredPlan, null);
  });
});
