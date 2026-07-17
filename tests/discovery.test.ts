import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DeterministicInterpreter, cityMatches, nextQuestion, rankSalons, type RankableSalon } from "../lib/discovery";

const CITIES = ["Warszawa", "Kraków", "Gdańsk"];
const interp = new DeterministicInterpreter(CITIES);

describe("city matching — inflected Polish forms, real cities only", () => {
  test("'Warszawie' → Warszawa; 'Krakowie' → Kraków (diacritics)", () => {
    assert.equal(cityMatches("Warszawa", "warszawie"), true);
    assert.equal(cityMatches("Kraków", "krakowie"), true);
  });
  test("unrelated word never matches", () => {
    assert.equal(cityMatches("Warszawa", "manicure"), false);
  });
});

describe("deterministic interpreter", () => {
  test("the example query yields city + specialty", () => {
    const f = interp.interpret(["Znajdź mi dobry salon w Warszawie, który specjalizuje się w kręconych włosach."]);
    assert.equal(f.cityQuery, "Warszawa");
    assert.equal(f.specialty, "krecone-wlosy");
  });
  test("budget parsed from 'do 200 zł'", () => {
    const f = interp.interpret(["koloryzacja w Krakowie do 200 zł"]);
    assert.equal(f.maxPrice, 200);
    assert.equal(f.specialty, "koloryzacja");
  });
  test("conversation accumulates across turns", () => {
    const f = interp.interpret(["Szukam manicure", "w Gdańsku"]);
    assert.equal(f.cityQuery, "Gdańsk");
    assert.equal(f.specialty, "manicure-hybrydowy");
  });
  test("missing city → asks for city first", () => {
    const f = interp.interpret(["dobry fryzjer"]);
    assert.match(nextQuestion(f) ?? "", /mieście/);
  });
  test("missing service/specialty → asks what they need", () => {
    const f = interp.interpret(["cokolwiek w Warszawie"]);
    assert.match(nextQuestion(f) ?? "", /usługi|specjalizacji/);
  });
});

describe("ranking — real relevance, never pay-to-win", () => {
  const salon = (over: Partial<RankableSalon>): RankableSalon => ({
    slug: "s",
    name: "S",
    city: "Warszawa",
    logoUrl: null,
    averageRating: 0,
    totalReviews: 0,
    specialties: [],
    services: [],
    ...over,
  });

  test("specialty match outranks rating alone", () => {
    const a = salon({ slug: "specialist", specialties: ["krecone-wlosy"], averageRating: 4.0, totalReviews: 5 });
    const b = salon({ slug: "famous", averageRating: 5.0, totalReviews: 100 });
    const out = rankSalons([b, a], { cityQuery: "Warszawa", specialty: "krecone-wlosy" });
    assert.equal(out[0].slug, "specialist");
  });
  test("max 5 results, each with reasons and sponsored:false", () => {
    const many = Array.from({ length: 9 }, (_, i) => salon({ slug: `s${i}`, specialties: ["depilacja"], averageRating: 4, totalReviews: i + 1 }));
    const out = rankSalons(many, { cityQuery: "Warszawa", specialty: "depilacja" });
    assert.equal(out.length, 5);
    assert.ok(out.every((r) => r.reasons.length > 0 && r.sponsored === false));
  });
  test("no fabricated matches: zero-score salons dropped when a specialty was requested", () => {
    const out = rankSalons([salon({ slug: "unrelated", averageRating: 5, totalReviews: 50 })], { cityQuery: "Warszawa", specialty: "krecone-wlosy" });
    assert.equal(out.length, 0);
  });
  test("service-name match counts and is explained", () => {
    const s = salon({ slug: "svc", services: [{ name: "Strzyżenie damskie", price: 120, discountedPrice: null }] });
    const out = rankSalons([s], { cityQuery: "Warszawa", serviceQuery: "strzyzenie" });
    assert.equal(out.length, 1);
    assert.match(out[0].reasons.join(" "), /Strzyżenie damskie/);
  });
});
