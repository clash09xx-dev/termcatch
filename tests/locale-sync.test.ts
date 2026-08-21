import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pickLocale, isLocale, DEFAULT_LOCALE } from "../lib/i18n/config";
import { planLocaleReconciliation } from "../lib/i18n/locale-sync";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";

const DICTS = { pl, en, de, tr };
const read = (p: string) => readFileSync(p, "utf8");
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");

/**
 * The divergence: the cookie drove the UI, `User.locale` drove transactional
 * e-mail, and nothing owned the relationship. A Polish interface sent Turkish
 * confirmations because the account row genuinely said "tr" while the cookie
 * said "pl", and three separate code paths guaranteed they could never converge:
 *
 *   1. `resolveLocale` never passed `userLocale` to `pickLocale`, so the
 *      documented "account preference" step did not exist at runtime.
 *   2. Login copied account -> cookie ONLY when no cookie existed, and never
 *      the other way, so an existing mismatch was permanent.
 *   3. `setLocale` swallowed a failed account write and still reported success.
 *
 * These tests pin the rule and each of the three paths.
 */

// ── The decision table ───────────────────────────────────────────────────────

describe("reconciliation makes the two stores agree", () => {
  test("cookie and account already equal: nothing moves", async () => {
    const r = await planLocaleReconciliation("de", null, "de");
    assert.equal(r.action, "already-in-sync");
    assert.equal(r.locale, "de");
    assert.equal(r.cookieNeedsWrite, false);
  });

  test("only the account has a preference: it is copied to this device", async () => {
    // A fresh device, or cleared cookies. This is the case that used to leave a
    // signed-in user on their browser language instead of their own setting.
    const r = await planLocaleReconciliation(undefined, null, "tr");
    assert.equal(r.action, "account-copied-to-cookie");
    assert.equal(r.locale, "tr");
    assert.equal(r.cookieNeedsWrite, true, "the caller must write the cookie");
  });

  test("the two disagree: the DEVICE choice is promoted into the account", async () => {
    // The reported bug, in one call: cookie "pl" against account "tr".
    // `userId: null` keeps this a pure decision (no write attempted), which is
    // what makes the branch testable without a database.
    const r = await planLocaleReconciliation("pl", null, "tr");
    assert.equal(r.action, "cookie-adopted-into-account");
    assert.equal(r.locale, "pl", "the newer explicit choice wins");
    assert.equal(r.cookieNeedsWrite, false, "the cookie already holds it");
  });

  test("nothing chosen anywhere: no guess is persisted", async () => {
    const r = await planLocaleReconciliation(undefined, null, null);
    assert.equal(r.action, "nothing-to-sync");
    assert.equal(r.locale, null);
    assert.equal(r.cookieNeedsWrite, false);
  });

  test("garbage in either store is ignored, never stored", async () => {
    assert.equal((await planLocaleReconciliation("klingon", null, "tr")).locale, "tr");
    assert.equal((await planLocaleReconciliation("pl", null, "klingon")).locale, "pl");
    assert.equal((await planLocaleReconciliation("klingon", null, "klingon")).action, "nothing-to-sync");
  });

  test("after reconciliation the outcome is always a single valid locale", async () => {
    for (const cookie of [undefined, "pl", "en", "de", "tr", "nope"]) {
      for (const account of [null, "pl", "en", "de", "tr", "nope"]) {
        const r = await planLocaleReconciliation(cookie, null, account);
        if (r.locale !== null) {
          assert.ok(isLocale(r.locale), `produced an invalid locale for (${cookie}, ${account})`);
        }
      }
    }
  });
});

// ── The three paths that allowed divergence ──────────────────────────────────

