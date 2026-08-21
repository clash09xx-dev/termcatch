import { test, describe, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { getAppUrl } from "../lib/app-url";
import {
  GOOGLE_CALENDAR_CALLBACK_PATH,
  GOOGLE_CALENDAR_SCOPES,
  googleCalendarRedirectUri,
  googleCalendarCreds,
  googleCalendarConfigured,
  googleCalendarConfigDiagnosis,
} from "../lib/calendar/google-config";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";

const DICTS = { pl, en, de, tr };
const read = (p: string) => readFileSync(p, "utf8");
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");

/**
 * Production showed "the calendar integration is not configured on this server"
 * and, to an admin, the names of the missing variables.
 *
 * That message was CORRECT: GOOGLE_CALENDAR_CLIENT_ID and
 * GOOGLE_CALENDAR_CLIENT_SECRET are genuinely absent from the Railway
 * environment. It is a deployment gap, not a naming or code bug — the repository
 * uses exactly one pair of names, in exactly one module.
 *
 * These tests pin the things that WOULD have made it a code bug, so a future
 * change cannot reintroduce them: a second set of variable names, a redirect URI
 * that drifts from the real route, an http or localhost origin reaching
 * production, a secret with a NEXT_PUBLIC_ prefix, or internal variable names in
 * copy a salon owner reads.
 */

// These read process.env at CALL time, so setting it per-case is enough.
const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = ORIGINAL.NEXT_PUBLIC_APP_URL;
  process.env.GOOGLE_CALENDAR_CLIENT_ID = ORIGINAL.GOOGLE_CALENDAR_CLIENT_ID;
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = ORIGINAL.GOOGLE_CALENDAR_CLIENT_SECRET;
});

describe("one source of truth for the variable names", () => {
  test("only GOOGLE_CALENDAR_CLIENT_ID/_SECRET exist, in one module", () => {
    const variants = [
      "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID", "NEXT_PUBLIC_GOOGLE_CLIENT_SECRET",
      "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET",
      "GCAL_CLIENT_ID", "GOOGLE_CALENDAR_ID", "GOOGLE_CALENDAR_SECRET",
    ];
    const dirs = ["app", "lib", "components", "actions", "scripts"];
    for (const dir of dirs) {
      for (const file of walk(dir)) {
        const src = read(file);
        for (const v of variants) {
          assert.ok(!src.includes(v), `${file} introduces a second variable name: ${v}`);
        }
      }
    }
  });

  test("the credentials are read in exactly ONE place", () => {
    const readers: string[] = [];
    for (const dir of ["app", "lib", "components", "actions"]) {
      for (const file of walk(dir)) {
        if (/process\.env\.GOOGLE_CALENDAR_CLIENT_(ID|SECRET)/.test(read(file))) readers.push(file);
      }
    }
    assert.deepEqual(readers, ["lib/calendar/google-config.ts"],
      "credentials must be read only by the config module");
  });

  test("the secret is never exposed with a NEXT_PUBLIC_ prefix", () => {
    for (const dir of ["app", "lib", "components", "actions"]) {
      for (const file of walk(dir)) {
        assert.ok(!/NEXT_PUBLIC_[A-Z_]*SECRET/.test(read(file)), `${file} would ship a secret to the browser`);
      }
    }
    // .env.example is what a developer copies, so it must not teach the mistake.
    const example = read(".env.example");
    assert.ok(!/NEXT_PUBLIC_[A-Z_]*SECRET/.test(example), ".env.example must not suggest a public secret");
  });

  test("the config module is server-only, so it cannot be imported client-side", () => {
    for (const f of ["lib/calendar/google-config.ts", "lib/calendar/google-client.ts", "lib/calendar/oauth-state.ts"]) {
      assert.ok(read(f).startsWith('import "server-only"'), `${f} must be server-only`);
    }
  });
});

