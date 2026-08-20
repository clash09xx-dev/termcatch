import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveViewSwitch, usesProductSwitch } from "../lib/view-switch";
import { grantsSalonContext } from "../lib/employee/membership";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";

/**
 * Two things were wrong, and they had nothing to do with each other except that
 * both were about a control being in the wrong shape.
 *
 * 1. The internal switch was a permanently expanded dark pill reading
 *    "WIDOK | Klient | Salon | Właściciel", parked over the corner of every
 *    page, with hardcoded Polish labels. It is a debugging aid; it should not be
 *    the loudest chrome on screen, and it should not be the one control that
 *    ignores the selected language. Both switchers now share ONE collapsed-dot
 *    shell — so the a11y contract cannot drift between them.
 *
 * 2. Horizontal movement in the day calendar only worked while the pointer was
 *    over the lane headers. See the calendar describe block for why.
 */

const read = (p: string) => readFileSync(p, "utf8");
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s\/\/.*$/gm, "");

const SHELL = "components/view-switch-dot.tsx";
const PRODUCT = "components/product-view-switcher.tsx";
const ADMIN = "components/admin-view-switcher.tsx";
const CUSTOMER_LAYOUT = "app/customer/(customer-layout)/layout.tsx";
const BUSINESS_LAYOUT = "app/business/(business-layout)/layout.tsx";
const EMPLOYEE_LAYOUT = "app/employee/(employee-layout)/layout.tsx";
const CALENDAR = "app/business/(business-layout)/calendar/calendar-client.tsx";
const DICTS = { pl, en, de, tr };

// ── 1-5: who gets the dot ────────────────────────────────────────────────────

describe("who gets the switch", () => {
  test("1. a normal customer gets no dot, and no reserved space", () => {
    const kind = resolveViewSwitch({ isAdmin: false, ownsBusiness: false, isEmployee: false });
    assert.equal(kind, "none");
    assert.equal(usesProductSwitch(kind), false);
    // The layout renders NOTHING for them — not an empty wrapper that would
    // still occupy the corner.
    const src = read(CUSTOMER_LAYOUT);
    assert.ok(/\) : null\}/.test(src), "the customer layout must render nothing when ineligible");
    assert.ok(!/<div[^>]*z-switch[^>]*>\s*\{viewSwitch/.test(src), "no always-present wrapper");
  });

  test("2. an owner gets the dot", () => {
    const kind = resolveViewSwitch({ isAdmin: false, ownsBusiness: true, isEmployee: false });
    assert.equal(kind, "owner");
    assert.equal(usesProductSwitch(kind), true);
  });

  test("3. an approved specialist gets the dot", () => {
    const kind = resolveViewSwitch({ isAdmin: false, ownsBusiness: false, isEmployee: true });
    assert.equal(kind, "employee");
    assert.equal(usesProductSwitch(kind), true);
  });

  test("4. a PENDING specialist gets no salon access", () => {
    assert.equal(grantsSalonContext("PENDING"), false);
    // Structural, not a check someone must remember: eligibility is an ACTIVE
    // Employee row, and a pending request creates none.
    const own = code("lib/ownership.ts");
    const block = own.slice(own.indexOf("employeeProfiles:"));
    assert.ok(block.includes("isActive: true"), "only an active membership resolves");
    assert.ok(!own.includes("employeeJoinRequest"), "a request row is never read as access");
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: false, isEmployee: false }), "none");
  });

  test("5. a REJECTED specialist gets no salon access", () => {
    assert.equal(grantsSalonContext("REJECTED"), false);
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: false, isEmployee: false }), "none");
  });
});

// ── 6-9: what each switch contains ───────────────────────────────────────────