describe("path 1: resolveLocale now really reads the account", () => {
  const SRC = code("lib/i18n/server.ts");

  test("the account preference is consulted, not just documented", () => {
    assert.ok(SRC.includes("accountLocale"), "the account lookup must be used");
    assert.ok(SRC.includes("getServerUser"), "resolved from the authenticated session");
  });

  test("the hot path stays free of database work", () => {
    // A valid cookie must short-circuit before any import or query, or every
    // server render pays for a lookup it does not need.
    assert.ok(/if \(cookie && fromCookie === cookie\) return fromCookie;/.test(SRC),
      "a valid cookie must return before any I/O");
    // Dynamic import inside Promise.all, so a fast-path render never even loads
    // Prisma or the Supabase server client.
    assert.ok(SRC.includes('import("@/lib/prisma")'), "the DB path must be imported lazily");
    const beforeLazy = SRC.slice(0, SRC.indexOf('import("@/lib/prisma")'));
    assert.ok(beforeLazy.includes("return fromCookie"), "the early return comes first");
  });

  test("resolution never writes a cookie (forbidden during render)", () => {
    assert.ok(!/jar\.set\(|cookies\(\)\.set\(/.test(SRC),
      "resolveLocale must stay read-only or Next.js will throw during render");
  });

  test("the pure rule orders cookie, then account, then browser", () => {
    assert.equal(pickLocale({ cookie: "de", userLocale: "tr", acceptLanguage: "en-US" }), "de");
    assert.equal(pickLocale({ userLocale: "tr", acceptLanguage: "en-US" }), "tr");
    assert.equal(pickLocale({ acceptLanguage: "de-DE,de;q=0.9" }), "de");
    assert.equal(pickLocale({}), DEFAULT_LOCALE);
    // An unusable value must not shadow the next step.
    assert.equal(pickLocale({ cookie: "nope", userLocale: "tr" }), "tr");
  });
});

describe("path 2: login reconciles in BOTH directions", () => {
  test("the password-login entry point uses the shared rule", () => {
    const SRC = code("actions/auth/index.ts");
    assert.ok(SRC.includes("reconcileLocaleOnLogin("), "must call the shared rule");
    // The old one-directional helper and its guard are gone.
    assert.ok(!SRC.includes("async function syncLocaleCookie"), "the local helper must be gone");
    assert.ok(!SRC.includes("respect an explicit on-device choice"), "and its skip-if-cookie guard");
  });

  test("the OAuth callback uses the same rule, on its own response", () => {
    const SRC = code("app/auth/callback/route.ts");
    assert.ok(SRC.includes("planLocaleReconciliation("), "must share the decision logic");
    // The old conditional "only when no cookie" behaviour must be gone.
    assert.ok(!/!request\.headers\.get\("cookie"\)\?\.includes/.test(SRC),
      "the skip-if-a-cookie-exists condition must be gone");
    // A redirect response needs the cookie set on itself.
    assert.ok(SRC.includes("res.cookies.set(LOCALE_COOKIE"), "cookie must ride this response");
  });

  test("both entry points pass a user id, so the account can actually be written", () => {
    for (const f of ["actions/auth/index.ts", "app/auth/callback/route.ts"]) {
      const SRC = code(f);
      assert.ok(/\n\s+id: true,/.test(SRC), `${f} must select the row id`);
    }
  });
});

describe("path 3: a failed account write is never silent", () => {
  const SRC = code("lib/actions/locale.ts");

  test("the account is written first, and the outcome is reported", () => {
    assert.ok(SRC.includes("persisted"), "the result must say whether it persisted");
    assert.ok(SRC.includes('error: "not_persisted"'), "and name the failure");
    // The swallowing catch is gone.
    assert.ok(!/catch \{\s*\}/.test(SRC), "no empty catch may remain");
    assert.ok(SRC.includes("console.error("), "a failure must be logged");
  });

  test("updateMany returning 0 rows counts as a failure, not a success", () => {
    // `updateMany` does not throw when nothing matched, so the count must be
    // checked or a missing row would report success.
    assert.ok(SRC.includes("res.count > 0"), "the row count must be checked");
  });

  test("the device still changes language, so the user is never stuck", () => {
    assert.ok(SRC.includes("writeLocaleCookie(jar, locale)"), "the cookie is written regardless");
    // lastIndexOf, because indexOf finds the import statement, not the call.
    const callIdx = SRC.lastIndexOf("writeLocaleCookie(jar, locale)");
    assert.ok(SRC.slice(0, callIdx).includes("prisma.user.updateMany"), "but the account is attempted first");
  });

  test("the UI surfaces the not-persisted case in all four languages", () => {
    const UI = code("components/i18n/language-selector.tsx");
    assert.ok(UI.includes('res.error === "not_persisted"'), "the selector must check it");
    assert.ok(UI.includes("t.lang.notPersisted"), "and show localized copy");
    for (const [loc, d] of Object.entries(DICTS)) {
      assert.ok(d.lang.notPersisted?.trim().length > 20, `${loc}.lang.notPersisted is missing`);
    }
    for (const loc of ["en", "de", "tr"] as const) {
      assert.notEqual(DICTS[loc].lang.notPersisted, pl.lang.notPersisted, `${loc} copy is still Polish`);
    }
  });
});

// ── The property that matters, end to end ────────────────────────────────────

describe("transactional e-mail follows the persisted locale", () => {
  test("e-mail reads the account, which reconciliation keeps current", () => {
    const RULE = code("lib/recipient-locale.ts");
    assert.ok(RULE.includes("select: { locale: true }"), "e-mail reads User.locale");
    assert.ok(!RULE.includes("cookies("), "and never the request cookie");
    // And that column is exactly what setLocale and login now write.
    assert.ok(code("lib/actions/locale.ts").includes("data: { locale }"), "setLocale writes it");
    assert.ok(code("lib/i18n/locale-sync.ts").includes("data: { locale: cookieOk }"), "login writes it");
  });

  test("signed-out visitors keep working off the cookie alone", () => {
    // No account, no write attempted, cookie still decides.
    assert.equal(pickLocale({ cookie: "tr" }), "tr");
    const SRC = code("lib/actions/locale.ts");
    assert.ok(SRC.includes("if (user)"), "persistence is attempted only when signed in");
    // `attempted` gates the error, so a signed-out change is a clean success.
    assert.ok(SRC.includes("if (attempted && !persisted)"), "a guest must not see a failure");
  });

  test("no redirect is introduced anywhere in the locale path", () => {
    for (const f of ["lib/i18n/locale-sync.ts", "lib/i18n/server.ts", "lib/actions/locale.ts"]) {
      assert.ok(!code(f).includes("redirect("), `${f} must not redirect (loop risk)`);
    }
  });
});
