import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DeterministicInterpreter, rankSalons, hasFuzzyWord, cityMatches,
  type RankableSalon, type DiscoveryFilters,
} from "../lib/discovery";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";

const DICTS = { pl, en, de, tr };
const read = (p: string) => readFileSync(p, "utf8");
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");

const CITIES = ["Kraków", "krakow", "Krakow", "Warszawa"];
const interp = new DeterministicInterpreter(CITIES);

/** A salon shaped like the real rows: no specialties, service names that do NOT
 *  contain the query word. This is what made the assistant blind. */
const salon = (over: Partial<RankableSalon> & Pick<RankableSalon, "slug" | "name" | "city">): RankableSalon => ({
  logoUrl: null, averageRating: 0, totalReviews: 0, specialties: [],
  description: null, services: [], ...over,
});

const HAIR = salon({
  slug: "studio", name: "Studio Audyt", city: "Kraków", category: "HAIR_SALON",
  services: [{ id: "s1", name: "Strzyżenie damskie", price: 120, discountedPrice: null }],
});
const NAILS = salon({
  slug: "nailup", name: "Nailup", city: "krakow", category: "NAIL_SALON",
  services: [{ id: "s2", name: "Hybryda", price: 90, discountedPrice: null }],
});
const MASSAGE = salon({
  slug: "testowa", name: "Testowa", city: "Krakow", category: "MASSAGE",
  services: [{ id: "s3", name: "mass", price: 200, discountedPrice: null }],
});
const ALL = [HAIR, NAILS, MASSAGE];

// ── BUG 1: the customer search assistant ─────────────────────────────────────

describe("1. customer AI assistant finds real salons", () => {
  test("a plain Polish query returns the matching salon (the reported failure)", () => {
    const f = interp.interpret(["jakich fryzjerow polecasz", "krakow"]);
    assert.deepEqual(f.categories, ["HAIR_SALON"], "the query must resolve a category");
    const r = rankSalons(ALL, f, 5);
    assert.equal(r.length, 1, "the hair salon must be found");
    assert.equal(r[0].slug, "studio");
  });

  test("2. a typo in the day word does not silently change the query", () => {
    // "juteo" is a real thing a customer types. It used to drop the day filter.
    assert.equal(interp.interpret(["fryzjer na juteo w krakowie"]).dayOffset, 1);
    assert.equal(interp.interpret(["fryzjer jutro w krakowie"]).dayOffset, 1);
    assert.equal(interp.interpret(["fryzjer pojutrze w krakowie"]).dayOffset, 2);
    // ...and the fuzzy match stays narrow: a different word must NOT become a day.
    assert.equal(hasFuzzyWord(["wtorek"], "jutro"), false, "unrelated words must not match");
    assert.equal(hasFuzzyWord(["jutra"], "jutro"), true, "one substitution is a typo");
    assert.equal(hasFuzzyWord(["jturo"], "jutro"), true, "a transposition is a typo");
    assert.equal(hasFuzzyWord(["ju"], "jutro"), false, "a prefix is not a typo");
  });

  test("3. the assistant never invents a salon", () => {
    // Ranking can only ever return rows it was handed.
    const r = rankSalons(ALL, interp.interpret(["fryzjer w krakowie"]), 5);
    for (const x of r) assert.ok(ALL.some((s) => s.slug === x.slug), "every result must be a real input row");
    // Nothing in, nothing out — no filler.
    assert.deepEqual(rankSalons([], interp.interpret(["fryzjer w krakowie"]), 5), []);
    // And a category nobody offers returns nothing rather than a near-miss.
    const barber = interp.interpret(["barber w krakowie"]);
    assert.ok(barber.categories?.includes("BARBER"));
    assert.equal(rankSalons(ALL, barber, 5).length, 0, "no BARBER salon exists, so none may be shown");
  });

  test("4. city and category constraints are both respected", () => {
    // Category: "paznokcie" must reach the NAIL_SALON, not the hair one.
    const nails = rankSalons(ALL, interp.interpret(["paznokcie w krakowie"]), 5);
    assert.deepEqual(nails.map((r) => r.slug), ["nailup"]);
    // Category: massage.
    const mass = rankSalons(ALL, interp.interpret(["masaz w krakowie"]), 5);
    assert.deepEqual(mass.map((r) => r.slug), ["testowa"]);
    // City: recognised diacritic-insensitively in BOTH directions, which is what
    // made "krakow" (typed) match "Kraków" (stored) and vice versa.
    for (const spelling of ["Kraków", "krakow", "Krakow"]) {
      assert.ok(cityMatches(spelling, "krakow"), `"${spelling}" must match a typed "krakow"`);
      assert.ok(cityMatches(spelling, "krakowie"), `"${spelling}" must match the inflected form`);
    }
    assert.equal(cityMatches("Warszawa", "krakow"), false, "different cities must not match");
  });

  test("the lookup uses every DB spelling, not one canonical string", () => {
    // The bug: `equals` + `mode:"insensitive"` does NOT fold diacritics, so a
    // salon stored as "krakow" was invisible to a query resolved as "Kraków".
    const src = code("lib/actions/discovery.ts");
    assert.ok(!/city: \{ equals: filters\.cityQuery, mode: "insensitive" \},/.test(src),
      "the diacritic-blind equals must not be the primary lookup");
    assert.ok(src.includes("cityMatches(c, filters.cityQuery!)"), "candidates come from the same matcher");
    assert.ok(src.includes("city: { in: cityCandidates }"), "and are queried as a parameterised list");
  });

  test("category is selected from the DB so ranking can use it", () => {
    const src = code("lib/actions/discovery.ts");
    assert.ok(/\n\s+category: true,/.test(src), "the query must select category");
    const core = code("lib/discovery.ts");
    assert.ok(core.includes("resolveQueryCategories"), "the assistant reuses /search's synonym table");
    assert.ok(core.includes("f.categories.includes(s.category)"), "and matches on it");
  });

  test("a miss explains WHICH constraint failed instead of one generic line", () => {
    const src = code("lib/actions/discovery.ts");
    for (const k of ["noneInCity", "noSlotThatDay", "noSuchService"]) {
      assert.ok(src.includes(`s.${k}`), `the graded fallback must use ${k}`);
    }
    // And the graded branches must come BEFORE the generic message.
    assert.ok(src.indexOf("s.noneInCity") < src.lastIndexOf("s.noResults"),
      "specific reasons must be tried before the generic fallback");
    for (const [loc, d] of Object.entries(DICTS)) {
      for (const k of ["noneInCity", "noSlotThatDay", "noSuchService"] as const) {
        assert.ok(d.search[k]?.trim().length > 10, `${loc}.search.${k} is missing`);
      }
    }
  });
});

