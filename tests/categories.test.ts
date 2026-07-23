import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ServiceCategory } from "@prisma/client";
import {
  SERVICE_CATEGORY_VALUES,
  parseCategoryParam,
  visibleCategories,
} from "../lib/categories";

// Regression guard for the /search Turbopack crash: lib/categories.ts must not
// import a Prisma enum VALUE (only the type), so client bundles stay clean. The
// client-safe SERVICE_CATEGORY_VALUES list replaces that runtime value and must
// stay perfectly in sync with the real enum — verified here at runtime, and by
// the compile-time drift guards inside lib/categories.ts.

describe("client-safe category list matches the Prisma enum", () => {
  test("every Prisma ServiceCategory is present in SERVICE_CATEGORY_VALUES", () => {
    const listed = new Set<string>(SERVICE_CATEGORY_VALUES);
    for (const value of Object.values(ServiceCategory)) {
      assert.ok(listed.has(value), `missing category in client-safe list: ${value}`);
    }
  });
  test("SERVICE_CATEGORY_VALUES has no extra/unknown members", () => {
    const enumSet = new Set<string>(Object.values(ServiceCategory));
    for (const value of SERVICE_CATEGORY_VALUES) {
      assert.ok(enumSet.has(value), `unknown category in client-safe list: ${value}`);
    }
  });
  test("counts are identical (no silent drift)", () => {
    assert.equal(SERVICE_CATEGORY_VALUES.length, Object.values(ServiceCategory).length);
  });
});

describe("parseCategoryParam still resolves enum names, canonical + legacy slugs", () => {
  test("enum name (any case)", () => {
    assert.equal(parseCategoryParam("HAIR_SALON"), "HAIR_SALON");
    assert.equal(parseCategoryParam("hair_salon"), "HAIR_SALON");
  });
  test("canonical slug", () => {
    assert.equal(parseCategoryParam("fryzjer"), "HAIR_SALON");
    assert.equal(parseCategoryParam("paznokcie"), "NAIL_SALON");
  });
  test("legacy slug alias", () => {
    assert.equal(parseCategoryParam("barbershop"), "BARBER");
    assert.equal(parseCategoryParam("beauty_salon"), "BEAUTY_CLINIC");
  });
  test("unknown → undefined (treated as no filter)", () => {
    assert.equal(parseCategoryParam("not-a-category"), undefined);
    assert.equal(parseCategoryParam(""), undefined);
    assert.equal(parseCategoryParam(undefined), undefined);
  });
});

describe("visibleCategories hides medical, keeps aesthetic BEAUTY_CLINIC", () => {
  test("BEAUTY_CLINIC visible, DENTIST hidden", () => {
    const values = visibleCategories().map((c) => c.value);
    assert.ok(values.includes("BEAUTY_CLINIC"));
    assert.ok(!values.includes("DENTIST"));
  });
});
