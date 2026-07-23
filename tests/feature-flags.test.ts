import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { entitlementsEnforced } from "../lib/entitlements";
import { multiLocationEnabled } from "../lib/multi-location";
import { PLAN_CATALOG } from "../lib/plan-catalog";
import { PLAN_KEYS } from "../lib/subscription";

// These flags gate billing-risky and architecture-risky behaviour. Their
// DEFAULT-OFF contract is a safety guarantee: existing salons keep working.

describe("entitlementsEnforced — default OFF is the safety guarantee", () => {
  const prev = process.env.ENTITLEMENTS_ENFORCED;
  afterEach(() => {
    if (prev === undefined) delete process.env.ENTITLEMENTS_ENFORCED;
    else process.env.ENTITLEMENTS_ENFORCED = prev;
  });

  test("off when unset", () => {
    delete process.env.ENTITLEMENTS_ENFORCED;
    assert.equal(entitlementsEnforced(), false);
  });
  test("off for any value that is not exactly 'true'", () => {
    process.env.ENTITLEMENTS_ENFORCED = "1";
    assert.equal(entitlementsEnforced(), false);
    process.env.ENTITLEMENTS_ENFORCED = "TRUE";
    assert.equal(entitlementsEnforced(), false);
    process.env.ENTITLEMENTS_ENFORCED = "false";
    assert.equal(entitlementsEnforced(), false);
  });
  test("on only when exactly 'true'", () => {
    process.env.ENTITLEMENTS_ENFORCED = "true";
    assert.equal(entitlementsEnforced(), true);
  });
});

describe("multiLocationEnabled — default OFF keeps single-location behaviour", () => {
  const prev = process.env.MULTI_LOCATION_ENABLED;
  afterEach(() => {
    if (prev === undefined) delete process.env.MULTI_LOCATION_ENABLED;
    else process.env.MULTI_LOCATION_ENABLED = prev;
  });

  test("off when unset", () => {
    delete process.env.MULTI_LOCATION_ENABLED;
    assert.equal(multiLocationEnabled(), false);
  });
  test("on only when exactly 'true'", () => {
    process.env.MULTI_LOCATION_ENABLED = "true";
    assert.equal(multiLocationEnabled(), true);
    process.env.MULTI_LOCATION_ENABLED = "yes";
    assert.equal(multiLocationEnabled(), false);
  });
});

describe("plan catalogue integrity", () => {
  test("every catalogue entry is a real billable plan key", () => {
    for (const entry of PLAN_CATALOG) {
      assert.ok(PLAN_KEYS.includes(entry.key), `${entry.key} must be a billable plan`);
      assert.ok(entry.name && entry.price && entry.features.length > 0);
    }
  });
  test("covers all four billable plans, exactly one highlighted", () => {
    assert.equal(PLAN_CATALOG.length, PLAN_KEYS.length);
    assert.equal(PLAN_CATALOG.filter((p) => p.highlight).length, 1);
  });
});
