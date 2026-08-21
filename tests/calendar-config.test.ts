import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getAppUrl } from "../lib/app-url";

/**
 * Production clicked "Connect Google Calendar" and landed on
 *   https://localhost:8080/business/settings/calendar?calendar=not_configured
 *
 * Two separate faults, stacked:
 *
 *  1. THE HOST. Both OAuth routes redirected with `new URL(path, req.url)`.
 *     Behind Railway's proxy the Node process is addressed on its internal port
 *     (PORT=8080), so `req.url` is "http://localhost:8080/..." and every
 *     relative redirect resolved against a host no browser can reach. The
 *     canonical origin must come from configuration, which is also what keeps a
 *     spoofed Host header out of an OAuth flow.
 *
 *  2. THE BRANCH. That particular URL is the `not_configured` path, reached
 *     because GOOGLE_CALENDAR_CLIENT_ID / _SECRET are unset. So the redirect bug
 *     was only ever visible because the integration was unconfigured, and both
 *     halves need fixing: correct URL, and no dead button in the first place.
 */

const START = "app/api/integrations/google-calendar/start/route.ts";
const CALLBACK = "app/api/integrations/google-calendar/callback/route.ts";
const CONFIG = "lib/calendar/google-config.ts";
const CLIENT = "app/business/(business-layout)/settings/calendar/calendar-sync-client.tsx";
const WIZARD = "app/business/(business-layout)/settings/calendar/booksy-wizard.tsx";
const read = (p: string) => readFileSync(p, "utf8");
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");