// ── BUG 2: transactional e-mail language ─────────────────────────────────────

describe("5-9. transactional e-mail speaks the RECIPIENT's language", () => {
  const EMAIL = code("lib/email.ts");
  const RULE = code("lib/recipient-locale.ts");
  const CALLERS = code("lib/actions/appointments.ts");

  test("there is ONE documented rule, and it is recipient-scoped", () => {
    assert.ok(RULE.includes("export async function recipientLocale"), "the rule must exist");
    assert.ok(RULE.includes("select: { locale: true }"), "it reads the recipient's persisted locale");
    assert.ok(RULE.includes("DEFAULT_LOCALE"), "with a safe fallback");
    // The sender's request locale must never leak in.
    assert.ok(!RULE.includes("resolveLocale"), "the request/sender locale must not be an input");
    assert.ok(!RULE.includes("acceptLanguage"), "nor the browser hint of whoever triggered it");
    assert.ok(!RULE.includes("business.country"), "nor the salon's country");
  });

  test("5-8. every appointment template covers PL/EN/DE/TR", () => {
    // Each localized block must name all four locales; a missing one would fall
    // back to Polish silently, which is how the mixed-language bug reads.
    const senders = [
      "sendBookingRequestEmail", "sendBookingConfirmationEmail", "sendBookingCancellationEmail",
      "sendBookingTimeChangedEmail", "sendBookingReminderEmail", "sendReviewRequestEmail",
      "sendNewBookingNotificationEmail", "sendBookingRescheduleEmail", "sendEmployeeAppointmentEmail",
    ];
    for (const fn of senders) {
      const i = EMAIL.indexOf(`export async function ${fn}`);
      assert.ok(i > 0, `${fn} must exist`);
      const body = EMAIL.slice(i, i + 3000);
      assert.ok(body.includes("toLocale(params.locale)"), `${fn} must resolve the recipient locale`);
      for (const loc of ["pl:", "en:", "de:", "tr:"]) {
        assert.ok(body.includes(loc), `${fn} is missing a ${loc.slice(0, 2)} translation`);
      }
    }
  });

  test("9. no appointment template can emit mixed languages", () => {
    // The three that were hardcoded Polish while their type already carried a
    // locale (or had none at all) are the ones that produced mixed mail.
    for (const fn of ["sendNewBookingNotificationEmail", "sendBookingRescheduleEmail", "sendEmployeeAppointmentEmail"]) {
      const i = EMAIL.indexOf(`export async function ${fn}`);
      const body = EMAIL.slice(i, i + 3000);
      for (const stray of ["subject: `Nowa rezerwacja", "subject: `Wizyta przełożona", 'heading: "Masz nową rezerwację"', 'ctaLabel: "Otwórz kalendarz"']) {
        assert.ok(!body.includes(stray), `${fn} still hardcodes Polish: ${stray}`);
      }
    }
  });

  test("business and specialist mail uses THEIR locale, not the customer's", () => {
    assert.ok(CALLERS.includes("locale: await recipientLocale(business.ownerId)"),
      "the new-booking notification must use the owner's locale");
    assert.ok(CALLERS.includes("locale: await recipientLocale(appointment.business.ownerId)"),
      "the reschedule notification must use the owner's locale");
    assert.ok(CALLERS.includes("recipientLocale(e.userId)"),
      "the specialist mail must use the specialist's locale");
    // Customer mail keeps using the customer's own persisted locale.
    assert.ok(CALLERS.includes("locale: customer.locale"), "customer mail keeps the customer locale");
    assert.ok(CALLERS.includes("locale: appointment.customer.locale"), "and so does the confirmation path");
  });
});

