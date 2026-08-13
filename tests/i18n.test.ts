import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LOCALES, DEFAULT_LOCALE, isLocale, toLocale, localeFromAcceptLanguage, pickLocale,
} from "../lib/i18n/config";
import { getDictionary, interpolate } from "../lib/i18n/dictionaries";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";
import { refusalAssistant, refusalSearch, routeAssistant, routeSearch } from "../lib/ai/guard";
import { formatCurrency, formatDate, formatNumber } from "../lib/i18n/format";
import { bookingSmsBody, smsSlotLabel } from "../lib/i18n/sms-templates";
import { DeterministicInterpreter } from "../lib/discovery";

const interp = new DeterministicInterpreter(["Kraków", "Warszawa"]);

// ── Locale resolution ────────────────────────────────────────────────────────
describe("locale resolution", () => {
  test("1. default is Polish when nothing is provided", () => {
    assert.equal(DEFAULT_LOCALE, "pl");
    assert.equal(pickLocale({}), "pl");
    assert.equal(pickLocale({ cookie: null, userLocale: null, acceptLanguage: null }), "pl");
  });

  test("2. a manual cookie choice wins over everything", () => {
    assert.equal(pickLocale({ cookie: "de", userLocale: "en", acceptLanguage: "tr" }), "de");
    for (const l of LOCALES) assert.equal(pickLocale({ cookie: l }), l);
  });

  test("3. account preference beats the browser hint", () => {
    assert.equal(pickLocale({ userLocale: "de", acceptLanguage: "en-US,en;q=0.9" }), "de");
  });

  test("4. browser hint is only a secondary fallback", () => {
    assert.equal(pickLocale({ acceptLanguage: "de-DE,de;q=0.9" }), "de");
    assert.equal(pickLocale({ acceptLanguage: "tr-TR" }), "tr");
  });

  test("5. unsupported locales fall back to Polish (never a raw code)", () => {
    assert.equal(isLocale("es"), false);
    assert.equal(isLocale("en"), true);
    assert.equal(toLocale("es"), "pl");
    assert.equal(toLocale(undefined), "pl");
    assert.equal(pickLocale({ cookie: "es", acceptLanguage: "fr-FR" }), "pl");
    assert.equal(localeFromAcceptLanguage("es-ES,es;q=0.9"), "pl");
  });
});

// ── Dictionaries: shape + real translations ──────────────────────────────────
describe("dictionaries", () => {
  test("6. every locale is reachable and distinct where it should be", () => {
    assert.equal(getDictionary("pl").businessNav.today, "Dziś");
    assert.equal(getDictionary("en").businessNav.today, "Today");
    assert.equal(getDictionary("de").businessNav.today, "Heute");
    assert.equal(getDictionary("tr").businessNav.today, "Bugün");
  });

  test("7. an unknown locale returns the Polish dictionary (fallback)", () => {
    // @ts-expect-error — deliberately passing an unsupported code
    assert.equal(getDictionary("es"), getDictionary("pl"));
  });

  test("8. no locale is missing a key present in Polish (structural parity)", () => {
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, path: string) => {
      for (const k of Object.keys(a)) {
        assert.ok(k in b, `missing key ${path}${k}`);
        if (a[k] && typeof a[k] === "object") {
          walk(a[k] as Record<string, unknown>, b[k] as Record<string, unknown>, `${path}${k}.`);
        }
      }
    };
    for (const dict of [en, de, tr]) walk(pl as unknown as Record<string, unknown>, dict as unknown as Record<string, unknown>, "");
  });

  test("9. auth + nav chrome is actually translated (not left Polish)", () => {
    assert.notEqual(en.auth.signIn, pl.auth.signIn);
    assert.equal(de.nav.pricing, "Preise");
    assert.equal(tr.footer.forCustomers, "Müşteriler için");
  });

  test("10. interpolate replaces named tokens and leaves plain text intact", () => {
    assert.equal(interpolate("Kod {n}-cyfrowy", { n: 8 }), "Kod 8-cyfrowy");
    assert.equal(interpolate(en.auth.signingUpAs, { role: "customer" }), "You're signing up as a customer.");
    assert.equal(interpolate("no tokens"), "no tokens");
  });
});

