import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateForPublication, type PublicationCheckInput } from "../lib/publication";

const complete: PublicationCheckInput = {
  name: "Salon Testowy",
  category: "HAIR_SALON",
  city: "Kraków",
  address: "ul. Kwiatowa 5",
  phone: "+48123456789",
  email: "kontakt@salon.pl",
  activeServices: [{ price: 120, duration: 60 }],
  activeEmployees: 0, // intentionally 0 — see solo-salon test
  openDays: 5,
};

describe("validateForPublication — the auto-publish gate", () => {
  test("a complete, bookable profile passes (auto-publishes)", () => {
    assert.equal(validateForPublication(complete).ok, true);
  });

  test("a solo salon with NO employee record still passes (books via 'dowolny specjalista')", () => {
    assert.equal(validateForPublication({ ...complete, activeEmployees: 0 }).ok, true);
    assert.ok(!validateForPublication(complete).requirements.some((r) => r.key === "employee"));
  });

  test("no active service → not publishable", () => {
    const r = validateForPublication({ ...complete, activeServices: [] });
    assert.equal(r.ok, false);
    assert.ok(r.missing.some((m) => m.key === "service"));
  });

  test("a 0 zł service → not publishable (not treated as 'free')", () => {
    const r = validateForPublication({ ...complete, activeServices: [{ price: 0, duration: 60 }] });
    assert.equal(r.ok, false);
    assert.ok(r.missing.some((m) => m.key === "price"));
  });

  test("no open working-hours day → not publishable", () => {
    const r = validateForPublication({ ...complete, openDays: 0 });
    assert.equal(r.ok, false);
    assert.ok(r.missing.some((m) => m.key === "hours"));
  });

  test("no contact (no phone, no email) → not publishable", () => {
    const r = validateForPublication({ ...complete, phone: null, email: null });
    assert.equal(r.ok, false);
    assert.ok(r.missing.some((m) => m.key === "contact"));
  });

  test("missing address → not publishable (incomplete profiles can't leak)", () => {
    const r = validateForPublication({ ...complete, address: null });
    assert.equal(r.ok, false);
  });
});
