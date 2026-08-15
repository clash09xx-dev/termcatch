import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BusinessStatus } from "@prisma/client";
import {
  resolvePublication,
  isPubliclyVisible,
  publicDiscoveryWhere,
  PUBLIC_BUSINESS_WHERE,
  type PublicationInput,
} from "../lib/publication";
import { buildBusinessSearchWhere } from "../lib/search";

/**
 * The dashboard once said "Opublikowany · widoczny w wyszukiwarce · można
 * rezerwować" about a salon that search excluded and whose /b/[slug] returned
 * not-found. Three surfaces answered "is this published?" three different ways:
 *
 *   /b/[slug]            isPubliclyVisible   (ACTIVE && isActive)
 *   search / categories  publicDiscoveryWhere(ACTIVE && isActive && !medical)
 *   dashboard card       status === ACTIVE   ← ignored BOTH extra conditions
 *
 * resolvePublication is now the one answer all three read. These tests hold the
 * three together: it is not enough that the resolver is self-consistent, it has
 * to agree with what search and the profile route actually do.
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

/** What search would do with this row, from the real search where-clause. */
function searchWouldInclude(b: PublicationInput): boolean {
  const where = buildBusinessSearchWhere({}) as {
    status?: BusinessStatus;
    isActive?: boolean;
    category?: { notIn?: string[] };
  };
  if (where.status !== undefined && b.status !== where.status) return false;
  if (where.isActive !== undefined && b.isActive !== where.isActive) return false;
  const hidden = where.category?.notIn ?? [];
  if (typeof b.category === "string" && hidden.includes(b.category)) return false;
  return true;
}

