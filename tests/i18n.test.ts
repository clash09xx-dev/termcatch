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
import { DeterministicInterpreter, nextQuestion } from "../lib/discovery";
import { LOCALE_CODE } from "../lib/i18n/config";
import { buildSystemPrompt } from "../lib/ai/system-prompt";
import { categoryLabelFor } from "../lib/categories";
import { renderInsights } from "../lib/ai/insights";
import type { StructuredInsight } from "../lib/ai/insights-types";

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

// ── Owner AI answers in the selected locale (hard directive in the prompt) ────
describe("owner assistant language directive", () => {
  const args = { businessName: "Salon X", contextBlock: "..." };
  test("21. the system prompt names the target language (per locale)", () => {
    assert.match(buildSystemPrompt({ ...args, locale: "pl" }), /po polsku/);
    assert.match(buildSystemPrompt({ ...args, locale: "en" }), /in English/);
    assert.match(buildSystemPrompt({ ...args, locale: "de" }), /auf Deutsch/);
    assert.match(buildSystemPrompt({ ...args, locale: "tr" }), /Türkçe/);
  });
  test("22. the directive is repeated (first + last) and unchanged guardrails remain", () => {
    const p = buildSystemPrompt({ ...args, locale: "en" });
    assert.ok(p.indexOf("in English") !== p.lastIndexOf("in English")); // appears at least twice
    assert.match(p, /Bezpieczeństwo/); // security section is still present (guardrails intact)
  });
});

// ── Customer search: deterministic + localized (real language, not hardcoded) ─
describe("search discovery is locale-aware", () => {
  test("23. discovery questions come from the dictionary per locale", () => {
    const f = interp.interpret(["dobry fryzjer"]); // missing city
    assert.equal(nextQuestion(f, pl.search), pl.search.askCity);
    assert.equal(nextQuestion(f, en.search), en.search.askCity);
    assert.equal(nextQuestion(f, de.search), de.search.askCity);
    assert.equal(nextQuestion(f, tr.search), tr.search.askCity);
  });
  test("24. search copy is genuinely translated (not left Polish)", () => {
    assert.notEqual(en.search.greeting, pl.search.greeting);
    assert.notEqual(de.search.noResults, pl.search.noResults);
    assert.match(interpolate(en.search.foundOne, { city: "Kraków", what: "", time: "", n: 1 }), /Found 1 matching salon in Kraków/);
  });
});

// ── Fakturownia UI is fully localized (codes → dict, no raw Polish) ───────────
describe("Fakturownia UI localization", () => {
  const CODES = [
    "okConnected", "okDisconnected", "okTest", "errNoAccess", "errEncryption",
    "errAccountRequired", "errAccountInvalid", "errTokenRequired", "errTokenShort",
    "errNotConnected", "errInvalidToken", "errNoPermission", "errNotFound",
    "errRateLimited", "errUnavailable", "errTimeout", "errNetwork", "errGeneric",
  ] as const;
  test("25. every result/error code has copy in all four languages", () => {
    for (const l of LOCALES) {
      const f = getDictionary(l).fakturownia;
      for (const k of CODES) assert.ok(typeof f[k] === "string" && f[k].length > 0, `${l}.fakturownia.${k}`);
    }
    // and the section + key controls are translated (not Polish under EN)
    assert.equal(en.fakturownia.section, "Integrations");
    assert.equal(de.fakturownia.connect, "Konto verbinden");
    assert.equal(tr.fakturownia.disconnect, "Bağlantıyı kes");
  });
});

// ── Compact language control uses standard codes (never "ANG") ───────────────
describe("mobile language codes", () => {
  test("26. codes are PL/EN/DE/TR — never ANG", () => {
    assert.deepEqual(LOCALES.map((l) => LOCALE_CODE[l]), ["PL", "EN", "DE", "TR"]);
    for (const l of LOCALES) assert.notEqual(LOCALE_CODE[l], "ANG");
  });
});

// ── Category labels are localized (canonical id unchanged) ───────────────────
describe("category labels", () => {
  test("27. visible categories translate; internal id is language-neutral", () => {
    assert.equal(categoryLabelFor("HAIR_SALON", "pl"), "Fryzjer");
    assert.equal(categoryLabelFor("HAIR_SALON", "en"), "Hair salon");
    assert.equal(categoryLabelFor("HAIR_SALON", "de"), "Friseur");
    assert.equal(categoryLabelFor("HAIR_SALON", "tr"), "Kuaför");
    assert.equal(categoryLabelFor("BARBER", "de"), "Barbershop");
  });
  test("28. unknown / hidden category falls back (never a raw crash)", () => {
    assert.equal(categoryLabelFor("NOPE_XYZ", "en"), "NOPE_XYZ");
  });
});

// ── Deterministic insights render per-locale from the neutral structured form ─
describe("insights localization", () => {
  const sample: StructuredInsight[] = [
    { id: "revenue-up", type: "revenue-up", category: "revenue", severity: "info", metric: "+12%", vars: { pct: 12 }, ctaHref: "" },
    { id: "inactive-clients", type: "inactive-clients", category: "clients", severity: "opportunity", vars: { count: 7 }, ctaKey: "prepareCampaign", ctaHref: "/x" },
  ];
  test("29. same structured insight renders in the requested language", () => {
    const pl = renderInsights(sample, getDictionary("pl"));
    const en = renderInsights(sample, getDictionary("en"));
    const de = renderInsights(sample, getDictionary("de"));
    assert.match(pl[0].title, /Przychód rośnie/);
    assert.match(en[0].title, /Revenue is growing/);
    assert.match(de[0].title, /Umsatz steigt/);
    assert.match(en[0].body, /12% higher/);            // vars interpolated
    assert.equal(en[1].cta?.label, "Prepare a campaign"); // localized CTA label
  });
});

// ── AI proposal preview labels are localized (schema stays canonical) ────────
describe("AI proposal previews", () => {
  test("30. proposal labels translated (no Polish under EN/DE/TR)", () => {
    assert.equal(pl.proposals.issueInvoice, "Wystaw fakturę");
    assert.equal(en.proposals.issueInvoice, "Issue invoice");
    assert.equal(de.proposals.buyer, "Käufer");
    assert.equal(tr.proposals.confirmBooking, "Randevuyu onayla");
  });
});

// ── Accessibility labels are localized ───────────────────────────────────────
describe("aria labels", () => {
  test("31. shared a11y strings are translated", () => {
    assert.equal(en.a11y.close, "Close");
    assert.equal(de.a11y.showPassword, "Passwort anzeigen");
    assert.equal(tr.a11y.commandPalette, "Komut paletini aç (Cmd+K)");
    assert.match(interpolate(en.a11y.otpDigit, { i: 2, n: 8 }), /Digit 2 of 8/);
  });
});