describe("the redirect URI is deterministic and matches the real route", () => {
  test("the constant equals the actual file-system route", () => {
    // app/api/integrations/google-calendar/callback/route.ts
    assert.equal(GOOGLE_CALENDAR_CALLBACK_PATH, "/api/integrations/google-calendar/callback");
    const routeExists = walk("app/api").some(
      (f) => f === "app/api/integrations/google-calendar/callback/route.ts"
    );
    assert.ok(routeExists, "the callback route file must exist at the constant's path");
  });

  test("production yields exactly the URI to register in Google Cloud", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://termcatch.com";
    assert.equal(
      googleCalendarRedirectUri(),
      "https://termcatch.com/api/integrations/google-calendar/callback"
    );
  });

  test("a trailing slash or a path in the env cannot corrupt the URI", () => {
    for (const raw of ["https://termcatch.com/", "https://termcatch.com//", "https://termcatch.com/app"]) {
      process.env.NEXT_PUBLIC_APP_URL = raw;
      const uri = googleCalendarRedirectUri();
      assert.equal(uri, "https://termcatch.com/api/integrations/google-calendar/callback", `broke on ${raw}`);
      assert.ok(!uri.includes("//api"), "no doubled slash");
      assert.equal((uri.match(/https:\/\//g) ?? []).length, 1);
    }
  });

  test("http is refused unless it is genuine local development", () => {
    // An http origin would be rejected by Google AND would carry the OAuth code
    // in cleartext, so a misconfigured public value must not be honoured.
    process.env.NEXT_PUBLIC_APP_URL = "http://termcatch.com";
    assert.equal(getAppUrl(), "https://termcatch.com", "public http must fall back to the canonical https origin");

    // Loopback stays usable so the integration can be developed locally.
    for (const local of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
      process.env.NEXT_PUBLIC_APP_URL = local;
      assert.equal(getAppUrl(), local, `${local} must remain usable in development`);
    }
  });

  test("a missing or malformed origin never produces localhost in production", () => {
    for (const bad of [undefined, "", "not a url", "ftp://termcatch.com"]) {
      if (bad === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = bad;
      const uri = googleCalendarRedirectUri();
      assert.ok(uri.startsWith("https://termcatch.com/"), `bad value ${JSON.stringify(bad)} produced ${uri}`);
      assert.ok(!uri.includes("localhost"), "must never fall back to a developer machine");
      assert.ok(!uri.includes("railway"), "must never use a Railway internal/preview host");
    }
  });

  test("the origin is never taken from a request header", () => {
    const src = code("lib/app-url.ts");
    // Real header-reading patterns only. A bare "Host" substring also matches
    // the local `isLocalHost` helper, which is the opposite of the risk.
    for (const hostish of ["headers(", "x-forwarded-host", "req.headers", "request.headers", 'get("host")']) {
      assert.ok(!src.includes(hostish), `origin must not derive from ${hostish} (attacker-controllable)`);
    }
    // The only env var it may consult is the configured public URL.
    const envReads = [...src.matchAll(/process\.env\.(\w+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(envReads)], ["NEXT_PUBLIC_APP_URL"], "one env input only");
  });
});

describe("credential detection and diagnosis", () => {
  test("both halves are required; neither alone enables the feature", () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "id.apps.googleusercontent.com";
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    assert.equal(googleCalendarCreds(), null);
    assert.equal(googleCalendarConfigured(), false);

    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "s3cret";
    assert.equal(googleCalendarCreds(), null);

    process.env.GOOGLE_CALENDAR_CLIENT_ID = "id.apps.googleusercontent.com";
    assert.deepEqual(googleCalendarCreds(), {
      clientId: "id.apps.googleusercontent.com",
      clientSecret: "s3cret",
    });
    assert.equal(googleCalendarConfigured(), true);
  });

  test("whitespace-only values count as unset", () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = "   ";
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "   ";
    assert.equal(googleCalendarCreds(), null, "a variable set to spaces is not configured");
  });

  test("the diagnosis names what is missing, and never a value", () => {
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    process.env.NEXT_PUBLIC_APP_URL = "https://termcatch.com";
    const d = googleCalendarConfigDiagnosis();
    assert.equal(d.ok, false);
    assert.deepEqual(d.missing, ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET"]);
    assert.equal(d.originIsHttps, true);
    assert.equal(d.redirectUri, "https://termcatch.com/api/integrations/google-calendar/callback");

    process.env.GOOGLE_CALENDAR_CLIENT_ID = "abc";
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "def";
    const ok = googleCalendarConfigDiagnosis();
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.missing, []);
    // The diagnosis object must not carry the credentials themselves.
    assert.ok(!JSON.stringify(ok).includes("abc"));
    assert.ok(!JSON.stringify(ok).includes("def"));
  });

  test("nothing logs a token or a secret", () => {
    for (const f of ["lib/calendar/google-config.ts", "lib/calendar/google-client.ts",
                     "app/api/integrations/google-calendar/start/route.ts",
                     "app/api/integrations/google-calendar/callback/route.ts"]) {
      const src = code(f);
      for (const m of src.matchAll(/console\.\w+\(([^)]*)\)/g)) {
        const args = m[1];
        for (const bad of ["access_token", "refresh_token", "accessToken", "refreshToken", "client_secret", "clientSecret"]) {
          assert.ok(!args.includes(bad), `${f} logs ${bad}`);
        }
      }
    }
  });
});

describe("scopes and OAuth safety are unchanged", () => {
  test("least privilege: read-only plus events we own", () => {
    assert.deepEqual([...GOOGLE_CALENDAR_SCOPES], [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.owned",
    ]);
    assert.ok(!GOOGLE_CALENDAR_SCOPES.includes("https://www.googleapis.com/auth/calendar" as never),
      "the broad write scope must not creep in");
  });

  test("the callback refuses a request without valid state", () => {
    const src = code("app/api/integrations/google-calendar/callback/route.ts");
    assert.ok(src.includes("decodeState("), "state must be verified");
    assert.ok(src.includes("invalid_state"), "and an invalid state must be rejected");
  });

  test("the start route sends the derived redirect_uri, not a literal", () => {
    const src = code("app/api/integrations/google-calendar/start/route.ts");
    assert.ok(src.includes('url.searchParams.set("redirect_uri", googleCalendarRedirectUri())'),
      "redirect_uri must come from the one helper so it cannot drift from Cloud Console");
  });
});

describe("the user-facing message says nothing about variables", () => {
  test("salon owners get a plain unavailability message in all four languages", () => {
    for (const [loc, d] of Object.entries(DICTS)) {
      const msg = d.pages.calendarSync.notConfigured;
      assert.ok(msg.trim().length > 20, `${loc} message is missing`);
      for (const leak of ["GOOGLE_", "NEXT_PUBLIC", "CLIENT_ID", "CLIENT_SECRET", "env", "server"]) {
        assert.ok(!msg.includes(leak), `${loc} user-facing copy leaks "${leak}": ${msg}`);
      }
    }
  });

  test("the technical detail stays admin-gated", () => {
    const page = code("app/business/(business-layout)/settings/calendar/page.tsx");
    assert.ok(page.includes("showSetupDetail={await isPlatformAdmin()}"),
      "the variable names must be shown only to a platform admin");
    const client = code("app/business/(business-layout)/settings/calendar/calendar-sync-client.tsx");
    assert.ok(client.includes("showSetupDetail && ("), "and rendered behind that flag");
  });

  test("the cause is recoverable from the server log, without an admin session", () => {
    // The diagnosis is PURE and lives with the config; the logging lives outside
    // lib/calendar, because every module in there handles tokens and is barred
    // from logging at all (see calendar-sync "no calendar module logs anything").
    const cfg = code("lib/calendar/google-config.ts");
    assert.ok(cfg.includes("googleCalendarConfigDiagnosis"), "a pure diagnosis must exist");
    assert.ok(!/console\./.test(cfg), "but the config module must never log");
    const diag = code("lib/integration-diagnostics.ts");
    assert.ok(diag.includes("console.warn("), "the logger outside lib/calendar must log");
    assert.ok(!/clientSecret|client_secret|accessToken|refreshToken/.test(diag),
      "and must never touch a secret or a token");
    for (const f of ["app/api/integrations/google-calendar/start/route.ts",
                     "app/business/(business-layout)/settings/calendar/page.tsx"]) {
      assert.ok(code(f).includes("logGoogleCalendarConfigOnce()"), `${f} must trigger the diagnosis`);
    }
  });
});

/** Every .ts/.tsx file under `dir`, repo-relative. */
function walk(dir: string): string[] {
  const out: string[] = [];
  const visit = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
        visit(p);
      } else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  };
  try { visit(dir); } catch { /* missing dir is fine */ }
  return out;
}