describe("publication truth — one answer for dashboard, search and profile", () => {
  test("1. a draft (incomplete, PENDING_VERIFICATION) is not visible anywhere", () => {
    const draft = resolvePublication({
      ...base,
      status: BusinessStatus.PENDING_VERIFICATION,
      isActive: false,
      activeServices: [],
      openDays: 0,
    });
    assert.equal(draft.state, "DRAFT");
    assert.equal(draft.publiclyVisible, false);
    assert.equal(draft.discoverable, false);
    assert.equal(draft.bookable, false);
    assert.equal(draft.profilePath, null, "a draft must not be handed a profile link");
    assert.ok(draft.missing.length > 0);
  });

  test("2. incomplete-but-ACTIVE cannot happen silently: completeness is reported, not assumed", () => {
    // A salon that somehow reached ACTIVE while incomplete is still shown its
    // missing items rather than a clean "all good".
    const r = resolvePublication({ ...base, activeServices: [], openDays: 0 });
    assert.ok(r.missing.some((m) => m.key === "service"));
    assert.ok(r.missing.some((m) => m.key === "hours"));
    // ...and a COMPLETE pending salon is READY, not DRAFT.
    const ready = resolvePublication({
      ...base,
      status: BusinessStatus.PENDING_VERIFICATION,
      isActive: false,
    });
    assert.equal(ready.state, "READY");
    assert.equal(ready.missing.length, 0);
    assert.equal(ready.publiclyVisible, false, "READY is not yet public");
    assert.equal(ready.profilePath, null);
  });

  test("3. a published, eligible salon is visible, discoverable and bookable", () => {
    const r = resolvePublication(base);
    assert.equal(r.state, "PUBLISHED");
    assert.equal(r.publiclyVisible, true);
    assert.equal(r.discoverable, true);
    assert.equal(r.bookable, true);
    assert.equal(r.profilePath, "/b/salon-testowy");
  });

  test("4. an owner-hidden salon (isActive false) is not visible and gets no link", () => {
    const r = resolvePublication({ ...base, isActive: false });
    assert.equal(r.state, "HIDDEN");
    assert.equal(r.publiclyVisible, false);
    assert.equal(r.discoverable, false);
    assert.equal(r.bookable, false);
    assert.equal(r.profilePath, null);

    const suspended = resolvePublication({ ...base, status: BusinessStatus.SUSPENDED });
    assert.equal(suspended.state, "SUSPENDED");
    assert.equal(suspended.profilePath, null);

    for (const status of [BusinessStatus.BANNED, BusinessStatus.CLOSED] as const) {
      const t = resolvePublication({ ...base, status });
      assert.equal(t.state, "CLOSED");
      assert.equal(t.publiclyVisible, false);
      assert.equal(t.profilePath, null);
    }
  });

  test("5. the published profile route resolves — profilePath matches what /b/[slug] accepts", () => {
    const r = resolvePublication(base);
    // /b/[slug] calls notFound() unless isPubliclyVisible(business).
    assert.equal(isPubliclyVisible({ status: base.status, isActive: base.isActive }), true);
    assert.equal(r.profilePath, `/b/${base.slug}`);
    assert.equal(r.publiclyVisible, isPubliclyVisible({ status: base.status, isActive: base.isActive }));
  });

  test("6. dashboard status agrees with Search for every status × isActive combination", () => {
    const statuses = Object.values(BusinessStatus) as BusinessStatus[];
    for (const status of statuses) {
      for (const isActive of [true, false]) {
        const input = { ...base, status, isActive };
        const facts = resolvePublication(input);
        assert.equal(
          facts.discoverable,
          searchWouldInclude(input),
          `dashboard says discoverable=${facts.discoverable} but search disagrees for ${status}/${isActive}`
        );
        assert.equal(
          facts.publiclyVisible,
          isPubliclyVisible({ status, isActive }),
          `dashboard/profile disagree for ${status}/${isActive}`
        );
      }
    }
  });

  test("7. 'View profile' points at the real public route, or is withheld entirely", () => {
    // Non-null profilePath must ALWAYS be a route the profile page would serve.
    const statuses = Object.values(BusinessStatus) as BusinessStatus[];
    for (const status of statuses) {
      for (const isActive of [true, false]) {
        const f = resolvePublication({ ...base, status, isActive });
        if (f.profilePath !== null) {
          assert.equal(f.profilePath, "/b/salon-testowy");
          assert.equal(
            isPubliclyVisible({ status, isActive }),
            true,
            `handed a link for ${status}/${isActive}, but /b/[slug] would 404`
          );
        } else {
          assert.equal(isPubliclyVisible({ status, isActive }), false);
        }
      }
    }
  });

  test("8. a hidden-category salon is bookable by link but honestly reported as not in search", () => {
    // The one case where "published" and "in search" genuinely differ — so the
    // card must state them separately instead of implying both.
    const r = resolvePublication({ ...base, category: "DENTIST" });
    assert.equal(r.state, "NOT_LISTED");
    assert.equal(r.publiclyVisible, true);
    assert.equal(r.bookable, true);
    assert.equal(r.discoverable, false, "a medical category is never listed in search");
    assert.equal(r.profilePath, "/b/salon-testowy");
    assert.equal(searchWouldInclude({ ...base, category: "DENTIST" }), false);
  });

  test("9. going public revalidates every surface that renders publication state", () => {
    // Publishing changes what the dashboard, search, the category pages and the
    // profile route should render. /b/[slug] used to be left stale because each
    // caller re-listed the paths by hand and one list was short; the refresh now
    // lives at the single place the flip happens.
    const publishSrc = readFileSync("lib/publish.ts", "utf8");
    for (const path of ["/business/dashboard", "/search", "/categories", "/b/${b.slug}"]) {
      assert.ok(
        publishSrc.includes(path),
        `autoPublishIfComplete must revalidate ${path} when a salon goes public`
      );
    }
    // The manual owner switch (public profile on/off) has to refresh the same set.
    const actionSrc = readFileSync("lib/actions/business.ts", "utf8");
    for (const path of ["/search", "/categories", "/business/dashboard"]) {
      assert.ok(
        actionSrc.includes(`revalidatePath("${path}")`),
        `setPublicProfileActive must revalidate ${path}`
      );
    }
    assert.ok(actionSrc.includes("revalidatePath(`/b/${business.slug}`)"));
  });

  test("10. the discovery filter is a strict narrowing of the visibility filter", () => {
    // Guards against a future edit that makes search WIDER than the profile
    // route — which would list salons whose profile page 404s.
    const discovery = publicDiscoveryWhere() as Record<string, unknown>;
    for (const [k, v] of Object.entries(PUBLIC_BUSINESS_WHERE)) {
      assert.equal(discovery[k], v, `discovery dropped the public condition ${k}`);
    }
  });
});
