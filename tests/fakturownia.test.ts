import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// Encryption key must be present before crypto is exercised (read at call time).
process.env.FAKTUROWNIA_ENCRYPTION_KEY = "unit-test-secret-key-please-change";

import { encryptSecret, decryptSecret, encryptionAvailable } from "../lib/fakturownia/crypto";
import {
  isValidAccountName,
  normalizeAccountName,
  createInvoice,
  testConnection,
  invoicePdfUrl,
  type FakturowniaCredentials,
} from "../lib/fakturownia/client";
import { FAKTUROWNIA_NOT_CONNECTED } from "../lib/ai/tools/invoices";

const A: FakturowniaCredentials = { accountName: "salona", token: "token-AAAA-1111" };
const B: FakturowniaCredentials = { accountName: "salonb", token: "token-BBBB-2222" };

// ── fetch stub (records requests; scripts responses) ─────────────────────────
type Captured = { url: string; method: string; body: string | undefined };
let captured: Captured[] = [];
let scriptedResponse: { ok: boolean; status: number; body?: string } | { throw: Error } = { ok: true, status: 200, body: "[]" };
const realFetch = globalThis.fetch;

beforeEach(() => {
  captured = [];
  scriptedResponse = { ok: true, status: 200, body: "[]" };
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    captured.push({ url: String(url), method: init?.method ?? "GET", body: init?.body as string | undefined });
    if ("throw" in scriptedResponse) throw scriptedResponse.throw;
    const r = scriptedResponse;
    return { ok: r.ok, status: r.status, text: async () => r.body ?? "" } as Response;
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

// ── Encryption ───────────────────────────────────────────────────────────────
describe("integration-secret encryption", () => {
  test("1. round-trips a token", () => {
    const enc = encryptSecret("api-token-xyz");
    assert.notEqual(enc, "api-token-xyz");
    assert.equal(decryptSecret(enc), "api-token-xyz");
  });
  test("2. ciphertext differs each time (random IV), never contains plaintext", () => {
    const a = encryptSecret("secret-token");
    const b = encryptSecret("secret-token");
    assert.notEqual(a, b);
    assert.ok(!a.includes("secret-token"));
  });
  test("3. tampered ciphertext fails closed (returns null, not garbage)", () => {
    const enc = encryptSecret("hello");
    const tampered = enc.slice(0, -2) + (enc.endsWith("A") ? "BB" : "AA");
    assert.equal(decryptSecret(tampered), null);
    assert.equal(decryptSecret("not-a-ciphertext"), null);
    assert.equal(decryptSecret("v1:bad:bad:bad"), null);
  });
  test("4. a different key cannot decrypt (fail closed)", () => {
    const enc = encryptSecret("cross-key");
    const prev = process.env.FAKTUROWNIA_ENCRYPTION_KEY;
    process.env.FAKTUROWNIA_ENCRYPTION_KEY = "a-completely-different-key";
    assert.equal(decryptSecret(enc), null);
    process.env.FAKTUROWNIA_ENCRYPTION_KEY = prev;
    assert.equal(decryptSecret(enc), "cross-key"); // works again with the right key
  });
  test("5. encryption is available in this env", () => assert.equal(encryptionAvailable(), true));
});

// ── Account validation ───────────────────────────────────────────────────────
describe("account-name validation", () => {
  test("6. accepts valid subdomains, rejects junk", () => {
    assert.equal(isValidAccountName("mojsalon"), true);
    assert.equal(isValidAccountName("salon-1"), true);
    assert.equal(isValidAccountName(""), false);
    assert.equal(isValidAccountName("has space"), false);
    assert.equal(isValidAccountName("a"), false); // too short (min 2)
    assert.equal(isValidAccountName("under_score"), false);
    assert.equal(isValidAccountName("-bad"), false);
    assert.equal(isValidAccountName("UPPER"), true); // validator lowercases first
  });
  test("7. normalizes pasted URLs/domains to the bare name", () => {
    assert.equal(normalizeAccountName("MojSalon"), "mojsalon");
    assert.equal(normalizeAccountName("https://mojsalon.fakturownia.pl"), "mojsalon");
    assert.equal(normalizeAccountName("mojsalon.fakturownia.pl/invoices"), "mojsalon");
  });
});

// ── Credential isolation (the multi-tenant boundary) ─────────────────────────
describe("per-business credential isolation", () => {
  test("8. an invoice call uses ONLY the caller's account + token", async () => {
    scriptedResponse = { ok: true, status: 200, body: JSON.stringify({ id: 1, number: "FV/1" }) };
    const res = await createInvoice(A, { buyer_name: "Jan", positions: [{ name: "Strzyżenie", tax: 23, total_price_gross: 100, quantity: 1 }] });
    assert.equal(res.ok, true);
    const call = captured[0];
    assert.ok(call.url.startsWith("https://salona.fakturownia.pl/invoices.json"), call.url);
    assert.ok(call.body?.includes("token-AAAA-1111"));
    assert.ok(!call.body?.includes("token-BBBB-2222")); // never another salon's token
  });
  test("9. two businesses never cross credentials", async () => {
    scriptedResponse = { ok: true, status: 200, body: JSON.stringify({ id: 2, number: "FV/2" }) };
    await createInvoice(A, { buyer_name: "A", positions: [] });
    await createInvoice(B, { buyer_name: "B", positions: [] });
    const [ca, cb] = captured;
    assert.ok(ca.url.includes("salona.fakturownia.pl") && ca.body?.includes("token-AAAA-1111"));
    assert.ok(cb.url.includes("salonb.fakturownia.pl") && cb.body?.includes("token-BBBB-2222"));
    assert.ok(!ca.body?.includes("token-BBBB") && !cb.body?.includes("token-AAAA"));
  });
  test("10. the PDF URL is per-account and carries the caller's token", () => {
    assert.equal(invoicePdfUrl(A, 7), "https://salona.fakturownia.pl/invoices/7.pdf?api_token=token-AAAA-1111");
  });
  test("11. missing account/token is rejected before any network call", async () => {
    const res = await createInvoice({ accountName: "", token: "" }, { buyer_name: "x", positions: [] });
    assert.equal(res.ok, false);
    assert.equal(captured.length, 0); // no request attempted
  });
});

// ── Connection test + graceful errors ────────────────────────────────────────
describe("testConnection + error mapping", () => {
  test("12. valid credentials → ok", async () => {
    scriptedResponse = { ok: true, status: 200, body: "[]" };
    const res = await testConnection(A);
    assert.equal(res.ok, true);
  });
  test("13. invalid token → 401 friendly error (no token leak)", async () => {
    scriptedResponse = { ok: false, status: 401 };
    const res = await testConnection(A);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.match(res.error, /token/i);
      assert.ok(!res.error.includes("token-AAAA-1111"));
    }
  });
  test("14. wrong account → 404 friendly error", async () => {
    scriptedResponse = { ok: false, status: 404 };
    const res = await testConnection({ accountName: "nope", token: "token-xxxx-yyyy" });
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.status, 404);
  });
  test("15. insufficient permissions → 403", async () => {
    scriptedResponse = { ok: false, status: 403 };
    const res = await testConnection(A);
    assert.equal(res.ok, false);
    if (!res.ok) assert.match(res.error, /uprawnie/i);
  });
  test("16. API down (500) → temporary-unavailable message", async () => {
    scriptedResponse = { ok: false, status: 500 };
    const res = await testConnection(A);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.status, 500);
  });
  test("17. network timeout is handled gracefully", async () => {
    scriptedResponse = { throw: Object.assign(new Error("aborted"), { name: "AbortError" }) };
    const res = await testConnection(A);
    assert.equal(res.ok, false);
    if (!res.ok) assert.match(res.error, /czas/i);
  });
  test("18. network failure is handled gracefully", async () => {
    scriptedResponse = { throw: new Error("ECONNREFUSED") };
    const res = await testConnection(A);
    assert.equal(res.ok, false);
  });
});

// ── AI refusal copy ──────────────────────────────────────────────────────────
describe("AI invoice guard", () => {
  test("19. exact refusal message when Fakturownia is not connected", () => {
    assert.equal(FAKTUROWNIA_NOT_CONNECTED, "Najpierw połącz swoje konto Fakturownia w Ustawienia → Integracje.");
  });
});
