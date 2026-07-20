import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  TRIAL_DAYS,
  trialDaysFor,
  mapStripeStatus,
  normalizePlanKey,
  planKeyToEnum,
  priceIdForPlan,
  billingConfigured,
} from "../lib/subscription";

describe("trial length — exactly 7 days, with repeat-trial abuse guard", () => {
  test("standard trial is 7 days", () => assert.equal(TRIAL_DAYS, 7));
  test("first-time business gets 7 trial days", () => assert.equal(trialDaysFor(false), 7));
  test("a business that already used a trial gets 0 (no repeat free trial)", () => {
    assert.equal(trialDaysFor(true), 0);
  });
});

describe("mapStripeStatus — honest state mapping", () => {
  test("maps every documented Stripe status", () => {
    assert.equal(mapStripeStatus("trialing"), "TRIALING");
    assert.equal(mapStripeStatus("active"), "ACTIVE");
    assert.equal(mapStripeStatus("past_due"), "PAST_DUE");
    assert.equal(mapStripeStatus("unpaid"), "PAST_DUE");
    assert.equal(mapStripeStatus("incomplete"), "PAST_DUE");
    assert.equal(mapStripeStatus("canceled"), "CANCELLED");
    assert.equal(mapStripeStatus("incomplete_expired"), "CANCELLED");
    assert.equal(mapStripeStatus("paused"), "PAUSED");
  });
  test("unknown status falls back to PAST_DUE (never silently active)", () => {
    assert.equal(mapStripeStatus("something_new"), "PAST_DUE");
  });
});

describe("plan resolution", () => {
  test("normalizePlanKey accepts known plans (any case), rejects others", () => {
    assert.equal(normalizePlanKey("solo"), "SOLO");
    assert.equal(normalizePlanKey("PRO"), "PRO");
    assert.equal(normalizePlanKey("ultimate"), "ULTIMATE");
    assert.equal(normalizePlanKey("enterprise"), null);
    assert.equal(normalizePlanKey(""), null);
  });
  test("planKeyToEnum maps to a valid SubscriptionPlan enum value", () => {
    assert.equal(planKeyToEnum("SOLO"), "STARTER");
    assert.equal(planKeyToEnum("PRO"), "PROFESSIONAL");
    assert.equal(planKeyToEnum("ULTIMATE"), "ENTERPRISE");
  });
});

describe("Stripe Price IDs are never invented", () => {
  test("priceIdForPlan is null when the env var is unset or not a price_ id", () => {
    delete process.env.STRIPE_PRICE_SOLO;
    assert.equal(priceIdForPlan("SOLO"), null);
    process.env.STRIPE_PRICE_SOLO = "not-a-price";
    assert.equal(priceIdForPlan("SOLO"), null);
    process.env.STRIPE_PRICE_SOLO = "price_123abc";
    assert.equal(priceIdForPlan("SOLO"), "price_123abc");
    delete process.env.STRIPE_PRICE_SOLO;
  });
  test("billingConfigured is false without a real key + a price", () => {
    const prev = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_placeholder";
    delete process.env.STRIPE_PRICE_SOLO;
    delete process.env.STRIPE_PRICE_TEAM;
    delete process.env.STRIPE_PRICE_PRO;
    delete process.env.STRIPE_PRICE_ULTIMATE;
    assert.equal(billingConfigured(), false);
    if (prev === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prev;
  });
});