// ── BUG 3: cancellation confirmation ─────────────────────────────────────────

describe("10-15. cancelling an appointment asks first", () => {
  const BTN = code("components/customer/cancel-appointment-button.tsx");
  const PAGE = code("app/customer/(customer-layout)/dashboard/page.tsx");

  test("10. the trigger opens a dialog and does NOT mutate", () => {
    assert.ok(/onClick=\{\(\) => setOpen\(true\)\}/.test(BTN), "the trigger only opens the dialog");
    assert.ok(BTN.includes("<ConfirmDialog"), "and it is the product's own dialog");
    // The old one-click form is gone from the page.
    assert.ok(!PAGE.includes("action={handleCancel}"), "the bare submit form must be gone");
    assert.ok(!PAGE.includes('"use server"'), "no inline server action left on the page");
    assert.ok(PAGE.includes("<CancelAppointmentButton"), "the confirming component is used instead");
  });

  test("11. closing the dialog performs no mutation", () => {
    // cancelAppointment is reachable from exactly one place: the confirm handler.
    assert.equal((BTN.match(/cancelAppointment\(/g) ?? []).length, 1, "one call site only");
    const confirmFn = BTN.slice(BTN.indexOf("function confirm()"), BTN.indexOf("return ("));
    assert.ok(confirmFn.includes("cancelAppointment(appointmentId)"), "the call lives inside confirm()");
    // Dismissing only flips state.
    assert.ok(BTN.includes("onOpenChange={(o) => { if (!isPending) setOpen(o); }}"),
      "dismissing must only change state, and not while a request is in flight");
  });

  test("12+13. confirming cancels exactly once, even on a double click", () => {
    assert.ok(BTN.includes("if (sent.current) return;"), "a synchronous guard must short-circuit the second click");
    assert.ok(BTN.includes("sent.current = true;"), "and latch before awaiting");
    assert.ok(BTN.includes("useTransition"), "pending state must exist");
    assert.ok(BTN.includes("busy={isPending}"), "and disable the dialog buttons");
    assert.ok(BTN.includes("disabled={isPending}"), "and the trigger");
    // A failure must reopen the door — the mutation did not happen.
    assert.ok(BTN.includes("sent.current = false;"), "a failed attempt must be retryable");
  });

  test("14. the server rules are untouched — this is a guard, not a replacement", () => {
    const action = code("lib/actions/appointments.ts");
    const i = action.indexOf("export async function cancelAppointment");
    const body = action.slice(i, i + 2500);
    assert.ok(body.includes("cancellationHours"), "the salon's cancellation window still applies");
    assert.ok(/throw new Error/.test(body), "authorization failures still throw server-side");
  });

  test("15. the confirmation copy exists in PL/EN/DE/TR, and is really translated", () => {
    for (const [loc, d] of Object.entries(DICTS)) {
      for (const k of ["trigger", "title", "body", "back", "confirm", "cancelling", "done", "failed", "ariaTrigger"] as const) {
        assert.ok(d.cancelAppt[k]?.trim().length > 0, `${loc}.cancelAppt.${k} is missing`);
      }
      assert.ok(d.cancelAppt.ariaTrigger.includes("{what}"), `${loc} lost the {what} placeholder`);
    }
    // The exact copy the report asked for.
    assert.equal(pl.cancelAppt.title, "Czy na pewno chcesz anulować wizytę?");
    assert.equal(pl.cancelAppt.body, "Tej operacji nie można cofnąć.");
    assert.equal(pl.cancelAppt.back, "Wróć");
    assert.equal(pl.cancelAppt.confirm, "Tak, anuluj wizytę");
    // Not copy-pasted Polish.
    for (const loc of ["en", "de", "tr"] as const) {
      for (const k of ["title", "body", "back", "confirm"] as const) {
        assert.notEqual(DICTS[loc].cancelAppt[k], pl.cancelAppt[k], `${loc}.cancelAppt.${k} is still Polish`);
      }
    }
  });

  test("no window.confirm anywhere in the customer cancel path", () => {
    assert.ok(!BTN.includes("window.confirm"), "must use the design system, not a native dialog");
    assert.ok(!PAGE.includes("window.confirm"));
  });
});
