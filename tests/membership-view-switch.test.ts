import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveViewSwitch, usesProductSwitch } from "../lib/view-switch";

/**
 * Joining a salon with a code created the Employee row, flipped the role to
 * EMPLOYEE, showed "You are now part of <salon>" and then changed nothing the
 * person could see: no salon context, no Client/Salon switch, an account that
 * looked exactly like a customer's.
 *
 * Root cause: `resolveViewSwitch({ isAdmin, ownsBusiness })`. Membership was
 * never one of the inputs, so the only way to have a salon was to OWN one.
 *
 * These tests hold the two relationships apart — owning and working at — and
 * hold the line that the switch is navigation, never authorization.
 */

const JOIN = "lib/actions/join-code.ts";
const APPROVE = "lib/actions/join-requests.ts";
const OWNERSHIP = "lib/ownership.ts";
const INVITES = "lib/actions/employee-invitations.ts";
const SWITCH = "components/product-view-switcher.tsx";
const read = (p: string) => readFileSync(p, "utf8");

/**
 * Source with comments removed.
 *
 * These files DOCUMENT the things they must not do ("never from the `ownerView`
 * cookie"), so a naive substring check on the raw text fails on the very comment
 * that promises the guarantee. Assertions about behaviour run against code only.
 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s\/\/.*$/gm, "");

describe("view switch eligibility", () => {
  test("1. a plain customer gets no switch", () => {
    const kind = resolveViewSwitch({ isAdmin: false, ownsBusiness: false, isEmployee: false });
    assert.equal(kind, "none");
    assert.equal(usesProductSwitch(kind), false);
  });

  test("2. an owner gets the product switch", () => {
    const kind = resolveViewSwitch({ isAdmin: false, ownsBusiness: true, isEmployee: false });
    assert.equal(kind, "owner");
    assert.equal(usesProductSwitch(kind), true);
  });

  test("3. an employee member gets the product switch (the regression)", () => {
    const kind = resolveViewSwitch({ isAdmin: false, ownsBusiness: false, isEmployee: true });
    assert.equal(kind, "employee");
    assert.equal(usesProductSwitch(kind), true);
  });

  test("4. someone with neither relationship gets nothing, whatever else is true", () => {
    // The omitted-flag form must behave exactly like an explicit false, so an
    // un-migrated caller cannot accidentally grant the switch.
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: false }), "none");
  });

  test("5. an admin keeps the existing admin switch, and it outranks the rest", () => {
    assert.equal(resolveViewSwitch({ isAdmin: true, ownsBusiness: false, isEmployee: false }), "admin");
    assert.equal(resolveViewSwitch({ isAdmin: true, ownsBusiness: true, isEmployee: true }), "admin");
    assert.equal(usesProductSwitch("admin"), false);
  });

  test("6. ownership outranks membership — an owner lands in their own salon", () => {
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: true, isEmployee: true }), "owner");
  });

  test("7. eligibility is computed from server facts, never from a cookie", () => {
    const src = code("lib/view-switch.ts");
    assert.ok(!/cookies\(\)/.test(src), "the rule must not read cookies");
    assert.ok(!src.includes("document."), "the rule must not read client state");
    // A forged `ownerView` cookie is presentation only: nothing in the
    // eligibility rule consults it (the only mentions are in the comments).
    assert.ok(!src.includes("ownerView"), "eligibility must not depend on the view cookie");
    const sw = read(SWITCH);
    assert.ok(sw.includes("presentation"), "the cookie must stay documented as presentation-only");
  });
});

describe("membership resolution is server-authoritative", () => {
  test("8. resolveBusinessAccess reads the session, never a request-supplied id", () => {
    const src = read(OWNERSHIP);
    assert.ok(src.includes("resolveBusinessAccess"), "the resolver must exist");
    assert.ok(src.includes("getServerUser()"), "it must start from the authenticated session");
    assert.ok(!/cookies\(\)/.test(src), "ownership/membership must not consult cookies");
    // No parameter means no attacker-chosen business.
    assert.ok(
      /export async function resolveBusinessAccess\(\): Promise<BusinessAccess>/.test(src),
      "resolveBusinessAccess must take no arguments"
    );
  });

  test("9. only an ACTIVE employee row grants a salon context", () => {
    const src = read(OWNERSHIP);
    const block = src.slice(src.indexOf("employeeProfiles:"));
    assert.ok(block.includes("isActive: true"), "deactivating a specialist must remove their access");
  });

  test("10. a joined employee can only ever enter their OWN salon", () => {
    const src = read(OWNERSHIP);
    // The employee destination is a fixed route, not a per-business path: the
    // employee layout then re-resolves membership server-side and redirects if
    // there is none. There is no id to tamper with anywhere in the chain.
    assert.ok(src.includes('EMPLOYEE_SALON_HREF = "/employee/dashboard"'));
    assert.ok(!src.includes("/employee/${"), "no dynamic per-business employee path");

    const layout = read("app/employee/(employee-layout)/layout.tsx");
    assert.ok(layout.includes("resolveEmployeeContext()"), "the layout must re-check membership");
    assert.ok(layout.includes('redirect("/")'), "a non-member must be turned away");
  });

  test("11. an employee never reaches the OWNER panel", () => {
    const layout = read("app/business/(business-layout)/layout.tsx");
    // The business layout resolves ownership independently and bounces a
    // non-owning employee to their own dashboard.
    assert.ok(layout.includes("ownedBusinesses"), "the owner panel gates on ownership");
    assert.ok(layout.includes('redirect("/employee/dashboard")'), "an employee is redirected out");
    // ...and the switch it renders is the owner one, never the employee route.
    assert.ok(layout.includes("OWNER_SALON_HREF"));
    assert.ok(!layout.includes("EMPLOYEE_SALON_HREF"));
  });
});

describe("join code: what it grants, and what it must never grant", () => {
  test("12. applying takes ONLY a code — no business id can be injected", () => {
    const src = read(JOIN);
    assert.ok(
      /export async function requestJoinByCode\(rawCode: string\)/.test(src),
      "the join action must accept nothing but a code"
    );
    // The business is looked up BY the code, so the caller never names it.
    assert.ok(src.includes("where: { joinCode: code }"), "the salon is resolved from the code alone");
  });

  test("13. a code creates a REQUEST, never a membership and never ownership", () => {
    const src = code(JOIN);
    // The one write is the request row. Nothing here makes anybody a member.
    assert.ok(src.includes("employeeJoinRequest.upsert"), "the code must produce a pending request");
    assert.ok(/status: "PENDING"/.test(src), "and it must start PENDING");
    assert.ok(!/employee\.create/.test(src), "typing a code must not create an Employee row");
    assert.ok(!/role: "EMPLOYEE"/.test(src), "typing a code must not change the account role");
    assert.ok(!src.includes('"BUSINESS_OWNER"'), "applying must never assign the owner role");
    // ownerId appears only as a READ (selected, then compared) — never inside a
    // write payload, which is what would actually transfer a salon.
    assert.ok(!/data:\s*\{[^}]*ownerId/.test(src), "applying must never write an ownerId");
    assert.ok(!/\.update\([^)]*ownerId/.test(src), "applying must never reassign ownership");
    // An owner cannot "join" their own salon into a second relationship.
    assert.ok(src.includes("business.ownerId === dbUser.id"), "the owner case is rejected explicitly");
  });

  test("14. APPROVAL is what creates membership, and it refreshes the shells", () => {
    const src = code(APPROVE);
    assert.ok(src.includes("tx.employee.create"), "approval is the one place a membership row is created");
    assert.ok(/data: \{ role: "EMPLOYEE" \}/.test(src), "and the only place the role is upgraded");
    assert.ok(src.includes('if (applicant.role === "CUSTOMER")'), "the upgrade is customer→employee only");
    // Revalidating only the PAGES left the cached layouts — which is where the
    // switch lives — showing the pre-approval state.
    assert.ok(src.includes('revalidatePath("/customer", "layout")'), "the customer shell must refresh");
    assert.ok(src.includes('revalidatePath("/employee", "layout")'), "the employee shell must refresh");
  });

  test("15. the join code is throttled and leaks nothing about unknown codes", () => {
    const src = read(JOIN);
    assert.ok(src.includes("tooManyAttempts"), "guessing must be rate limited");
    // Malformed and unknown codes must be indistinguishable.
    assert.ok((src.match(/T\.errUnknown/g) ?? []).length >= 2, "shape and existence failures share one message");
  });
});

describe("invite to <salon>: functional, salon-scoped, honest", () => {
  test("16. the CTA names the actual salon, interpolated — not a generic invite", () => {
    const controls = read("components/business/employee-account-controls.tsx");
    assert.ok(controls.includes("interpolate(T.inviteToSalon, { salon: salonName })"),
      "the label must carry the real salon name");
    const staff = read("app/business/(business-layout)/staff/page.tsx");
    assert.ok(/salonName=\{/.test(staff), "the salon name must be passed from the server");
  });

  test("17. the invite targets the owner's OWN salon and no other", () => {
    const src = read(INVITES);
    // Every lookup is scoped by the resolved owner context, so passing another
    // salon's employee id simply finds nothing.
    assert.ok(src.includes("businessId: ctx.businessId"), "the employee lookup must be tenant-scoped");
    assert.ok(src.includes("const ctx = await ownerCtx();"), "the context comes from the session");
    assert.ok(src.includes("ownedBusinesses"), "ownerCtx resolves the caller's own business");
  });

  test("18. an invite never grants owner permissions", () => {
    const src = read(INVITES);
    assert.ok(!src.includes('role: "BUSINESS_OWNER"'), "accepting an invite must not make an owner");
    assert.ok(src.includes("Never grants owner permissions"), "the guarantee stays documented");
  });

  test("19. a send that did not happen is reported, not dressed up as success", () => {
    const src = read(INVITES);
    // The bug: the {sent} result was discarded and {ok:true} returned regardless.
    assert.ok(src.includes("const { sent } = await sendEmployeeInvitationEmail"),
      "the send result must be captured");
    assert.ok(src.includes("delivered: sent"), "the caller must learn whether it was delivered");

    const controls = read("components/business/employee-account-controls.tsx");
    assert.ok(controls.includes("r.delivered === false"), "the UI must handle an undelivered invite");
    assert.ok(controls.includes("T.inviteNotDelivered"), "and say so, pointing at the join code");
  });
});