describe("what the switch offers", () => {
  test("6+7. owner and specialist both get exactly Client + Salon", () => {
    const src = read(PRODUCT);
    assert.equal((src.match(/\{ key: "(client|salon)",/g) ?? []).length, 2, "exactly two views");
    assert.ok(src.includes("t.viewSwitch.client") && src.includes("t.viewSwitch.salon"));
    // One component serves both relationships; only the destination differs, and
    // the SERVER picks it.
    assert.ok(src.includes("salonHref"), "the salon destination is server-resolved");
    assert.ok(!src.includes('"/business/dashboard"'), "no hardcoded salon destination");
    assert.ok(!src.includes('"/employee/dashboard"'), "nor an employee one");
  });

  test("8. a normal user can never be offered the platform Owner mode", () => {
    const src = read(PRODUCT);
    for (const gone of ["Właściciel", "Owner", "Inhaber", "Sahip"]) {
      assert.ok(!src.includes(`"${gone}"`), `the product switch must not offer "${gone}"`);
    }
    assert.ok(!src.includes("/admin"), "and must not link into the platform panel");
    assert.ok(!src.includes("viewSwitch.owner"), "nor read the platform-owner label");
    // The dot shell is generic, so it must not smuggle a third item in either.
    const shell = code(SHELL);
    assert.ok(!/\/admin/.test(shell), "the shared shell hardcodes no destination at all");
    assert.ok(!/viewSwitch\.(owner|salon|client)/.test(shell), "the shell holds no labels of its own");
  });

  test("9. the admin keeps its three internal contexts", () => {
    const src = read(ADMIN);
    assert.equal((src.match(/\{ key: "(client|salon|owner)",/g) ?? []).length, 3);
    for (const href of ["/customer/dashboard", "/business/dashboard", "/admin/dashboard"]) {
      assert.ok(src.includes(href), `the internal switch must keep ${href}`);
    }
    // ...and it is gated apart from the product switch, server-side.
    for (const layout of [CUSTOMER_LAYOUT, BUSINESS_LAYOUT]) {
      const l = read(layout);
      assert.ok(l.includes("isPlatformAdmin()"), `${layout} must resolve admin server-side`);
      assert.ok(/=== "admin" \?/.test(l), `${layout} must branch on the resolved kind`);
    }
  });
});

// ── 10: nothing a client controls grants access ──────────────────────────────

describe("10. forged client state cannot grant salon access", () => {
  test("eligibility never reads client-controlled state", () => {
    const rule = code("lib/view-switch.ts");
    for (const bad of ["cookies(", "document.", "localStorage", "searchParams", "headers("]) {
      assert.ok(!rule.includes(bad), `the eligibility rule must not read ${bad}`);
    }
    assert.ok(!rule.includes("ownerView"), "the view cookie is presentation only");
  });

  test("the control receives no business identifier at all", () => {
    for (const f of [SHELL, PRODUCT, ADMIN]) {
      const src = code(f);
      assert.ok(!src.includes("businessId"), `${f} must not take a business id`);
      assert.ok(!/\/business\/\$\{/.test(src), `${f} must not build a dynamic business path`);
    }
  });

  test("the cookie is written as presentation, and read by nothing that authorizes", () => {
    const src = read(PRODUCT);
    assert.ok(src.includes("ownerView"), "the preference is still remembered");
    assert.ok(src.includes("presentation"), "and documented as presentation-only");
    const own = code("lib/ownership.ts");
    assert.ok(!own.includes("ownerView"), "ownership must not consult it");
  });

  test("every salon route re-checks server-side, so the switch grants nothing", () => {
    const emp = read(EMPLOYEE_LAYOUT);
    assert.ok(emp.includes("resolveEmployeeContext()"), "the employee shell re-resolves membership");
    assert.ok(emp.includes('redirect("/")'), "and turns a non-member away");
    const biz = read(BUSINESS_LAYOUT);
    assert.ok(biz.includes("ownedBusinesses"), "the owner panel gates on ownership");
    assert.ok(biz.includes('redirect("/employee/dashboard")'), "a non-owning employee is redirected out");
  });
});

// ── 11-18: the interaction and a11y contract (shared shell) ──────────────────

describe("11-18. the dot interaction and accessibility", () => {
  const src = read(SHELL);

  test("11. desktop hover expands, gated to real hover devices", () => {
    assert.ok(src.includes("onPointerEnter"), "hover must expand it");
    assert.ok(src.includes("(hover: hover) and (pointer: fine)"),
      "so a touch tap cannot fire a false hover");
  });

  test("12. keyboard focus expands it too", () => {
    assert.ok(src.includes("onFocus"), "focus must expand it without hover");
    // Enter/Space come free from real <button> semantics.
    assert.ok(/<button[\s\S]*?type="button"/.test(src), "the dot must be a real button");
  });

  test("13. pointer leave collapses after a grace delay, not instantly", () => {
    assert.ok(src.includes("onPointerLeave"), "leaving must schedule a collapse");
    assert.ok(/setTimeout\(\(\) => setOpen\(false\), \d+\)/.test(src), "via a timer, not immediately");
    const delay = Number(src.match(/setOpen\(false\), (\d+)\)/)![1]);
    assert.ok(delay >= 150 && delay <= 600, `grace delay should be a short natural beat, got ${delay}ms`);
    assert.ok(src.includes("cancelClose"), "re-entering must cancel the pending collapse");
    // And the timer must be cleared on unmount, or it fires into a dead tree.
    assert.ok(src.includes("useEffect(() => () => cancelClose()"), "the timer must be cleaned up");
  });

  test("14. mobile tap expands", () => {
    assert.ok(/onClick=\{\(\) => setOpen\(\(v\) => !v\)\}/.test(src), "tapping the dot toggles it");
  });

  test("15. tapping outside collapses, and Escape closes and restores focus", () => {
    assert.ok(src.includes("pointerdown"), "an outside tap must close it");
    assert.ok(src.includes("rootRef.current?.contains"), "but only when genuinely outside");
    assert.ok(src.includes('e.key === "Escape"'), "Escape must close it");
    assert.ok(src.includes("dotRef.current?.focus()"), "and return focus to the dot");
  });

  test("16. hidden options are NOT in the tab order", () => {
    assert.ok(src.includes("tabIndex={open ? 0 : -1}"), "collapsed options must be untabbable");
    assert.ok(src.includes("aria-hidden={!open}"), "and hidden from assistive tech");
    assert.ok(/pointerEvents|pointer-events-none/.test(src), "and not clickable while collapsed");
  });

  test("17. accessible labels exist, on the dot and on every option", () => {
    assert.ok(src.includes("aria-label={t.viewSwitch.ariaOpen}"), "the dot needs a name");
    assert.ok(src.includes("aria-expanded={open}"), "and must report its state");
    assert.ok(src.includes("aria-controls"), "and point at the panel it controls");
    assert.ok(src.includes("aria-label={v.aria}"), "each option carries its own name");
    assert.ok(src.includes('aria-current={isActive ? "page" : undefined}'), "the active view is announced");
    assert.ok(/h-11 w-11/.test(src), "the hit target stays 44x44 though the dot is only 13px");

    // Localized in all four launch languages, including the new platform label.
    for (const [loc, d] of Object.entries(DICTS)) {
      for (const k of ["view", "client", "salon", "owner", "ariaOpen", "ariaClose", "ariaClient", "ariaSalon", "ariaOwner"] as const) {
        assert.ok(d.viewSwitch[k]?.trim().length > 0, `${loc}.viewSwitch.${k} is missing`);
      }
    }
    assert.equal(pl.viewSwitch.client, "Klient");
    assert.equal(en.viewSwitch.client, "Client");
    assert.notEqual(en.viewSwitch.ariaOwner, pl.viewSwitch.ariaOwner, "aria labels are localized too");
  });

  test("18. reduced motion removes the transition rather than shortening it", () => {
    assert.ok(src.includes("useReducedMotion"), "the shell must consult the preference");
    assert.ok(/reduce \? "none" :/.test(src), "and drop the transition entirely");
    assert.ok(/open \|\| reduce \? "none" :/.test(src), "and not offset the panel either");
  });

  test("collapsing/expanding cannot shift the page", () => {
    // Both states are absolutely positioned inside a wrapper sized to the widest
    // one, so only opacity/transform animate.
    assert.ok(src.includes("relative flex h-11 items-center justify-end"), "wrapper is pre-sized");
    assert.equal((src.match(/absolute right-0/g) ?? []).length, 2, "both layers are taken out of flow");
    // The invariant is that the TRANSITION animates only opacity/transform.
    // A static size on the dot itself (w-[13px]) is not a layout risk, so the
    // earlier "no w-[ anywhere below the wrapper" check was testing the wrong
    // thing — it failed the moment the dot got an exact diameter.
    const transition = src.match(/const ease = [^;]+;/)![0];
    assert.ok(/opacity .*transform/.test(transition), "the transition animates opacity + transform");
    for (const animatable of ["width", "height", "margin", "padding", "top", "left", "right", "bottom"]) {
      assert.ok(!transition.includes(animatable), `the transition must not animate ${animatable}`);
    }
  });

  test("the collapsed control stays out of the way of mobile navigation", () => {
    assert.ok(src.includes("env(safe-area-inset-bottom)"), "must respect the iOS safe area");
    assert.ok(/bottom-\[calc\(5rem/.test(src), "and clear the mobile bottom nav");
    assert.ok(src.includes("md:bottom-4"), "sitting lower on desktop where there is no bottom nav");
  });
});

// ── 19-20: the calendar ──────────────────────────────────────────────────────

describe("19-20. horizontal calendar movement", () => {
  const src = read(CALENDAR);

  test("19. the day grid no longer blocks horizontal scroll chaining", () => {
    // THE BUG: `overscrollBehavior: "contain"` is a SHORTHAND — it set both axes.
    // `contain` means "do not chain to an ancestor". The body element scrolls
    // vertically but has no horizontal extent of its own (the wide `minWidth`
    // lives on the parent), so a sideways gesture over the grid found nothing to
    // scroll here AND was forbidden from reaching the parent x-scroller. Only the
    // lane headers worked, because they sit outside this element.
    assert.ok(!/overscrollBehavior:\s*"contain"/.test(src),
      "the both-axes shorthand must not come back");
    assert.ok(src.includes('overscrollBehaviorY: "contain"'),
      "vertical containment is kept; the horizontal axis must stay chainable");

    // The two-container architecture itself is unchanged.
    assert.ok(src.includes('className="hidden sm:block overflow-x-auto"'),
      "the parent is still the horizontal scroller");
    assert.ok(/ref=\{dayScrollRef\} className="grid overflow-y-auto"/.test(src),
      "the body is still the vertical scroller");
  });

  test("19b. sticky headers and the shared grid template are untouched", () => {
    assert.ok(src.includes('className="grid sticky top-0 z-10"'), "lane headers stay sticky");
    // Header and body must keep ONE template or they drift apart on scroll.
    assert.equal((src.match(/gridTemplateColumns: cols/g) ?? []).length, 2,
      "header and body share one column template");
    assert.ok(src.includes("minWidth: `${minW}px`"), "the scrollable width still comes from the parent");
  });

  test("20. appointment interactions are untouched by the scroll fix", () => {
    // Nothing was attached to labels, no wheel/pointer handler was introduced,
    // and there was never any drag-to-scroll or drag-and-drop to preserve — the
    // fix is purely declarative CSS on the container.
    for (const hack of ["onWheel", "onPointerDown", "onPointerMove", "onMouseMove", "onTouchMove", "onDragStart", "draggable"]) {
      assert.ok(!src.includes(hack), `the fix must not add ${hack}`);
    }
    assert.ok(src.includes("onClick={() => onSelect("), "appointments are still plain clickable buttons");
    // The auto-scroll-to-now behaviour still owns scrollTop.
    assert.ok(src.includes("el.scrollTop = Math.max(0, y)"), "auto-scroll to the current time survives");
    // No gesture locking: a `touch-action` that pins one axis is exactly what
    // makes a touch calendar feel broken, so the fix must not introduce one.
    assert.ok(!/touchAction|touch-action/.test(src), "no axis-locking touch-action may be added");
  });

  test("20b. the week view never had the nested-scroll bug and is left alone", () => {
    const week = src.slice(src.indexOf("function WeekGrid"));
    assert.ok(week.includes('className="overflow-x-auto"'), "week view scrolls horizontally");
    assert.ok(!week.includes("overscrollBehavior"), "and has no nested vertical scroller to contain");
  });
});
