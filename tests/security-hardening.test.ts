import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { jsonLdScript } from "../lib/json-ld";

const read = (p: string) => readFileSync(p, "utf8");
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/.*$/gm, "");

/**
 * Pre-launch hardening. Each block pins a CONFIRMED finding, so a regression
 * fails the suite rather than shipping quietly.
 */

describe("CRITICAL — stored XSS via JSON-LD on the public salon profile", () => {
  test("a salon name that closes the script tag can no longer break out", () => {
    const payload = '</script><script>alert(1)</script>';
    const out = jsonLdScript({ name: payload });
    // The three characters that can start a tag or an entity must all be gone.
    assert.ok(!out.includes("</script>"), "the closing tag must not survive");
    assert.ok(!out.includes("<"), "no raw < may remain");
    assert.ok(!out.includes(">"), "no raw > may remain");
    assert.ok(!out.includes("&"), "no raw & may remain");
  });

  test("escaping is lossless — Google still reads the original value", () => {
    const data = { name: 'Salon <A&B> "x"', d: "a b c", n: 12, arr: [1, "<"] };
    assert.deepEqual(JSON.parse(jsonLdScript(data)), data, "round-trip must be exact");
  });

  test("JS line terminators are escaped (legal JSON, illegal mid-script)", () => {
    const out = jsonLdScript({ a: "x y z" });
    assert.ok(!out.includes(" ") && !out.includes(" "), "U+2028/U+2029 must be escaped");
    assert.equal(JSON.parse(out).a, "x y z", "and still parse back");
  });

  test("EVERY ld+json block goes through the escaper, not raw JSON.stringify", () => {
    for (const f of ["app/b/[slug]/page.tsx", "app/page.tsx", "app/faq/page.tsx"]) {
      const src = read(f);
      assert.ok(src.includes("jsonLdScript("), `${f} must use the escaper`);
      assert.ok(
        !/dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify/.test(src),
        `${f} must not inline raw JSON.stringify into HTML`
      );
    }
  });

  test("the escaper is the ONLY thing feeding dangerouslySetInnerHTML anywhere", () => {
    // Any future raw-HTML sink is a decision that deserves review, so the set is
    // pinned: three JSON-LD blocks and nothing else.
    const hits: string[] = [];
    for (const f of ["app/b/[slug]/page.tsx", "app/page.tsx", "app/faq/page.tsx"]) {
      for (const m of read(f).matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([A-Za-z]+)\(/g)) {
        hits.push(m[1]);
      }
    }
    assert.deepEqual([...new Set(hits)], ["jsonLdScript"], "only the escaper may feed raw HTML");
  });
});

describe("ALREADY SAFE — pins on protections that must not regress", () => {
  test("no unparameterized raw SQL anywhere", () => {
    for (const f of [
      "lib/entitlement-guard.ts", "lib/booking-conflict.ts", "lib/billing/promo.ts",
      "lib/notification-settings.ts", "app/admin/dashboard/page.tsx",
    ]) {
      const src = code(f);
      assert.ok(!src.includes("$queryRawUnsafe"), `${f} must not use $queryRawUnsafe`);
      assert.ok(!src.includes("$executeRawUnsafe"), `${f} must not use $executeRawUnsafe`);
    }
  });

  test("Stripe checkout takes a plan KEY, never an amount from the client", () => {
    const src = code("lib/actions/subscription.ts");
    assert.ok(/startSubscriptionCheckout\(\s*planRaw: string/.test(src), "only a plan string is accepted");
    assert.ok(src.includes("normalizePlanKey(planRaw)"), "and it is validated against an allowlist");
    assert.ok(src.includes("priceIdForPlan(plan)"), "the price id comes from server env");
    assert.ok(!/unit_amount|amount:/.test(src), "no amount may ever be built here");
    assert.ok(src.includes("requireOwnedBusiness()"), "and ownership is enforced first");
    const sub = code("lib/subscription.ts");
    assert.ok(sub.includes('v.startsWith("price_")'), "a configured price id is shape-checked");
  });

  test("the Stripe webhook verifies signatures on the raw body, and is idempotent", () => {
    const src = code("app/api/webhooks/stripe/route.ts");
    assert.ok(src.includes("stripe.webhooks.constructEvent"), "signature must be verified");
    assert.ok(src.includes("await req.text()"), "on the RAW body, not a parsed one");
    assert.ok(src.includes("STRIPE_WEBHOOK_SECRET"), "with the webhook secret");
    assert.ok(src.includes("processedWebhookEvent") || src.includes("ProcessedWebhookEvent"),
      "replays must be deduplicated");
  });

  test("uploads are validated by CONTENT, not by the declared type", () => {
    const src = code("lib/actions/upload.ts");
    assert.ok(src.includes("sniffImageType(buffer)"), "magic bytes must be sniffed");
    assert.ok(src.includes("MAX_BYTES"), "a size cap must exist");
    assert.ok(!src.includes("image/svg"), "SVG must stay out of the allowlist (script vector)");
    // The stored name is generated, so a crafted filename cannot traverse.
    assert.ok(/filename = `\$\{business\.id\}\//.test(src), "path is server-built and tenant-scoped");
    assert.ok(!/file\.name/.test(src), "the client filename must never reach storage");
  });

  test("calendar OAuth tokens are encrypted and never leave the server", () => {
    const src = code("lib/calendar/google-client.ts");
    assert.ok(src.includes("createSecretBox("), "tokens must be encrypted at rest");
    assert.ok(src.includes('"server-only"') || read("lib/calendar/google-client.ts").includes("server-only"),
      "the module must be server-only");
  });

  test("admin server actions each gate independently of the page", () => {
    const src = code("lib/actions/admin.ts");
    for (const fn of ["adminSuspendBusiness", "adminBanBusiness", "adminRestoreBusiness", "adminDeleteBusiness"]) {
      const i = src.indexOf(`export async function ${fn}`);
      assert.ok(i > 0, `${fn} must exist`);
      assert.ok(src.slice(i, i + 400).includes("requireAdmin"), `${fn} must gate itself`);
    }
  });

  test("redirect targets are path-only — no open redirect", () => {
    for (const f of ["app/auth/callback/route.ts", "app/auth/confirm/route.ts", "lib/calendar/oauth-state.ts"]) {
      const src = code(f);
      assert.ok(/startsWith\("\/"\)/.test(src), `${f} must require a root-relative path`);
      assert.ok(/startsWith\("\/\/"\)/.test(src), `${f} must reject protocol-relative URLs`);
    }
  });

  test("no privileged field can be assigned from client input", () => {
    for (const f of ["lib/actions/staff.ts", "lib/actions/business.ts", "lib/actions/services.ts", "lib/actions/join-requests.ts"]) {
      const src = code(f);
      for (const bad of [/role:\s*(data|input|params|body)\./, /ownerId:\s*(data|input)\./, /subscriptionPlan:\s*(data|input)\./]) {
        assert.ok(!bad.test(src), `${f} must not accept a privileged field from input`);
      }
    }
  });
});
