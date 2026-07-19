import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { maskPhone, verifyTwilioSignature, smsFlagEnabled, smsReady } from "../lib/sms";
import { whatsappEnabled, whatsappConfigured } from "../lib/messaging";
import { normalizePhone } from "../lib/phone";

describe("maskPhone — no full numbers in logs or DB", () => {
  test("polish mobile masked, keeps prefix + last 4", () => {
    assert.equal(maskPhone("+48123456789"), "+48•••••6789");
  });
  test("never reveals the middle digits", () => {
    assert.doesNotMatch(maskPhone("+48123456789"), /12345/);
  });
});

describe("verifyTwilioSignature", () => {
  const token = "test_auth_token";
  const url = "https://termcatch.com/api/sms/status";
  const params = { MessageSid: "SM123", MessageStatus: "delivered", To: "+48123456789" };
  const valid = createHmac("sha1", token)
    .update(url + Object.keys(params).sort().map((k) => k + params[k as keyof typeof params]).join(""))
    .digest("base64");

  test("accepts a correctly signed request", () => {
    assert.equal(verifyTwilioSignature(token, url, params, valid), true);
  });
  test("rejects a tampered param", () => {
    assert.equal(verifyTwilioSignature(token, url, { ...params, MessageStatus: "failed" }, valid), false);
  });
  test("rejects a wrong signature", () => {
    assert.equal(verifyTwilioSignature(token, url, params, "AAAA"), false);
  });
});

describe("normalizePhone — polskie numery do E.164", () => {
  test("9 cyfr → +48…", () => assert.equal(normalizePhone("123456789"), "+48123456789"));
  test("48XXXXXXXXX → +48XXXXXXXXX", () => assert.equal(normalizePhone("48123456789"), "+48123456789"));
  test("+48XXXXXXXXX pozostaje bez zmian", () => assert.equal(normalizePhone("+48123456789"), "+48123456789"));
  test("spacje i myślniki są tolerowane", () => assert.equal(normalizePhone("+48 123-456-789"), "+48123456789"));
  test("nieprawidłowy numer → null (blokuje wysyłkę)", () => {
    assert.equal(normalizePhone("12345"), null);
    assert.equal(normalizePhone("abc"), null);
    assert.equal(normalizePhone(""), null);
  });
});

describe("feature flags — hard server-side gates", () => {
  const TWILIO_KEYS = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_KEY_SID",
    "TWILIO_API_KEY_SECRET",
    "TWILIO_FROM_NUMBER",
  ];
  const clearTwilio = () => {
    delete process.env.SMS_ENABLED;
    for (const k of TWILIO_KEYS) delete process.env[k];
  };

  test("SMS disabled by default (flag absent)", () => {
    clearTwilio();
    assert.equal(smsFlagEnabled(), false);
    assert.equal(smsReady(), false);
  });
  test("SMS flag alone is not enough without Twilio credentials", () => {
    clearTwilio();
    process.env.SMS_ENABLED = "true";
    assert.equal(smsFlagEnabled(), true);
    assert.equal(smsReady(), false);
    clearTwilio();
  });
  test("SMS ready requires the API Key set (SID + KEY SID + KEY SECRET + FROM) plus the flag", () => {
    clearTwilio();
    process.env.SMS_ENABLED = "true";
    process.env.TWILIO_ACCOUNT_SID = "AC00000000000000000000000000000000";
    process.env.TWILIO_API_KEY_SID = "SK00000000000000000000000000000000";
    process.env.TWILIO_FROM_NUMBER = "+48123456789";
    assert.equal(smsReady(), false); // API Key secret still missing
    process.env.TWILIO_API_KEY_SECRET = "dummy_secret_for_tests_only";
    assert.equal(smsReady(), true);
    clearTwilio();
  });
  test("WhatsApp disabled by default and even when Twilio is configured", () => {
    delete process.env.WHATSAPP_ENABLED;
    process.env.TWILIO_ACCOUNT_SID = "AC12345678901234567890";
    process.env.TWILIO_AUTH_TOKEN = "tok_1234567890123456";
    process.env.TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886";
    assert.equal(whatsappEnabled(), false);
    assert.equal(whatsappConfigured(), false); // flag wins over credentials
    process.env.WHATSAPP_ENABLED = "true";
    assert.equal(whatsappConfigured(), true);
    delete process.env.WHATSAPP_ENABLED;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;
  });
});