// ── AI multilingual refusals ─────────────────────────────────────────────────
describe("AI refusals in all four languages", () => {
  const offDomain = "napisz moje zadanie domowe z matematyki";
  test("11. assistant refusal copy exists per-locale and matches the dictionary", () => {
    assert.equal(refusalAssistant("pl"), pl.ai.refuseAssistant);
    assert.equal(refusalAssistant("en"), en.ai.refuseAssistant);
    assert.equal(refusalAssistant("de"), de.ai.refuseAssistant);
    assert.equal(refusalAssistant("tr"), tr.ai.refuseAssistant);
  });

  test("12. an off-domain request is refused in the caller's language", () => {
    for (const l of LOCALES) {
      const r = routeAssistant(offDomain, l);
      assert.equal(r.action, "refuse");
      if (r.action === "refuse") assert.equal(r.reply, refusalAssistant(l));
    }
  });

  test("13. customer-search refusal is localized too", () => {
    const r = routeSearch("solve this physics problem", "de");
    assert.equal(r.action, "refuse");
    if (r.action === "refuse") assert.equal(r.reply, refusalSearch("de"));
  });

  test("14. in-domain business questions are never refused (any language)", () => {
    assert.equal(routeAssistant("Umsatz diese Woche?", "de").action, "answer");
    assert.equal(routeAssistant("How are my bookings this week?", "en").action, "answer");
  });
});

// ── Localized category search (canonical mapping) ────────────────────────────
describe("search category aliases map to one canonical category", () => {
  test("15. German 'Friseur' maps to the same query as Polish 'fryzjer'", () => {
    assert.equal(interp.interpret(["fryzjer w Krakowie"]).serviceQuery, "fryzjer");
    assert.equal(interp.interpret(["Friseur in Krakau"]).serviceQuery, "fryzjer");
    assert.equal(interp.interpret(["kuaför Krakau"]).serviceQuery, "fryzjer");
  });

  test("16. a foreign query still resolves the city (stems, not language)", () => {
    assert.equal(interp.interpret(["Friseur in Krakau"]).cityQuery, "Kraków");
  });

  test("17. localized specialty terms hit the same slug", () => {
    assert.equal(interp.interpret(["Massage Warschau"]).specialty, "masaz-relaksacyjny");
    assert.equal(interp.interpret(["masaż relaksacyjny"]).specialty, "masaz-relaksacyjny");
    assert.equal(interp.interpret(["manicure"]).specialty, "manicure-hybrydowy");
  });
});

// ── Locale-aware formatting (display only) ───────────────────────────────────
describe("locale-aware formatting", () => {
  const d = new Date(Date.UTC(2026, 7, 11, 10, 0, 0)); // 11 Aug 2026
  test("18. numbers + currency format per locale, PLN stays the currency", () => {
    assert.notEqual(formatNumber(1234.5, "pl"), formatNumber(1234.5, "en"));
    for (const l of LOCALES) assert.ok(formatCurrency(50, l).includes("zł") || formatCurrency(50, l).includes("PLN"));
  });
  test("19. dates render in the locale's month names", () => {
    assert.match(formatDate(d, "pl"), /sierpnia/);
    assert.match(formatDate(d, "de"), /August/);
    assert.match(formatDate(d, "en"), /August/);
  });
});

// ── Deterministic SMS templates ──────────────────────────────────────────────
describe("deterministic SMS templates", () => {
  const params = { serviceName: "Strzyżenie", businessName: "Salon X", slotLabel: "pon., 14:00" };
  test("20. booking SMS body is localized, brand prefix unchanged, fallback safe", () => {
    assert.match(bookingSmsBody("pl", "confirmed", params), /wizyta potwierdzona/);
    assert.match(bookingSmsBody("en", "confirmed", params), /appointment confirmed/);
    assert.match(bookingSmsBody("de", "confirmed", params), /Termin bestätigt/);
    assert.match(bookingSmsBody("tr", "confirmed", params), /randevu onaylandı/);
    for (const l of LOCALES) assert.ok(bookingSmsBody(l, "reminder", params).startsWith("TermCatch:"));
    // Warsaw-time slot label is produced without throwing.
    assert.ok(smsSlotLabel(new Date(Date.UTC(2026, 7, 11, 12, 0, 0)), "pl").length > 0);
  });
});
