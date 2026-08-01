import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  smsFlagEnabled,
  resolveSender,
  senderParams,
  smsReady,
  smsProviderConfigured,
  smsCredentialsConfigured,
  missingSmsEnv,
} from "../lib/sms-config";

// ─── SMS sender selection: Messaging Service SID preferred, never both ────────
// This is the core of the Twilio hardening — Polish recipients see `TermCatch`
// (via the Messaging Service) instead of the generic `Info` from a bare number.

const KEYS = [
  "SMS_ENABLED",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY_SID",
  "TWILIO_API_KEY_SECRET",
  "TWILIO_FROM_NUMBER",
  "TWILIO_MESSAGING_SERVICE_SID",
  "TWILIO_WHATSAPP_FROM",
];
const clear = () => KEYS.forEach((k) => delete process.env[k]);
function setCreds() {
  process.env.TWILIO_ACCOUNT_SID = "AC00000000000000000000000000000000";
  process.env.TWILIO_API_KEY_SID = "SK00000000000000000000000000000000";
  process.env.TWILIO_API_KEY_SECRET = "dummy_secret_for_tests_only";
}

beforeEach(clear);
afterEach(clear);

describe("sender resolution — Messaging Service SID is preferred", () => {
  test("prefers the Messaging Service SID even when a from-number is also set", () => {
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG944d3507f7c132dd962835b683f20c44";
    process.env.TWILIO_FROM_NUMBER = "+12025550123";
    const sender = resolveSender();
    assert.equal(sender?.kind, "messaging_service");
    assert.equal(
      sender?.kind === "messaging_service" ? sender.messagingServiceSid : null,
      "MG944d3507f7c132dd962835b683f20c44"
    );
  });

  test("no `from` field is sent when the Messaging Service SID is used", () => {
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG944d3507f7c132dd962835b683f20c44";
    const params = senderParams(resolveSender()!);
    assert.ok("messagingServiceSid" in params);
    assert.ok(!("from" in params));
    assert.equal(Object.keys(params).length, 1); // never both
  });

  test("falls back to the from-number ONLY when no Messaging Service SID is set", () => {
    process.env.TWILIO_FROM_NUMBER = "+12025550123";
    const sender = resolveSender();
    assert.equal(sender?.kind, "from_number");
    const params = senderParams(sender!);
    assert.ok("from" in params);
    assert.ok(!("messagingServiceSid" in params));
    assert.equal(Object.keys(params).length, 1); // never both
  });

  test("no sender configured → null (no send)", () => {
    assert.equal(resolveSender(), null);
  });

  test("placeholder values ('...') count as unset", () => {
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG...";
    process.env.TWILIO_FROM_NUMBER = "+1202...";
    assert.equal(resolveSender(), null);
  });

  test("the WhatsApp sender is NEVER selected as an SMS sender", () => {
    setCreds();
    process.env.TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886";
    // Only the WhatsApp sender is set — SMS has no valid sender.
    assert.equal(resolveSender(), null);
    assert.equal(smsProviderConfigured(), false);
  });
});

describe("readiness + the single SMS_ENABLED flag", () => {
  test("SMS_ENABLED is the canonical flag (no second TWILIO_ENABLED)", () => {
    assert.equal(smsFlagEnabled(), false);
    process.env.SMS_ENABLED = "true";
    assert.equal(smsFlagEnabled(), true);
    process.env.SMS_ENABLED = "1"; // only the literal "true" enables
    assert.equal(smsFlagEnabled(), false);
  });

  test("smsReady requires the flag ON and a fully configured provider", () => {
    setCreds();
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG944d3507f7c132dd962835b683f20c44";
    assert.equal(smsReady(), false); // flag still off
    process.env.SMS_ENABLED = "true";
    assert.equal(smsReady(), true);
  });

  test("provider needs BOTH credentials and a sender", () => {
    setCreds();
    assert.equal(smsCredentialsConfigured(), true);
    assert.equal(smsProviderConfigured(), false); // no sender yet
    process.env.TWILIO_MESSAGING_SERVICE_SID = "MG944d3507f7c132dd962835b683f20c44";
    assert.equal(smsProviderConfigured(), true);
  });

  test("disabled / missing env: nothing is ready and missingSmsEnv reports it", () => {
    assert.equal(smsReady(), false);
    const missing = missingSmsEnv();
    assert.ok(missing.includes("TWILIO_ACCOUNT_SID"));
    assert.ok(missing.includes("TWILIO_API_KEY_SID"));
    assert.ok(missing.includes("TWILIO_API_KEY_SECRET"));
    assert.ok(missing.some((m) => m.includes("TWILIO_MESSAGING_SERVICE_SID")));
  });

  test("a from-number alone (legacy) satisfies the sender requirement", () => {
    setCreds();
    process.env.TWILIO_FROM_NUMBER = "+12025550123";
    assert.equal(smsProviderConfigured(), true);
    assert.ok(!missingSmsEnv().some((m) => m.includes("TWILIO_MESSAGING_SERVICE_SID")));
  });
});
