import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  grantsSalonContext,
  awaitsOwnerDecision,
  canReapply,
  membershipDisplayState,
} from "../lib/employee/membership";
import { resolveViewSwitch, usesProductSwitch } from "../lib/view-switch";
import { PLAN_ENTITLEMENTS, planLimitInfo, withinLimit } from "../lib/entitlements";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";

/**
 * The join code used to BE the membership. Typing eight characters created the
 * Employee row, flipped the role to EMPLOYEE, put the person on the public team
 * list and opened the salon panel — with the owner never asked. Codes get
 * forwarded, photographed off a printout and kept by people who left, so
 * "holds the code" was standing in for a claim it cannot support.
 *
 * The contract these tests hold:
 *
 *     join code       → the right to ASK (a PENDING request, nothing else)
 *     owner approval  → the Employee row, and only then a salon context
 *
 * Plus the two things approval must never do quietly: exceed the plan's
 * specialist limit, or leave half a membership behind when it refuses.
 */

const read = (p: string) => readFileSync(p, "utf8");

/**
 * Source with comments stripped.
 *
 * These files DOCUMENT what they must not do ("must not create an Employee
 * row"), so a substring check against the raw text fails on the very comment
 * that promises the guarantee. Behavioural assertions run against code only.
 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s\/\/.*$/gm, "");

const JOIN = "lib/actions/join-code.ts";
const APPROVE = "lib/actions/join-requests.ts";
const STAFF_ACTIONS = "lib/actions/staff.ts";
const STAFF_PAGE = "app/business/(business-layout)/staff/page.tsx";
const STAFF_CLIENT = "app/business/(business-layout)/staff/staff-client.tsx";
const REQUESTS_CARD = "components/business/join-requests-card.tsx";
const JOIN_CARD = "components/customer/join-salon-card.tsx";
const CODE_CARD = "components/business/join-code-card.tsx";
const NOTIFY = "lib/employee/join-notifications.ts";
const SCHEMA = "prisma/schema.prisma";
const DICTS = { pl, en, de, tr };

// ── What each request state grants ───────────────────────────────────────────

describe("a request state is not an authorization", () => {
  test("4. a PENDING request grants no salon context", () => {
    assert.equal(grantsSalonContext("PENDING"), false);
    assert.equal(awaitsOwnerDecision("PENDING"), true);
    // And structurally: there is no Employee row, so the resolver that decides
    // the switch sees a plain customer.
    assert.equal(resolveViewSwitch({ isAdmin: false, ownsBusiness: false, isEmployee: false }), "none");
  });

  test("5. a REJECTED request grants no salon context, and is not a ban", () => {
    assert.equal(grantsSalonContext("REJECTED"), false);
    assert.equal(awaitsOwnerDecision("REJECTED"), false);
    assert.equal(canReapply("REJECTED"), true, "a rejection must not lock someone out forever");
    assert.equal(canReapply("PENDING"), false, "an application already in the queue is not re-submitted");
    assert.equal(canReapply("APPROVED"), false, "a member does not re-apply");
    assert.equal(canReapply(null), true, "someone who never applied can");
  });

  test("3. only APPROVED grants it — and only via the row it creates", () => {
    assert.equal(grantsSalonContext("APPROVED"), true);
    const kind = resolveViewSwitch({ isAdmin: false, ownsBusiness: false, isEmployee: true });
    assert.equal(kind, "employee");
    assert.equal(usesProductSwitch(kind), true);
  });

  test("the displayed status never overstates the relationship", () => {
    assert.equal(membershipDisplayState({ activeMembership: false, requestStatus: null }), "none");
    assert.equal(membershipDisplayState({ activeMembership: false, requestStatus: "PENDING" }), "pending");
    assert.equal(
      membershipDisplayState({ activeMembership: false, requestStatus: "PENDING", blocked: true }),
      "blocked"
    );
    assert.equal(membershipDisplayState({ activeMembership: false, requestStatus: "REJECTED" }), "rejected");
    // An ACTIVE Employee row is the only real membership evidence, so it wins
    // over a stale request row that says otherwise.
    assert.equal(membershipDisplayState({ activeMembership: true, requestStatus: "REJECTED" }), "approved");
  });
});

describe("7. nothing a client can forge grants salon access", () => {
  test("the switch's eligibility never reads client state", () => {
    const rule = code("lib/view-switch.ts");
    for (const clientSource of ["cookies(", "document.", "localStorage", "searchParams", "headers("]) {
      assert.ok(!rule.includes(clientSource), `eligibility must not read ${clientSource}`);
    }
    assert.ok(!rule.includes("ownerView"), "the view cookie is presentation only");
  });

  test("membership is resolved from the session, with no id the caller supplies", () => {
    const own = code("lib/ownership.ts");
    assert.ok(/export async function resolveBusinessAccess\(\): Promise<BusinessAccess>/.test(own),
      "the resolver takes no arguments, so no business can be named by the caller");
    assert.ok(own.includes("getServerUser()"), "it starts from the authenticated session");
    assert.ok(!/cookies\(/.test(own), "and consults no cookie");
    // A pending request is invisible to it: only an ACTIVE Employee row counts.
    const block = own.slice(own.indexOf("employeeProfiles:"));
    assert.ok(block.includes("isActive: true"), "only an active membership resolves");
    assert.ok(!own.includes("employeeJoinRequest"), "a request row must never be read as access");
  });

  test("a forged request row would still open no door", () => {
    // Even if the request table were somehow written to, nothing reads it for
    // authorization: the salon panel gates on the Employee row, and the
    // employee shell re-checks that on every render.
    const layout = read("app/employee/(employee-layout)/layout.tsx");
    assert.ok(layout.includes("resolveEmployeeContext()"), "the shell re-resolves membership");
    assert.ok(layout.includes('redirect("/")'), "and turns a non-member away");
    const ctx = code("lib/employee/context.ts");
    assert.ok(ctx.includes("isActive: true"), "the context requires an ACTIVE row");
    assert.ok(!ctx.includes("employeeJoinRequest"), "and never consults the request queue");
  });

  test("the owner's decision endpoints cannot be aimed at another salon", () => {
    const src = code(APPROVE);
    // Neither action takes a businessId; both derive it from the session and
    // scope every read and write by it.
    assert.ok(/approveJoinRequest\(requestId: string\)/.test(src));
    assert.ok(/rejectJoinRequest\(requestId: string\)/.test(src));
    // Every place a business id is READ from (as opposed to written as an
    // object key) must be `ctx.businessId` — the value ownerCtx resolved from
    // the session. So there is no path where the caller names a salon.
    const reads = [...src.matchAll(/(?<![\w.])([\w?]+\.)?businessId(?!\s*:)/g)].map((m) => m[0]);
    assert.ok(reads.length > 0, "the actions do scope by business id");
    for (const r of reads) {
      assert.equal(r, "ctx.businessId", `business id must come from the session, saw: ${r}`);
    }
    assert.ok(src.includes("const ctx = await ownerCtx();"), "and ownerCtx is the only source");
  });
});

// ── The code creates a request, and only a request ───────────────────────────

describe("a valid join code creates a PENDING request", () => {
  test("8. the action writes exactly one request row, starting PENDING", () => {
    const src = code(JOIN);
    assert.ok(src.includes("employeeJoinRequest.upsert"), "one row per (salon, person)");
    assert.ok(/create: \{ businessId: business\.id, userId: dbUser\.id, status: "PENDING" \}/.test(src));
    // Re-applying after a rejection reopens the SAME row and clears the old
    // decision, rather than stacking duplicates in the owner's queue.
    assert.ok(/update: \{ status: "PENDING", decidedAt: null, decidedBy: null, blockedAt: null \}/.test(src));
  });

  test("9. it does NOT create a membership, a role, or any access", () => {
    const src = code(JOIN);
    assert.ok(!/employee\.create/.test(src), "no Employee row may be created by typing a code");
    assert.ok(!/employee\.update/.test(src), "and none may be activated either");
    assert.ok(!/role: "EMPLOYEE"/.test(src), "the account role must not change");
    assert.ok(!/user\.update/.test(src), "the user record must not be written at all");
    // The one Employee read is the "you are already on the team" check.
    assert.ok(src.includes("isActive: true"), "an existing membership short-circuits the request");
  });

  test("the applicant is told it is a REQUEST, in every locale", () => {
    for (const [locale, dict] of Object.entries(DICTS)) {
      const T = dict.pages.joinSalon;
      assert.ok(T.requestSent.includes("{salon}"), `${locale}: the confirmation must name the salon`);
      assert.ok(T.requestSent.trim().length > 20, `${locale}: the confirmation must actually explain`);
      // The old copy promised the join had happened. Nothing may promise that
      // before an owner has approved.
      assert.notEqual(T.submit, T.joined, `${locale}: submitting is not joining`);
      assert.ok(T.statusPendingBody.includes("{salon}"), `${locale}: the pending status names the salon`);
    }
  });

  test("18. regenerating the code invalidates the previous one", () => {
    const src = code(JOIN);
    // One column, overwritten. There is no history table, because keeping old
    // codes alive is the opposite of revoking them.
    const regen = src.slice(src.indexOf("export async function regenerateJoinCode"));
    assert.ok(regen.includes("mintUniqueCode()"), "a fresh code is minted");
    assert.ok(/data: \{ joinCode: code, joinCodeUpdatedAt: new Date\(\) \}/.test(regen), "and it replaces the old value");
    assert.ok(!/joinCodeHistory|previousCode|oldCode/.test(src), "no old code may survive regeneration");
    // And the schema keeps it unique, so a resolved code names exactly one salon.
    assert.ok(/joinCode\s+String\?\s+@unique/.test(read(SCHEMA)), "join codes stay unique");
  });

  test("10-code. the security properties of the code itself are unchanged", () => {
    const src = code(JOIN);
    assert.ok(src.includes("tooManyAttempts"), "guessing must still be rate limited");
    assert.ok((src.match(/T\.errUnknown/g) ?? []).length >= 2, "shape and existence failures share one message");
    assert.ok(src.includes("where: { joinCode: code }"), "the salon is resolved from the code alone");
    assert.ok(
      /export async function requestJoinByCode\(rawCode: string\)/.test(src),
      "the action accepts nothing but a code"
    );
  });
});

// ── Approval is the one place membership is created ──────────────────────────

describe("owner approval", () => {
  test("10. approve creates the membership, scoped to the owner's own salon", () => {
    const src = code(APPROVE);
    assert.ok(src.includes("export async function approveJoinRequest"));
    assert.ok(src.includes("const ctx = await ownerCtx();"), "the salon comes from the session");
    assert.ok(src.includes("ownedBusinesses"), "ownerCtx resolves the caller's OWN business");
    // Every lookup is tenant-scoped: another salon's request id finds nothing.
    assert.ok(
      (src.match(/businessId: ctx\.businessId/g) ?? []).length >= 3,
      "request lookup, claim and employee writes must all be tenant-scoped"
    );
    assert.ok(src.includes("tx.employee.create"), "the Employee row is created here");
    assert.ok(/status: "APPROVED"/.test(src), "and the request is marked decided");
  });

  test("11. reject decides the request without creating anything", () => {
    const src = code(APPROVE);
    const reject = src.slice(src.indexOf("export async function rejectJoinRequest"));
    assert.ok(/status: "REJECTED"/.test(reject));
    assert.ok(!/employee\.create/.test(reject), "rejecting must never create a membership");
    assert.ok(reject.includes("businessId: ctx.businessId"), "and it is tenant-scoped too");
    assert.ok(reject.includes("notifyApplicantRejected"), "the applicant is told");
  });

  test("two approvals of one request cannot both succeed", () => {
    const src = code(APPROVE);
    // The claim is a conditional update: exactly one caller sees count === 1.
    assert.ok(/updateMany\(\{[\s\S]*?status: "PENDING"[\s\S]*?\}\)/.test(src), "the request is claimed conditionally");
    assert.ok(src.includes("if (claimed.count === 0) throw new Error(\"request_gone\")"),
      "the loser of the race must abort before writing anything");
  });

  test("12. an approved specialist appears in the team with no extra step", () => {
    // The team grid renders business.employees, and approval writes exactly
    // that row — there is no separate "add to team" action to forget.
    const page = read(STAFF_PAGE);
    assert.ok(page.includes("employees: {"), "the team list comes from the Employee rows");
    const src = code(APPROVE);
    assert.ok(src.includes('revalidatePath("/business/staff")'), "the team page must refresh on approval");
    // Linked to the REAL account, never a second user record.
    assert.ok(src.includes("userId: applicant.id"), "the row links to the applicant's account");
    assert.ok(!/user\.create/.test(src), "approval must never create a duplicate user");
    // And a row that already exists is reused rather than duplicated.
    assert.ok(src.includes("const linked = await tx.employee.findFirst"), "an existing row is reused");
    assert.ok(src.includes("const adoptable"), "a legacy e-mail row is adopted, not duplicated");
  });

  test("pending requests are listed separately from the team, never mixed in", () => {
    const page = read(STAFF_PAGE);
    assert.ok(page.includes('status: "PENDING"'), "only undecided requests are queued");
    const client = read(STAFF_CLIENT);
    assert.ok(client.includes("<JoinRequestsCard"), "the queue is its own section");
    // The grid iterates employees; requests are a different array entirely.
    assert.ok(client.includes("employees.map("), "the team grid still renders memberships");
    assert.ok(client.includes("pendingRequests"), "and requests arrive as their own prop");
  });

  test("the approval queue has real controls with accessible names", () => {
    const src = read(REQUESTS_CARD);
    assert.ok(src.includes("approveJoinRequest") && src.includes("rejectJoinRequest"));
    assert.ok(/aria-label=\{`\$\{T\.approve\} — \$\{name\}`\}/.test(src), "approve names WHO it approves");
    assert.ok(/aria-label=\{`\$\{T\.reject\} — \$\{name\}`\}/.test(src), "reject names WHO it rejects");
    assert.ok(src.includes("if (requests.length === 0) return null"), "an empty queue renders nothing");
  });
});

// ── The plan limit ───────────────────────────────────────────────────────────

describe("plan specialist limit", () => {
  test("13. approval enforces it, under the same lock every other seat takes", () => {
    const src = code(APPROVE);
    assert.ok(src.includes("assertCanAddEmployee(tx, ctx.businessId"), "the shared guard is used");
    assert.ok(src.includes("PlanLimitError"), "and its typed failure is handled");
    // Inside the transaction, so the count and the write cannot drift apart.
    const tx = src.slice(src.indexOf("prisma.$transaction"), src.indexOf("} catch (e)"));
    assert.ok(tx.includes("assertCanAddEmployee"), "the check must be inside the transaction");
    // The guard itself takes a row lock, which is what serializes two different
    // requests racing for the last seat.
    const guard = read("lib/entitlement-guard.ts");
    assert.ok(guard.includes("FOR UPDATE"), "concurrent approvals are serialized by a row lock");
    // Limits are never hardcoded at the call site.
    assert.ok(!/=== "PRO"|=== "TEAM"|maxEmployees\s*=/.test(src), "no plan logic may be restated here");
  });

  test("14. a limit hit leaves NO partial membership behind", () => {
    const src = code(APPROVE);
    // The claim, the guard and the employee write share one transaction, so a
    // throw rolls back all three: no approved request without a row, no row
    // without an approved request.
    const tx = src.slice(src.indexOf("prisma.$transaction"), src.indexOf("} catch (e)"));
    for (const write of ['status: "APPROVED"', "assertCanAddEmployee", "tx.employee.create"]) {
      assert.ok(tx.includes(write), `${write} must be inside the transaction`);
    }
    // The request stays actionable rather than becoming a terminal state the
    // applicant would have to escape by re-applying.
    assert.ok(src.includes("blockedAt: new Date()"), "the blocked attempt is recorded");
    assert.ok(/status: "PENDING"[\s\S]{0,120}data: \{ blockedAt/.test(src), "and the request stays PENDING");
    assert.ok(!/status: "BLOCKED"/.test(src), "there is no terminal blocked state to get stuck in");
    // The recovery write happens AFTER the rollback, or it would vanish with it.
    const catchBlock = src.slice(src.indexOf("} catch (e)"));
    assert.ok(catchBlock.includes("blockedAt: new Date()"), "recorded outside the rolled-back transaction");
  });

  test("15+16. BOTH sides are notified, through the existing notification model", () => {
    const src = code(APPROVE);
    assert.ok(src.includes("notifyPlanLimitBlocked"), "the limit hit notifies");
    const n = code(NOTIFY);
    // One function, both recipients — neither can act on the other's half.
    const fn = n.slice(n.indexOf("export async function notifyPlanLimitBlocked"));
    assert.ok(fn.includes("applicantUserId"), "the applicant is told");
    assert.ok(fn.includes("ownerUserId"), "the owner is told");
    assert.ok(fn.includes("limitApplicantBody") && fn.includes("limitOwnerBody"));
    // The existing infrastructure, not a second one.
    assert.ok(n.includes("prisma.notification.create"), "it writes to the one Notification model");
    assert.ok(n.includes('channel: "IN_APP"'), "on the in-app channel the bell already reads");
    assert.ok(!/sendEmail|twilio|sms/i.test(n), "no new delivery system is invented here");
  });

  test("17. the plan name is the salon's REAL plan, never a hardcoded tier", () => {
    const src = code(APPROVE);
    // Taken from the typed error the entitlement check raised, so it is the
    // plan that actually did the blocking.
    assert.ok(src.includes("planLabel: e.info.planLabel"), "the label comes from the limit result");
    assert.ok(src.includes("limit: e.info.limit"), "as does the number");
    assert.ok(!/"Professional"|"Ultimate"|"Team"|"Solo"/.test(src), "no plan name may be written into the code");

    // The copy interpolates it rather than naming one.
    for (const [locale, dict] of Object.entries(DICTS)) {
      const T = dict.joinNotifications;
      assert.ok(T.limitApplicantBody.includes("{plan}"), `${locale}: applicant copy must interpolate the plan`);
      assert.ok(T.limitOwnerBody.includes("{plan}"), `${locale}: owner copy must interpolate the plan`);
      assert.ok(T.limitOwnerBody.includes("{name}"), `${locale}: the owner must learn WHO could not join`);
      assert.ok(!/Professional|Ultimate/.test(T.limitApplicantBody), `${locale}: no plan name in the template`);
    }
    // And the labels it interpolates are the real catalogue ones.
    assert.equal(PLAN_ENTITLEMENTS.PRO.label, "Professional");
    assert.equal(planLimitInfo("employee", "PRO", 15).planLabel, "Professional");
    assert.equal(planLimitInfo("employee", "PRO", 15).limit, 15);
  });

  test("the limit arithmetic the guard applies is the shared one", () => {
    // 15 active on Professional means the 16th is refused; 14 leaves room.
    assert.equal(withinLimit("PRO", "employee", 15), true);
    assert.equal(withinLimit("PRO", "employee", 16), false);
    assert.equal(withinLimit("ULTIMATE", "employee", 999), true, "Ultimate is unlimited");
    const info = planLimitInfo("employee", "TEAM", 4);
    assert.equal(info.used, 4);
    assert.equal(info.requiredPlanLabel, "Professional", "the upgrade suggestion is derived, not written");
  });

  test("notifications are written in the RECIPIENT's language, not the actor's", () => {
    const n = code(NOTIFY);
    assert.ok(n.includes("select: { id: true, locale: true }"), "the recipient's locale is read");
    assert.ok(n.includes("getDictionary(to.locale)") || n.includes("getDictionary(applicant.locale)"),
      "and used to render the text");
    assert.ok(n.includes('isLocale(u.locale) ? u.locale : "pl"'), "an unknown stored locale falls back safely");
  });
});

// ── What the owner may and may not edit ──────────────────────────────────────

describe("owner editing an approved specialist", () => {
  test("19. salon-side fields stay editable, including the schedule", () => {
    const src = code(STAFF_ACTIONS);
    assert.ok(src.includes("export async function updateEmployee"), "the editor survives");
    for (const field of ["firstName", "lastName", "title", "bio", "avatarUrl", "color", "isActive", "isAccepting"]) {
      assert.ok(src.includes(field), `${field} must remain editable`);
    }
    assert.ok(src.includes("employeeService.createMany"), "service assignment stays");
    // A partial update must not clear the fields it did not mention. The
    // visibility toggle sends `{ isActive }` alone, and `title: x?.trim() ||
    // null` turned that into "wipe the title and bio".
    for (const field of ["title", "bio", "avatarUrl"]) {
      assert.ok(
        new RegExp(`data\\.${field} !== undefined \\?`).test(src),
        `${field} must only be written when the caller actually sent it`
      );
    }
    // The schedule the availability engine has always read, finally writable.
    assert.ok(src.includes("export async function updateEmployeeWorkingHours"), "a schedule editor exists");
    assert.ok(src.includes("employeeWorkingHours.createMany"), "and it writes the rows");
    const avail = read("lib/availability.ts");
    assert.ok(avail.includes("employeeWorkingHours.findMany"), "which is the table availability reads");
  });

  test("the schedule editor is tenant-scoped and validated server-side", () => {
    const src = code(STAFF_ACTIONS);
    const fn = src.slice(src.indexOf("export async function updateEmployeeWorkingHours"));
    assert.ok(fn.includes("where: { id: employeeId, businessId }"), "another salon's employee finds nothing");
    assert.ok(fn.includes("HHMM.test"), "times are validated, not trusted");
    assert.ok(fn.includes("toMinutes(d.endTime) <= toMinutes(d.startTime)"), "an inverted day is rejected");
    // "No custom hours" must be an EMPTY schedule — writing seven closed days
    // would mean the opposite to the availability engine.
    const client = read(STAFF_CLIENT);
    assert.ok(client.includes("schedule.custom ? schedule.days : []"), "clearing writes no rows");
  });

  test("20. the owner can never reach the specialist's credentials or account", () => {
    const src = code(STAFF_ACTIONS);
    // The action writes ONE table. `supabaseId` appears exactly once, as the
    // lookup that resolves the CALLER's own business from their session — a
    // read of the owner's identity, never a write to anyone's.
    assert.ok(!/tx\.user\.|prisma\.user\.update|prisma\.user\.delete/.test(src),
      "the staff editor must never write the users table");
    assert.equal((src.match(/supabaseId/g) ?? []).length, 1, "supabaseId is only the caller's own session lookup");
    assert.ok(src.includes("where: { supabaseId: user.id }"), "and it is a read, in a where clause");
    for (const forbidden of ["password", "auth.admin", "resetPassword", "createAdminClient"]) {
      assert.ok(!src.includes(forbidden), `the staff editor must not touch ${forbidden}`);
    }
    // A linked specialist's own contact details are theirs to maintain: the
    // server drops them from the update rather than trusting the form.
    assert.ok(src.includes("const linked = current.userId !== null"), "linkage is resolved server-side");
    assert.ok(/\.\.\.\(linked \|\| data\.email === undefined \? \{\} : \{ email: data\.email \|\| null \}\)/.test(src),
      "the e-mail of a linked account is ignored");
    assert.ok(/\.\.\.\(linked \|\| data\.phone === undefined \? \{\} : \{ phone: data\.phone \|\| null \}\)/.test(src),
      "as is the phone");
    const client = read(STAFF_CLIENT);
    assert.ok(client.includes("readOnly={editingLinked}"), "and shown read-only, not silently dropped");
    assert.ok(client.includes("T.contactOwned"), "with a reason the owner can read");
  });

  test("11-manual. the manual 'add specialist' creation flow is gone", () => {
    const src = code(STAFF_ACTIONS);
    assert.ok(!src.includes("export async function createEmployee"), "owners cannot conjure a specialist");
    const client = read(STAFF_CLIENT);
    assert.ok(!client.includes("createEmployee"), "and the UI cannot call one");
    assert.ok(!client.includes("openAdd"), "no add-person entry point survives");
    assert.ok(!client.includes('searchParams.get("action")'), "nor the ?action=new deep link");
    const nav = read("components/layout/business-nav.tsx");
    assert.ok(!nav.includes('"/business/staff?action=new"'), "nor the topbar shortcut");
    // Deleting and deactivating stay: an owner must still be able to remove
    // someone who left.
    assert.ok(src.includes("export async function deleteEmployee"));
    assert.ok(src.includes("export async function toggleEmployeeActive"));
  });
});

// ── What the owner and the specialist are told ───────────────────────────────

describe("join-code instructions are accurate about approval", () => {
  test("13-copy. the owner's panel explains the whole sequence, in every locale", () => {
    for (const [locale, dict] of Object.entries(DICTS)) {
      const T = dict.pages.staff;
      assert.ok(T.codeShareHint.trim().length > 30, `${locale}: the owner needs a sentence to pass on`);
      // The five steps, ending in approval — not "and they're in".
      assert.ok(T.codeHelpBody.includes("5."), `${locale}: the help text must walk through the steps`);
      assert.ok(T.codeBody.includes("{salon}"), `${locale}: the panel names the salon`);
      assert.ok(T.requestsTitle.trim().length > 0 && T.requestsBody.trim().length > 20,
        `${locale}: the queue explains itself`);
      assert.ok(T.approve.trim().length > 0 && T.reject.trim().length > 0);
    }
  });

  test("no copy promises instant joining any more", () => {
    // Polish is the canonical dictionary, so its wording is pinned exactly.
    assert.ok(pl.pages.staff.codeBody.includes("prośbę"), "the owner panel says REQUEST");
    assert.ok(pl.pages.staff.codeBody.includes("zatwierdzisz"), "and names the approval");
    assert.ok(pl.pages.joinSalon.how4.includes("zatwierdza"), "step 4 is the owner approving");
    assert.ok(pl.pages.joinSalon.note.includes("nie daje dostępu"), "the note says the code grants nothing");
    assert.equal(en.pages.joinSalon.submit, "Send request", "the button asks, it does not join");
    assert.ok(en.pages.staff.codeHelpBody.includes("grants no access"),
      "the help text states what the code is NOT");
  });

  test("the owner-facing card actually renders the guidance", () => {
    const src = read(CODE_CARD);
    assert.ok(src.includes("T.codeShareHint"), "the share sentence is on screen, not just in the dictionary");
    assert.ok(src.includes("T.codeHelpBody"), "and the full explanation is reachable");
    assert.ok(src.includes("regenerateJoinCode") && src.includes("T.codeCopy"), "copy + regenerate survive");
  });

  test("the applicant keeps a durable status, not a vanishing toast", () => {
    const src = read(JOIN_CARD);
    assert.ok(src.includes("request"), "the card receives a server-resolved request");
    assert.ok(src.includes("T.statusPendingTitle") && src.includes("T.statusBlockedTitle") && src.includes("T.statusRejectedTitle"),
      "all three undecided states are stated");
    assert.ok(src.includes('role="status"'), "and announced to assistive tech");
    assert.ok(src.includes("router.refresh()"), "state is re-resolved from the server, not guessed");
    assert.ok(!src.includes("location.reload"), "no full-page reload hack");
    // Resolved server-side from the session, with no id supplied by the client.
    const page = read("app/customer/(customer-layout)/profile/page.tsx");
    assert.ok(page.includes("where: { userId: dbUser.id"), "the request is looked up by the session's user");
  });
});

// ── The onboarding checklist ─────────────────────────────────────────────────

describe("25. publication is not tied to clicking 'Copy link'", () => {
  test("the ring counts REQUIRED steps only", () => {
    const src = read("components/business/onboarding-checklist.tsx");
    assert.ok(src.includes("const doneCount = steps.filter((s) => s.done).length"),
      "progress must be computed from the required steps alone");
    assert.ok(src.includes("const total = steps.length"), "and so must the total");
    // The optional group is listed but never counted.
    assert.ok(src.includes("optionalSteps"), "optional steps exist as their own input");
    assert.ok(!/doneCount[\s\S]{0,80}extras/.test(src), "optional steps must not feed the counter");
    assert.ok(src.includes("if (doneCount === total) return null"),
      "the card must disappear once the required work is done");
  });

  test("copying a link and hiring a specialist are both OPTIONAL", () => {
    const dash = read("app/business/(business-layout)/dashboard/page.tsx");
    const required = dash.slice(dash.indexOf("const checklistSteps"), dash.indexOf("const optionalChecklistSteps"));
    assert.ok(!required.includes('key: "employee"'), "a solo salon is complete without a specialist");
    assert.ok(!required.includes('key: "copyLink"'), "copying a link is not a property of a salon");
    for (const key of ["service", "hours", "profile"]) {
      assert.ok(required.includes(`key: "${key}"`), `${key} is genuinely required`);
    }
    assert.ok(dash.includes('optionalSteps={optionalChecklistSteps}'), "the optional group is passed separately");
  });

  test("the required steps mirror what publication actually demands", () => {
    // lib/publication is the one truth for "is this salon live". The checklist
    // must not invent a requirement it does not have — which is exactly what
    // counting "copy link" did.
    const pub = read("lib/publication.ts");
    assert.ok(pub.includes("Employee is intentionally NOT a hard requirement"),
      "publication does not require a specialist");
    assert.ok(!pub.includes("copyLink") && !pub.includes("copied"),
      "publication has never known about the clipboard, and must not start");
    for (const key of ['key: "service"', 'key: "hours"']) {
      assert.ok(pub.includes(key), `publication requires ${key}`);
    }
  });
});

// ── The AI assistant's visible scope ─────────────────────────────────────────

describe("23-suggestions. the assistant's prompts advertise pricing and strategy", () => {
  test("every locale offers at least one pricing and one growth question", () => {
    const PRICE = /cen|price|preis|fiyat|tania|underpriced|günstig|ucuz/i;
    const GROWTH = /obłożen|retencj|fill|retention|Auslastung|sadakat|doldur|Kundenbindung/i;
    for (const [locale, dict] of Object.entries(DICTS)) {
      const chips = dict.pages.aiPage.suggestions;
      assert.ok(chips.some((c) => PRICE.test(c)), `${locale}: no pricing question is offered`);
      assert.ok(chips.some((c) => GROWTH.test(c)), `${locale}: no growth/retention question is offered`);
      assert.ok(chips.length >= 4, `${locale}: too few prompts to show the range`);
    }
  });
});
