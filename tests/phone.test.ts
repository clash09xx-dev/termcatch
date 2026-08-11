import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../lib/phone";

describe("phone normalization → E.164", () => {
  test("Polish bare 9-digit defaults to +48", () => {
    assert.equal(normalizePhone("123456789"), "+48123456789");
    assert.equal(normalizePhone("48123456789"), "+48123456789");
    assert.equal(normalizePhone("+48 123 456 789"), "+48123456789");
  });

  test("international numbers with a country code pass through (E.164)", () => {
    assert.equal(normalizePhone("+14155550132"), "+14155550132"); // US +1
    assert.equal(normalizePhone("+49 30 1234567"), "+49301234567"); // DE +49
    assert.equal(normalizePhone("+90 555 123 4567"), "+905551234567"); // TR +90
    assert.equal(normalizePhone("+44 7911 123456"), "+447911123456"); // UK +44
  });

  test("strips separators before validating", () => {
    assert.equal(normalizePhone("(48) 123-456-789"), "+48123456789");
  });

  test("junk / too-short → null (never a bad send)", () => {
    assert.equal(normalizePhone("abc"), null);
    assert.equal(normalizePhone("12345"), null);
    assert.equal(normalizePhone(""), null);
  });
});
