import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildBusinessSearchWhere, sanitizeQuery, resolveCitySpellings, MAX_QUERY_LEN } from "../lib/search";
import { resolveQueryCategories } from "../lib/categories";
import { normalizeText } from "../lib/discovery";

// Helper: does this where's AND array contain an OR clause with the given predicate?
function orClauses(where: Record<string, unknown>): Record<string, unknown>[] {
  const and = (where.AND as { OR?: Record<string, unknown>[] }[]) ?? [];
  return and.flatMap((c) => c.OR ?? []);
}

describe("resolveQueryCategories — synonym → category enum", () => {
  test("'fryzjer' resolves to HAIR_SALON", () => {
    assert.ok(resolveQueryCategories(normalizeText("fryzjer")).includes("HAIR_SALON"));
  });
  test("'strzyżenie' and 'włosy' also resolve to HAIR_SALON", () => {
    assert.ok(resolveQueryCategories(normalizeText("strzyżenie")).includes("HAIR_SALON"));
    assert.ok(resolveQueryCategories(normalizeText("włosy")).includes("HAIR_SALON"));
  });
  test("'barber'/'broda' → BARBER; 'manicure'/'hybryda' → NAIL_SALON", () => {
    assert.ok(resolveQueryCategories(normalizeText("broda")).includes("BARBER"));
    assert.ok(resolveQueryCategories(normalizeText("hybryda")).includes("NAIL_SALON"));
  });
  test("medical synonyms are hidden by default (flag off)", () => {
    assert.deepEqual(resolveQueryCategories(normalizeText("stomatolog")), []);
    assert.deepEqual(resolveQueryCategories(normalizeText("dermatolog")), []);
  });
  test("no-match query resolves to no categories", () => {
    assert.deepEqual(resolveQueryCategories(normalizeText("qwertyuiop")), []);
  });
});

describe("city normalization — diacritic-tolerant", () => {
  test("'Krakow' and 'Kraków' both resolve to canonical 'Kraków'", () => {
    assert.ok(resolveCitySpellings("Krakow").includes("Kraków"));
    assert.ok(resolveCitySpellings("Kraków").includes("Kraków"));
  });
  test("unknown city falls back to the raw input", () => {
    assert.deepEqual(resolveCitySpellings("Pcim"), ["Pcim"]);
  });
});

describe("buildBusinessSearchWhere — publication-gated, synonym-aware", () => {
  test("always gated to published + active, medical excluded", () => {
    const w = buildBusinessSearchWhere({});
    assert.equal(w.status, "ACTIVE");
    assert.equal(w.isActive, true);
    const notIn = (w.category as { notIn?: string[] })?.notIn ?? [];
    assert.ok(notIn.includes("GENERAL_PHYSICIAN"));
    assert.ok(notIn.includes("PSYCHOLOGIST"));
  });

  test("'fryzjer' + 'Kraków' finds hair salons by CATEGORY even without the word in the name", () => {
    const w = buildBusinessSearchWhere({ q: "fryzjer", city: "Kraków" });
    const cats = orClauses(w).find((c) => "category" in c) as { category?: { in?: string[] } } | undefined;
    assert.ok(cats?.category?.in?.includes("HAIR_SALON"), "expected category IN clause with HAIR_SALON");
    // city clause preserved
    const cityClause = ((w.AND as { OR?: { city?: unknown }[] }[]) ?? []).some((c) =>
      (c.OR ?? []).some((o) => "city" in o)
    );
    assert.ok(cityClause, "expected a city OR clause");
  });

  test("'fryzjer' + 'Krakow' (no diacritics) resolves the same way", () => {
    const w = buildBusinessSearchWhere({ q: "fryzjer", city: "Krakow" });
    const cats = orClauses(w).find((c) => "category" in c) as { category?: { in?: string[] } } | undefined;
    assert.ok(cats?.category?.in?.includes("HAIR_SALON"));
  });

  test("service-name substring match is included in the OR", () => {
    const w = buildBusinessSearchWhere({ q: "strzyżenie" });
    assert.ok(orClauses(w).some((c) => "services" in c), "expected a services.some clause");
  });

  test("specialty match ('kręcone włosy') targets Business.specialties", () => {
    const w = buildBusinessSearchWhere({ q: "kręcone włosy" });
    assert.ok(orClauses(w).some((c) => "specialties" in c), "expected a specialties clause");
  });

  test("an explicit HIDDEN medical category returns a match-nothing where", () => {
    const w = buildBusinessSearchWhere({ category: "lekarz" });
    // No status gate + an impossible id → yields nothing.
    assert.deepEqual(w, { AND: [{ id: "__none__" }] });
  });

  test("a visible explicit category filters to it", () => {
    const w = buildBusinessSearchWhere({ category: "fryzjer" });
    assert.equal(w.category, "HAIR_SALON");
  });
});

describe("query hardening — untrusted input", () => {
  test("oversized query is capped and never throws", () => {
    const huge = "a".repeat(5000);
    assert.equal(sanitizeQuery(huge).length, MAX_QUERY_LEN);
    assert.doesNotThrow(() => buildBusinessSearchWhere({ q: huge, city: "x".repeat(5000) }));
  });
  test("whitespace is collapsed and trimmed", () => {
    assert.equal(sanitizeQuery("  fryzjer   Kraków  "), "fryzjer Kraków");
  });
});