describe("calendar OAuth redirects never point at the server's internal address", () => {
  test("1. no redirect is built from the request URL", () => {
    for (const route of [START, CALLBACK]) {
      const src = code(route);
      assert.ok(
        !/new URL\([^)]*req\.url/.test(src),
        `${route} must not resolve redirects against req.url`
      );
      assert.ok(
        !/NextResponse\.redirect\(\s*new URL\([^)]*request\.url/.test(src),
        `${route} must not resolve redirects against request.url`
      );
    }
  });

  test("2. redirects resolve against the configured public origin", () => {
    for (const route of [START, CALLBACK]) {
      const src = code(route);
      assert.ok(src.includes("appUrl()"), `${route} must build redirects from the canonical origin`);
      assert.ok(
        /function appRedirect\(path: string\): NextResponse/.test(src),
        `${route} must funnel redirects through one helper`
      );
    }
  });

  test("3. the origin is never taken from a browser-controlled header", () => {
    const appUrlSrc = code("lib/app-url.ts");
    // Real header-reading patterns. The bare token "host" was too blunt: it also
    // matches `u.hostname` on a URL parsed from the CONFIGURED variable, and the
    // literal "localhost" in the loopback allowlist -- both of which are the
    // opposite of the risk. The risk is reading an inbound request header, so
    // that is what is checked.
    for (const header of [
      "x-forwarded-host", "x-forwarded-proto", "headers()",
      "req.headers", "request.headers", 'get("host")',
    ]) {
      assert.ok(!appUrlSrc.includes(header), `the origin must not be derived from ${header}`);
    }
    // Positively: the ONLY input is the configured public URL.
    const envReads = [...appUrlSrc.matchAll(/process\.env\.(\w+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(envReads)], ["NEXT_PUBLIC_APP_URL"], "one env input only");
    // A configured value is validated as a real http(s) origin before use.
    assert.ok(appUrlSrc.includes("new URL(raw)"), "the configured value must be parsed");
    assert.ok(appUrlSrc.includes("u.origin"), "only the origin is used, not a path");
  });

  test("4. there is ONE app-url helper; the calendar one delegates to it", () => {
    const cfg = code(CONFIG);
    assert.ok(cfg.includes("getAppUrl()"), "google-config must delegate to lib/app-url");
    // The old local fallback to a developer's machine is gone: an unset variable
    // in production must not silently produce a localhost redirect_uri.
    assert.ok(!cfg.includes("localhost"), "no localhost fallback may remain in calendar config");
    assert.ok(!cfg.includes("process.env.NEXT_PUBLIC_APP_URL"), "it must not re-read the env itself");
  });

  test("5. the production default is the real origin, not a developer machine", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    try {
      delete process.env.NEXT_PUBLIC_APP_URL;
      assert.equal(getAppUrl(), "https://termcatch.com");
      // A malformed value must fall back, never be concatenated blindly.
      process.env.NEXT_PUBLIC_APP_URL = "not-a-url";
      assert.equal(getAppUrl(), "https://termcatch.com");
      // Local development still works when the variable IS set.
      process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
      assert.equal(getAppUrl(), "http://localhost:3000");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });

  test("6. the OAuth redirect_uri is built from that same origin", () => {
    const cfg = read(CONFIG);
    assert.ok(
      cfg.includes("return `${appUrl()}${GOOGLE_CALENDAR_CALLBACK_PATH}`"),
      "redirect_uri must use the canonical origin so it matches the Cloud Console entry"
    );
  });

  test("7. the open-redirect guard still holds for returnTo", () => {
    const guard = read("lib/calendar/oauth-state.ts");
    assert.ok(guard.includes('value.startsWith("//")'), "protocol-relative bypass must stay blocked");
    assert.ok(guard.includes('!value.startsWith("/")'), "only same-origin paths may survive");
  });
});

describe("unconfigured integration offers no dead actions", () => {
  test("8. the salon-wide Connect button is disabled without credentials", () => {
    const src = read(CLIENT);
    assert.ok(src.includes("{configured ? ("), "the connect CTA must be gated on configuration");
    assert.ok(src.includes("<InkButton size=\"sm\" disabled>"), "and rendered disabled otherwise");
  });

  test("9. the PER-EMPLOYEE connect link is gated too", () => {
    const src = read(CLIENT);
    // This link was live regardless of configuration, so each specialist row was
    // its own route into the localhost bounce.
    const employeeBlock = src.slice(src.indexOf("employees.map("));
    assert.ok(employeeBlock.includes("configured ? ("), "the per-employee link must be gated");
    assert.ok(employeeBlock.includes("cursor-not-allowed"), "and must not look clickable when it is not");
  });

  test("10. the Booksy wizard knows whether the flow can succeed", () => {
    const client = read(CLIENT);
    assert.ok(/configured=\{configured\}/.test(client), "the wizard must be told");
    const wiz = read(WIZARD);
    assert.ok(wiz.includes("configured: boolean"), "the wizard must accept it");
    assert.ok(wiz.includes("!configured ? ("), "and branch on it");
    assert.ok(wiz.includes("T.setupUnavailable"), "showing a localized setup-unavailable state");
    // The guide itself is not removed; only the impossible action is withheld.
    assert.ok(wiz.includes("BOOKSY_HELP_URL"), "the Booksy wizard must still exist");
  });

  test("11. the unconfigured state is actionable for admins and safe to screenshot", () => {
    const src = read(CLIENT);
    assert.ok(src.includes("showSetupDetail"), "admins get the technical detail");
    assert.ok(src.includes("T.notConfiguredAdmin"), "which names the variables to set");
    const page = read("app/business/(business-layout)/settings/calendar/page.tsx");
    assert.ok(page.includes("await isPlatformAdmin()"), "the detail is admin-gated server-side");

    // Names of variables only. A value must never reach the client.
    for (const dict of ["pl", "en", "de", "tr"]) {
      const d = read(`lib/i18n/dictionaries/${dict}.ts`);
      const line = d.split("\n").find((l) => l.includes("notConfiguredAdmin:")) ?? "";
      assert.ok(line.includes("GOOGLE_CALENDAR_CLIENT_ID"), `${dict} must name the missing variable`);
      assert.ok(!/=\s*['"][A-Za-z0-9_-]{12,}/.test(line), `${dict} must not embed a secret value`);
    }
  });

  test("12. tokens are still never selected into the settings view", () => {
    const page = read("app/business/(business-layout)/settings/calendar/page.tsx");
    assert.ok(!page.includes("encryptedAccessToken"), "tokens must not enter the render tree");
    assert.ok(!page.includes("encryptedRefreshToken"), "tokens must not enter the render tree");
  });
});
