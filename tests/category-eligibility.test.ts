import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BusinessStatus } from "@prisma/client";
import {
  isMedicalCategory,
  isSelectableCategory,
  visibleCategories,
  onboardingCategoriesFor,
  MEDICAL_CATEGORY_VALUES,
} from "../lib/categories";
import { resolvePublication, type PublicationInput } from "../lib/publication";
import { buildBusinessSearchWhere } from "../lib/search";

/**
 * A live salon showed "Opublikowany, poza wyszukiwarką / W wyszukiwarce: Nie".
 * The status was TRUE — the salon's category is GENERAL_PHYSICIAN, and medical
 * categories are withheld from discovery until the product can verify
 * credentials. But the salon is a scratch/test record, not a doctor's practice,
 * so the honest status was reporting a data problem it could not fix:
 *
 *   - the category picker has not offered medical values for some time, so this
 *     is a LEGACY row from before that filter
 *   - the profile page showed the category as a DISABLED input reading
 *     "cannot be changed after registration, contact support"
 *
 * The owner was therefore permanently unfindable with no self-service way out.
 * The fix is the workflow, not the row: the category becomes editable, bounded
 * by the same allow-list the picker uses, so an owner can move OUT of a
 * withdrawn category and never INTO one.
 */

const base: PublicationInput = {
  status: BusinessStatus.ACTIVE,
  isActive: true,
  slug: "salon-testowy",
  name: "Salon Testowy",
  category: "HAIR_SALON",
  city: "Kraków",
  address: "ul. Kwiatowa 5",
  phone: "+48123456789",
  email: "kontakt@salon.pl",
  activeServices: [{ price: 120, duration: 60 }],
  activeEmployees: 1,
  openDays: 5,
};

/** What the real search where-clause would do with this category. */
function searchIncludesCategory(category: string): boolean {
  const where = buildBusinessSearchWhere({}) as { category?: { notIn?: string[] } };
  return !(where.category?.notIn ?? []).includes(category);
}

describe("category decides search eligibility", () => {
  test("1. an ordinary salon category is discoverable", () => {
    for (const c of ["HAIR_SALON", "NAIL_SALON", "MASSAGE", "BARBER_SHOP"]) {
      if (!visibleCategories().some((v) => v.value === c)) continue;
      assert.equal(searchIncludesCategory(c), true, `${c} should be searchable`);
      assert.equal(resolvePublication({ ...base, category: c }).discoverable, true);
    }
  });

  test("2. every medical category is withheld from discovery", () => {
    for (const c of MEDICAL_CATEGORY_VALUES) {
      assert.equal(isMedicalCategory(c), true);
      assert.equal(searchIncludesCategory(c), false, `${c} must not be searchable`);
      assert.equal(resolvePublication({ ...base, category: c }).discoverable, false);
    }
  });

  test("3. the reported case: GENERAL_PHYSICIAN is genuinely, correctly excluded", () => {
    const facts = resolvePublication({ ...base, category: "GENERAL_PHYSICIAN" });
    assert.equal(facts.state, "NOT_LISTED");
    assert.equal(facts.discoverable, false, "not in search");
    // ...and the rest of the status card is true at the same time.
    assert.equal(facts.publiclyVisible, true, "the profile link works");
    assert.equal(facts.bookable, true, "clients can still book via the link");
    assert.equal(facts.profilePath, "/b/salon-testowy");
  });

  test("4. the dashboard status and search agree for every category", () => {
    const all = [...visibleCategories().map((c) => c.value), ...MEDICAL_CATEGORY_VALUES];
    for (const c of all) {
      assert.equal(
        resolvePublication({ ...base, category: c }).discoverable,
        searchIncludesCategory(c),
        `dashboard and search disagree for ${c}`
      );
    }
  });
});

describe("an owner can correct a wrong category, but only to an offered one", () => {
  test("5. the picker never offers a medical category", () => {
    for (const locale of ["pl", "en", "de", "tr"] as const) {
      const offered = onboardingCategoriesFor(locale).map((c) => c.value);
      for (const m of MEDICAL_CATEGORY_VALUES) {
        assert.ok(!offered.includes(m), `${locale} picker must not offer ${m}`);
      }
      assert.ok(offered.includes("OTHER"), "the catch-all must stay available");
    }
  });

  test("6. the server allow-list matches the picker exactly", () => {
    for (const c of visibleCategories()) {
      assert.equal(isSelectableCategory(c.value), true, `${c.value} is offered, so it must be accepted`);
    }
    assert.equal(isSelectableCategory("OTHER"), true);
    for (const m of MEDICAL_CATEGORY_VALUES) {
      assert.equal(isSelectableCategory(m), false, `${m} must never be self-assignable`);
    }
    // Junk and type confusion are rejected rather than written through.
    for (const junk of ["", "  ", "NOT_A_CATEGORY", "hair_salon", null, undefined, 42, {}]) {
      assert.equal(isSelectableCategory(junk as unknown), false, `${String(junk)} must be rejected`);
    }
  });

  test("7. the update action validates the category server-side", () => {
    const src = readFileSync("lib/actions/business.ts", "utf8");
    assert.ok(src.includes("isSelectableCategory"), "the action must use the allow-list");
    assert.ok(
      /if \(!isSelectableCategory\(v\)\) throw new Error/.test(src),
      "a value outside the allow-list must be rejected, not saved"
    );
    // Skipping the field must remain possible (other tabs post without it).
    assert.ok(src.includes("if (data.category === undefined) return undefined;"),
      "an absent category must leave the record untouched");
  });

  test("8. changing category revalidates the surfaces that list by it", () => {
    const src = readFileSync("lib/actions/business.ts", "utf8");
    for (const path of ['revalidatePath("/search")', 'revalidatePath("/categories")', 'revalidatePath("/business/dashboard")']) {
      assert.ok(src.includes(path), `updateBusinessProfile must ${path}`);
    }
    assert.ok(src.includes("revalidatePath(`/b/${business.slug}`)"), "the public profile must refresh");
  });

  test("9. the profile UI lets the owner change it, and explains the hidden case", () => {
    const src = readFileSync("app/business/(business-layout)/profile/profile-client.tsx", "utf8");
    assert.ok(src.includes("<select"), "the category must be a real picker now");
    assert.ok(!/value=\{categoryLabelFor\(business\.category, locale\)\}\s*\n\s*disabled/.test(src),
      "the disabled input must be gone");
    assert.ok(src.includes("CATEGORY_OPTIONS"), "options come from the offered set");
    assert.ok(src.includes("categoryHidden"), "a withheld current category must be surfaced");
    assert.ok(src.includes("T.categoryHiddenNote"), "with an explanation of what to do");
    // A legacy value stays visible as the current selection rather than the
    // field silently reading as some other category.
    assert.ok(src.includes("!CATEGORY_OPTIONS.some((c) => c.value === category)"),
      "the current value must remain shown even when it is no longer offered");
  });

  test("10. the stale 'cannot be changed' copy is gone from all four locales", () => {
    const stale = ["Kategorii nie można zmienić", "cannot be changed after registration",
                   "lässt sich nach der Registrierung nicht ändern", "kayıttan sonra değiştirilemez"];
    for (const locale of ["pl", "en", "de", "tr"]) {
      const d = readFileSync(`lib/i18n/dictionaries/${locale}.ts`, "utf8");
      for (const s of stale) {
        assert.ok(!d.includes(s), `${locale} still tells the owner the category is immutable`);
      }
      assert.ok(d.includes("categoryHiddenNote:"), `${locale} must explain the withheld-category case`);
    }
  });
});
