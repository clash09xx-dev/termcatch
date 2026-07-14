import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAddonLine,
  evaluateCoupon,
  computeBookingTotals,
  money,
  type AddonDef,
  type CouponDef,
} from "../lib/booking-pricing";

const addon = (over: Partial<AddonDef> = {}): AddonDef => ({
  id: "a1",
  name: "Przedłużenie",
  priceIncrease: 40,
  durationIncrease: 30,
  isActive: true,
  hasQuantity: false,
  minQuantity: 1,
  maxQuantity: 1,
  defaultQuantity: 1,
  ...over,
});

const coupon = (over: Partial<CouponDef> = {}): CouponDef => ({
  code: "WELCOME20",
  type: "PERCENTAGE",
  value: 20,
  minOrderValue: null,
  maxUses: null,
  usesCount: 0,
  validFrom: new Date("2020-01-01"),
  validUntil: new Date("2999-01-01"),
  isActive: true,
  ...over,
});

const NOW = new Date("2026-07-14T12:00:00Z");

describe("resolveAddonLine — add-on validation", () => {
  test("valid single add-on (no quantity) → price & duration from the definition", () => {
    const line = resolveAddonLine(addon(), 1);
    assert.equal(line.unitPrice, 40);
    assert.equal(line.quantity, 1);
    assert.equal(line.totalPrice, 40);
    assert.equal(line.unitDuration, 30);
    assert.equal(line.totalDuration, 30);
  });

  test("quantity add-on within range multiplies price and duration", () => {
    const line = resolveAddonLine(addon({ hasQuantity: true, minQuantity: 1, maxQuantity: 5, priceIncrease: 10, durationIncrease: 0 }), 3);
    assert.equal(line.quantity, 3);
    assert.equal(line.totalPrice, 30);
    assert.equal(line.totalDuration, 0);
  });

  test("inactive add-on is rejected", () => {
    assert.throws(() => resolveAddonLine(addon({ isActive: false }), 1), /nieaktywny/);
  });

  test("quantity below minimum is rejected", () => {
    assert.throws(() => resolveAddonLine(addon({ hasQuantity: true, minQuantity: 2, maxQuantity: 5 }), 1), /musi być między/);
  });

  test("quantity above maximum is rejected (no silent clamp)", () => {
    assert.throws(() => resolveAddonLine(addon({ hasQuantity: true, minQuantity: 1, maxQuantity: 3 }), 9), /musi być między/);
  });

  test("non-integer quantity is rejected", () => {
    assert.throws(() => resolveAddonLine(addon({ hasQuantity: true, minQuantity: 1, maxQuantity: 5 }), 2.5), /Nieprawidłowa ilość/);
  });

  test("quantity is forced to 1 when the add-on has no quantity selection (ignores a manipulated qty)", () => {
    const line = resolveAddonLine(addon({ hasQuantity: false }), 99);
    assert.equal(line.quantity, 1);
    assert.equal(line.totalPrice, 40);
  });
});

describe("evaluateCoupon — discount rules", () => {
  test("valid percentage coupon", () => {
    const r = evaluateCoupon(coupon({ type: "PERCENTAGE", value: 20 }), 100, NOW);
    assert.equal(r.valid, true);
    if (r.valid) assert.equal(r.discountAmount, 20);
  });

  test("valid fixed coupon", () => {
    const r = evaluateCoupon(coupon({ type: "FIXED_AMOUNT", value: 30 }), 100, NOW);
    assert.equal(r.valid, true);
    if (r.valid) assert.equal(r.discountAmount, 30);
  });

  test("inactive coupon rejected", () => {
    const r = evaluateCoupon(coupon({ isActive: false }), 100, NOW);
    assert.equal(r.valid, false);
  });

  test("expired coupon rejected", () => {
    const r = evaluateCoupon(coupon({ validUntil: new Date("2026-07-10") }), 100, NOW);
    assert.equal(r.valid, false);
    if (!r.valid) assert.match(r.reason, /wygasł/);
  });

  test("not-yet-active coupon rejected", () => {
    const r = evaluateCoupon(coupon({ validFrom: new Date("2026-08-01") }), 100, NOW);
    assert.equal(r.valid, false);
    if (!r.valid) assert.match(r.reason, /jeszcze nie obowiązuje/);
  });

  test("exhausted usage-limit coupon rejected", () => {
    const r = evaluateCoupon(coupon({ maxUses: 5, usesCount: 5 }), 100, NOW);
    assert.equal(r.valid, false);
    if (!r.valid) assert.match(r.reason, /Limit użyć/);
  });

  test("subtotal below minOrderValue rejected", () => {
    const r = evaluateCoupon(coupon({ minOrderValue: 150 }), 100, NOW);
    assert.equal(r.valid, false);
  });

  test("fixed discount greater than subtotal is clamped (no negative total)", () => {
    const r = evaluateCoupon(coupon({ type: "FIXED_AMOUNT", value: 500 }), 100, NOW);
    assert.equal(r.valid, true);
    if (r.valid) assert.equal(r.discountAmount, 100);
  });

  test("100% percentage discount clamps to subtotal", () => {
    const r = evaluateCoupon(coupon({ type: "PERCENTAGE", value: 100 }), 80, NOW);
    if (r.valid) assert.equal(r.discountAmount, 80);
  });
});

describe("computeBookingTotals — final amount & duration", () => {
  test("base + add-ons, no coupon", () => {
    const lines = [resolveAddonLine(addon({ priceIncrease: 40, durationIncrease: 30 }), 1)];
    const t = computeBookingTotals({ basePrice: 100, baseDuration: 60, addonLines: lines });
    assert.equal(t.subtotal, 140);
    assert.equal(t.finalTotal, 140);
    assert.equal(t.totalDuration, 90);
  });

  test("multiple add-ons with quantity, final duration is base + all add-on durations", () => {
    const lines = [
      resolveAddonLine(addon({ id: "ext", priceIncrease: 40, durationIncrease: 30 }), 1),
      resolveAddonLine(addon({ id: "art", hasQuantity: true, minQuantity: 1, maxQuantity: 5, priceIncrease: 20, durationIncrease: 15 }), 2),
    ];
    const t = computeBookingTotals({ basePrice: 100, baseDuration: 60, addonLines: lines });
    // 100 + 40 + (20*2) = 180 ; 60 + 30 + (15*2) = 120
    assert.equal(t.subtotal, 180);
    assert.equal(t.totalDuration, 120);
  });

  test("coupon discount applied to combined subtotal (service + add-ons)", () => {
    const lines = [resolveAddonLine(addon({ priceIncrease: 40, durationIncrease: 30 }), 1)];
    const evalr = evaluateCoupon(coupon({ type: "PERCENTAGE", value: 10 }), 140, NOW);
    assert.equal(evalr.valid, true);
    const t = computeBookingTotals({
      basePrice: 100,
      baseDuration: 60,
      addonLines: lines,
      discountAmount: evalr.valid ? evalr.discountAmount : 0,
    });
    assert.equal(t.subtotal, 140);
    assert.equal(t.discountAmount, 14);
    assert.equal(t.finalTotal, 126);
  });

  test("final total never goes negative", () => {
    const t = computeBookingTotals({ basePrice: 50, baseDuration: 60, addonLines: [], discountAmount: 999 });
    assert.equal(t.finalTotal, 0);
  });

  test("money() rounds to 2 decimals", () => {
    assert.equal(money(19.999), 20);
    assert.equal(money(10.005), 10.01);
  });
});
