import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateServicePricing, validateAddonPricing } from "../lib/service-validation";

// Free services are not a supported product feature — a service price must be
// > 0. These guard the server action (backstop) and the client form.

describe("validateServicePricing — service price must be > 0", () => {
  test("valid paid service passes", () => {
    assert.equal(validateServicePricing({ price: 120, duration: 60 }), null);
  });
  test("zero price rejected (the audit-salon bug)", () => {
    assert.equal(validateServicePricing({ price: 0 }), "Cena usługi musi być większa niż 0 zł.");
  });
  test("negative price rejected", () => {
    assert.equal(validateServicePricing({ price: -10 }), "Cena usługi musi być większa niż 0 zł.");
  });
  test("non-finite price rejected", () => {
    assert.equal(validateServicePricing({ price: NaN }), "Cena usługi musi być większa niż 0 zł.");
    assert.equal(validateServicePricing({ price: Infinity }), "Cena usługi musi być większa niż 0 zł.");
  });
  test("zero / negative duration rejected", () => {
    assert.equal(validateServicePricing({ price: 50, duration: 0 }), "Czas trwania musi być większy niż 0 minut.");
    assert.equal(validateServicePricing({ price: 50, duration: -30 }), "Czas trwania musi być większy niż 0 minut.");
  });
});

describe("validateServicePricing — discounted price rules", () => {
  test("discount below regular passes", () => {
    assert.equal(validateServicePricing({ price: 100, discountedPrice: 80 }), null);
  });
  test("discount cannot be negative or zero", () => {
    assert.equal(validateServicePricing({ price: 100, discountedPrice: 0 }), "Cena promocyjna musi być większa niż 0 zł.");
    assert.equal(validateServicePricing({ price: 100, discountedPrice: -5 }), "Cena promocyjna musi być większa niż 0 zł.");
  });
  test("discount cannot exceed the regular price", () => {
    assert.equal(validateServicePricing({ price: 100, discountedPrice: 120 }), "Cena promocyjna nie może być wyższa niż cena regularna.");
  });
  test("no discount is fine", () => {
    assert.equal(validateServicePricing({ price: 100, discountedPrice: null }), null);
    assert.equal(validateServicePricing({ price: 100 }), null);
  });
});

describe("validateServicePricing — deposit + partial updates", () => {
  test("deposit must be > 0 and <= price when required", () => {
    assert.equal(validateServicePricing({ price: 100, requiresDeposit: true, depositAmount: 0 }), "Zaliczka musi być większa niż 0 zł.");
    assert.equal(validateServicePricing({ price: 100, requiresDeposit: true, depositAmount: 150 }), "Zaliczka nie może być wyższa niż cena usługi.");
    assert.equal(validateServicePricing({ price: 100, requiresDeposit: true, depositAmount: 30 }), null);
  });
  test("partial update with no price (status toggle) is allowed", () => {
    assert.equal(validateServicePricing({ isActive: false } as never), null);
    assert.equal(validateServicePricing({}), null);
  });
});

describe("validateAddonPricing — non-negative increments (0 allowed)", () => {
  test("zero increment is allowed (add-on may add only time or only cost)", () => {
    assert.equal(validateAddonPricing({ priceIncrease: 0, durationIncrease: 30 }), null);
    assert.equal(validateAddonPricing({ priceIncrease: 40, durationIncrease: 0 }), null);
  });
  test("negative / non-finite increments rejected", () => {
    assert.equal(validateAddonPricing({ priceIncrease: -5 }), "Dopłata nie może być ujemna.");
    assert.equal(validateAddonPricing({ durationIncrease: -1 }), "Czas dodatku nie może być ujemny.");
    assert.equal(validateAddonPricing({ priceIncrease: NaN }), "Dopłata nie może być ujemna.");
  });
});
