import { test, describe, afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  priceIdForPlan,
  planKeyFromPriceId,
  billingConfigured,
  welcomeCouponId,
  welcomeConfigured,
  isWelcomeCode,
  evaluateWelcomeEligibility,
  WELCOME_MAX_REDEMPTIONS,
} from "../lib/subscription";

const PRICE_ENVS = [
  "STRIPE_PRICE_SOLO",
  "STRIPE_PRICE_TEAM",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_SALON_PRO",
  "STRIPE_PRICE_ULTIMATE",
  "STRIPE_SECRET_KEY",
  "STRIPE_COUPON_WELCOME",
];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of PRICE_ENVS) saved[k] = process.env[k];
});
afterEach(() => {
  for (const k of PRICE_ENVS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k]!;
  }
});

describe("Stripe Price ID resolution — env only, never invented", () => {
  test("priceIdForPlan returns null unless a real price_ id is set", () => {
    delete process.env.STRIPE_PRICE_SOLO;
    assert.equal(priceIdForPlan("SOLO"), null);
    process.env.STRIPE_PRICE_SOLO = "not_a_price";
    assert.equal(priceIdForPlan("SOLO"), null);
    process.env.STRIPE_PRICE_SOLO = "price_solo123";
    assert.equal(priceIdForPlan("SOLO"), "price_solo123");
  });

  test("PRO reads STRIPE_PRICE_SALON_PRO (canonical), falls back to STRIPE_PRICE_PRO", () => {
    delete process.env.STRIPE_PRICE_SALON_PRO;
    process.env.STRIPE_PRICE_PRO = "price_legacy_pro";
    assert.equal(priceIdForPlan("PRO"), "price_legacy_pro"); // fallback
    process.env.STRIPE_PRICE_SALON_PRO = "price_salon_pro";
    assert.equal(priceIdForPlan("PRO"), "price_salon_pro"); // canonical wins
  });

  test("planKeyFromPriceId reverse-maps a configured price to its plan", () => {
    process.env.STRIPE_PRICE_SOLO = "price_s";
    process.env.STRIPE_PRICE_TEAM = "price_t";
    process.env.STRIPE_PRICE_SALON_PRO = "price_p";
    process.env.STRIPE_PRICE_ULTIMATE = "price_u";
    assert.equal(planKeyFromPriceId("price_s"), "SOLO");
    assert.equal(planKeyFromPriceId("price_t"), "TEAM");
    assert.equal(planKeyFromPriceId("price_p"), "PRO");
    assert.equal(planKeyFromPriceId("price_u"), "ULTIMATE");
    assert.equal(planKeyFromPriceId("price_unknown"), null);
    assert.equal(planKeyFromPriceId(null), null);
  });

  test("billingConfigured needs a live key AND at least one price", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
    process.env.STRIPE_PRICE_SOLO = "price_s";
    assert.equal(billingConfigured(), false); // placeholder key
    process.env.STRIPE_SECRET_KEY = "sk_test_realish";
    assert.equal(billingConfigured(), true);
    delete process.env.STRIPE_PRICE_SOLO;
    delete process.env.STRIPE_PRICE_TEAM;
    delete process.env.STRIPE_PRICE_PRO;
    delete process.env.STRIPE_PRICE_SALON_PRO;
    delete process.env.STRIPE_PRICE_ULTIMATE;
    assert.equal(billingConfigured(), false); // no prices
  });
});

describe("WELCOME coupon config — env only", () => {
  test("welcomeCouponId null unless set to a non-placeholder value", () => {
    delete process.env.STRIPE_COUPON_WELCOME;
    assert.equal(welcomeCouponId(), null);
    process.env.STRIPE_COUPON_WELCOME = "coupon_...";
    assert.equal(welcomeCouponId(), null);
    process.env.STRIPE_COUPON_WELCOME = "WELCOME3M";
    assert.equal(welcomeCouponId(), "WELCOME3M");
  });

  test("welcomeConfigured requires billing AND coupon", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_realish";
    process.env.STRIPE_PRICE_SOLO = "price_s";
    delete process.env.STRIPE_COUPON_WELCOME;
    assert.equal(welcomeConfigured(), false);
    process.env.STRIPE_COUPON_WELCOME = "WELCOME3M";
    assert.equal(welcomeConfigured(), true);
  });

  test("isWelcomeCode is case/space-insensitive", () => {
    assert.equal(isWelcomeCode(" welcome "), true);
    assert.equal(isWelcomeCode("WELCOME"), true);
    assert.equal(isWelcomeCode("welcom"), false);
    assert.equal(isWelcomeCode(""), false);
    assert.equal(isWelcomeCode(null), false);
  });
});

describe("evaluateWelcomeEligibility — pure decision", () => {
  const base = { configured: true, codeMatches: true, slotsUsed: 0, cap: WELCOME_MAX_REDEMPTIONS, alreadyRedeemed: false };

  test("eligible when configured, code matches, slots free, not redeemed", () => {
    assert.deepEqual(evaluateWelcomeEligibility(base), { eligible: true });
  });
  test("bad_code when the code does not match", () => {
    assert.deepEqual(evaluateWelcomeEligibility({ ...base, codeMatches: false }), { eligible: false, reason: "bad_code" });
  });
  test("not_configured when coupon/billing missing", () => {
    assert.deepEqual(evaluateWelcomeEligibility({ ...base, configured: false }), { eligible: false, reason: "not_configured" });
  });
  test("already_redeemed takes priority over remaining slots", () => {
    assert.deepEqual(evaluateWelcomeEligibility({ ...base, alreadyRedeemed: true }), { eligible: false, reason: "already_redeemed" });
  });
  test("sold_out at the cap", () => {
    assert.deepEqual(evaluateWelcomeEligibility({ ...base, slotsUsed: WELCOME_MAX_REDEMPTIONS }), { eligible: false, reason: "sold_out" });
    assert.equal(evaluateWelcomeEligibility({ ...base, slotsUsed: WELCOME_MAX_REDEMPTIONS - 1 }).eligible, true);
  });
});
