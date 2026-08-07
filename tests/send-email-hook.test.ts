import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { verifyStandardWebhook, buildSignatureHeader, normalizeSecret } from "../supabase/functions/send-email/webhook.ts";
import { escapeHtml, renderVerificationEmail, renderRecoveryEmail } from "../supabase/functions/send-email/render.ts";
import { handleSendEmail } from "../supabase/functions/send-email/handler.ts";

// Base64 secret in the exact "v1,whsec_<base64>" shape Supabase presents.
const SECRET = "v1,whsec_" + btoa("supersecrethookkey-0123456789");
const NOW = 1_700_000_000; // fixed unix seconds for deterministic timestamp checks
const ID = "msg_2abc";

async function signedRequest(payload: string, opts: { ts?: number } = {}): Promise<Request> {
  const ts = String(opts.ts ?? NOW);
  const signature = await buildSignatureHeader(SECRET, ID, ts, payload);
  return new Request("https://proj.supabase.co/functions/v1/send-email", {
    method: "POST",
    headers: {
      "webhook-id": ID,
      "webhook-timestamp": ts,
      "webhook-signature": signature,
      "content-type": "application/json",
    },
    body: payload,
  });
}

function capturingFetch(status = 200) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
    return new Response(JSON.stringify({ id: "email_test" }), { status });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const deps = (fetchFn: typeof fetch) => ({
  hookSecret: SECRET,
  resendApiKey: "re_test_key",
  from: "TermCatch <hello@termcatch.com>",
  replyTo: "hello@termcatch.com",
  fetch: fetchFn,
  nowSeconds: NOW,
});

const SIGNUP_PAYLOAD = JSON.stringify({
  user: { email: "new-user@example.com" },
  email_data: { token: "123456", token_hash: "hash_x", email_action_type: "signup" },
});

describe("Standard Webhooks signature", () => {
  test("normalizeSecret strips v1, and whsec_ prefixes", () => {
    const b64 = btoa("k");
    assert.equal(normalizeSecret(`v1,whsec_${b64}`), b64);
    assert.equal(normalizeSecret(`whsec_${b64}`), b64);
    assert.equal(normalizeSecret(b64), b64);
  });

  test("valid signature verifies", async () => {
    const sig = await buildSignatureHeader(SECRET, ID, String(NOW), SIGNUP_PAYLOAD);
    const ok = await verifyStandardWebhook(SECRET, SIGNUP_PAYLOAD, { id: ID, timestamp: String(NOW), signature: sig }, NOW);
    assert.equal(ok, true);
  });

  test("invalid signature is rejected", async () => {
    const bad = await verifyStandardWebhook(SECRET, SIGNUP_PAYLOAD, { id: ID, timestamp: String(NOW), signature: "v1,AAAAINVALID" }, NOW);
    assert.equal(bad, false);
  });

  test("tampered payload is rejected", async () => {
    const sig = await buildSignatureHeader(SECRET, ID, String(NOW), SIGNUP_PAYLOAD);
    const tampered = await verifyStandardWebhook(SECRET, SIGNUP_PAYLOAD + " ", { id: ID, timestamp: String(NOW), signature: sig }, NOW);
    assert.equal(tampered, false);
  });

  test("stale timestamp is rejected (replay protection)", async () => {
    const sig = await buildSignatureHeader(SECRET, ID, String(NOW), SIGNUP_PAYLOAD);
    const stale = await verifyStandardWebhook(SECRET, SIGNUP_PAYLOAD, { id: ID, timestamp: String(NOW), signature: sig }, NOW + 3600);
    assert.equal(stale, false);
  });
});

describe("handleSendEmail — signup OTP payload", () => {
  test("valid signup hook → sends code email via Resend with correct identity", async () => {
    const { fn, calls } = capturingFetch(200);
    const res = await handleSendEmail(await signedRequest(SIGNUP_PAYLOAD), deps(fn));
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    const body = calls[0].body;
    assert.equal(body.from, "TermCatch <hello@termcatch.com>");
    assert.equal(body.reply_to, "hello@termcatch.com");
    assert.equal(body.subject, "Twój kod weryfikacyjny TermCatch");
    assert.deepEqual(body.to, ["new-user@example.com"]);
    assert.ok(String(body.html).includes("123456"), "html shows the code");
    assert.ok(String(body.text).includes("123456"), "text shows the code");
  });

  test("invalid signature → 401 and NO Resend call", async () => {
    const { fn, calls } = capturingFetch(200);
    const req = new Request("https://proj.supabase.co/functions/v1/send-email", {
      method: "POST",
      headers: { "webhook-id": ID, "webhook-timestamp": String(NOW), "webhook-signature": "v1,WRONG", "content-type": "application/json" },
      body: SIGNUP_PAYLOAD,
    });
    const res = await handleSendEmail(req, deps(fn));
    assert.equal(res.status, 401);
    assert.equal(calls.length, 0);
  });

  test("Resend failure → 502", async () => {
    const { fn } = capturingFetch(500);
    const res = await handleSendEmail(await signedRequest(SIGNUP_PAYLOAD), deps(fn));
    assert.equal(res.status, 502);
  });
});

describe("verification e-mail content", () => {
  test("escapes dynamic content", () => {
    assert.equal(escapeHtml(`<b>"x"&'y'`), "&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;");
    const r = renderVerificationEmail("<script>alert(1)</script>");
    assert.ok(!r.html.includes("<script>"), "no raw script tag");
    assert.ok(r.html.includes("&lt;script&gt;"), "token is escaped");
  });

  test("contains NO links or buttons and no URLs", () => {
    const r = renderVerificationEmail("654321");
    assert.ok(!/<a[\s>]/i.test(r.html), "no anchor tag");
    assert.ok(!/href\s*=/i.test(r.html), "no href");
    assert.ok(!/<button/i.test(r.html), "no button");
    assert.ok(!/https?:\/\//i.test(r.html), "no URL");
    assert.ok(r.html.includes("654321"), "shows the code");
    assert.ok(r.text.length > 0 && r.text.includes("654321"), "has a plain-text version");
  });

  test("recovery e-mail keeps a same-domain link (not the verification email)", () => {
    const r = renderRecoveryEmail("https://termcatch.com/auth/confirm?token_hash=h&type=recovery");
    assert.ok(/href="https:\/\/termcatch\.com\/auth\/confirm/.test(r.html), "same-domain reset link");
  });
});
