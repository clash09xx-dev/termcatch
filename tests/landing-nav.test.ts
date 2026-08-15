import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildLandingNav,
  isMarketingRoute,
  navHref,
  MARKETING_ROUTES,
  AFFILIATE_HREF,
  type NavLinkKey,
} from "../lib/nav/landing-nav";

/**
 * The regression: `isMarketing = !isAuthed && isMarketingRoute(pathname)`.
 *
 * Being signed in stripped the marketing links off every public page, so an
 * owner who opened termcatch.com saw Search / Language / Panel and had no route
 * to Pricing, Careers or About. Two independent questions had been collapsed
 * into one boolean:
 *
 *   WHICH LINKS   ← the ROUTE alone
 *   WHICH ACCOUNT ACTIONS ← the SESSION alone
 *
 * These tests pin them apart, and pin the desktop and mobile menus to the same
 * model so they cannot drift again.
 */

const FULL_MARKETING: NavLinkKey[] = ["search", "registerSalon", "pricing", "careers", "about"];

describe("public marketing navbar", () => {
  test("1. logged out, on the homepage → the complete marketing nav", () => {
    const nav = buildLandingNav({ pathname: "/", account: "guest" });
    assert.equal(nav.marketing, true);
    assert.deepEqual(nav.linkKeys, FULL_MARKETING);
    assert.equal(nav.showAffiliate, true);
    assert.equal(nav.account, "guest");
  });

  test("2. logged IN, on the homepage → the SAME marketing links (the regression)", () => {
    const guest = buildLandingNav({ pathname: "/", account: "guest" });
    const authed = buildLandingNav({ pathname: "/", account: "authed" });
    assert.deepEqual(
      authed.linkKeys,
      guest.linkKeys,
      "authentication must not remove public marketing navigation"
    );
    assert.equal(authed.marketing, true);
    assert.equal(authed.showAffiliate, true);
    // Only the account controls differ.
    assert.equal(authed.account, "authed");
  });

  test("3. every marketing route keeps the full nav for BOTH session states", () => {
    for (const route of MARKETING_ROUTES) {
      for (const account of ["guest", "authed", "loading"] as const) {
        const nav = buildLandingNav({ pathname: route, account });
        assert.equal(nav.marketing, true, `${route} should be a marketing route`);
        // The current page is dropped from its own nav; everything else stays.
        const expected = FULL_MARKETING.filter((k) => navHref(k).split("?")[0] !== route);
        assert.deepEqual(
          nav.linkKeys,
          expected,
          `${route} (${account}) lost marketing links`
        );
      }
    }
  });

  test("4. mobile and desktop render one shared model, so they cannot diverge", () => {
    // The component maps `model.linkKeys` in both the desktop <nav> and the
    // mobile sheet; there is no second, mobile-only list to fall out of sync.
    const src = readFileSync("components/layout/landing-nav.tsx", "utf8");
    const renders = src.match(/links\.map\(/g) ?? [];
    assert.equal(renders.length, 2, "expected exactly one desktop and one mobile render of `links`");
    assert.ok(
      !/isAuthed\s*&&|!\s*isAuthed/.test(src),
      "link selection must not consult the session — that is the bug being fixed"
    );
    // Both menus gate the affiliate CTA on `isMarketing`, never on the session.
    assert.equal((src.match(/isMarketing\s*&&/g) ?? []).length, 2);
  });

  test("5. authenticated search does not show a redundant 'Search' link", () => {
    const nav = buildLandingNav({ pathname: "/search", account: "authed" });
    assert.equal(nav.marketing, false, "/search is a product surface, not a marketing page");
    assert.deepEqual(nav.linkKeys, [], "no link back to the page you are already on");
    // ...and the same holds for a guest: this is a property of the ROUTE.
    assert.deepEqual(buildLandingNav({ pathname: "/search", account: "guest" }).linkKeys, []);
  });

  test("6. task surfaces (profile, booking) get the minimal nav, not marketing", () => {
    for (const route of ["/b/salon-testowy", "/b/salon-testowy/book", "/login", "/register"]) {
      const nav = buildLandingNav({ pathname: route, account: "authed" });
      assert.equal(nav.marketing, false, `${route} must not get marketing chrome`);
      assert.deepEqual(nav.linkKeys, ["search"], `${route} keeps only the way back to search`);
      assert.equal(nav.showAffiliate, false);
    }
  });

  test("7. the dashboards never render this nav at all", () => {
    // LandingNav is not mounted under the authenticated app shells; each has its
    // own sidebar/topbar. Assert no app-shell layout imports it.
    for (const layout of [
      "app/business/(business-layout)/layout.tsx",
      "app/customer/(customer-layout)/layout.tsx",
      "app/admin/layout.tsx",
    ]) {
      let src: string;
      try {
        src = readFileSync(layout, "utf8");
      } catch {
        continue; // layout may not exist; the other assertions still hold
      }
      assert.ok(
        !src.includes("LandingNav"),
        `${layout} must not inject marketing navigation into the product`
      );
    }
    // None of the app shells are marketing routes either.
    for (const route of ["/business/dashboard", "/customer/profile", "/employee/dashboard", "/admin"]) {
      assert.equal(isMarketingRoute(route), false, `${route} must not be a marketing route`);
    }
  });

  test("8. the affiliate CTA belongs to the marketing chrome, not the session", () => {
    assert.equal(buildLandingNav({ pathname: "/", account: "authed" }).showAffiliate, true);
    assert.equal(buildLandingNav({ pathname: "/", account: "guest" }).showAffiliate, true);
    assert.equal(buildLandingNav({ pathname: "/search", account: "guest" }).showAffiliate, false);
    assert.ok(AFFILIATE_HREF.startsWith("/careers"));
  });
});
