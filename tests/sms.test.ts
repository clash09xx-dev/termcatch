import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { maskPhone, verifyTwilioSignature, smsFlagEnabled, smsReady } from "../lib/sms";
import { whatsappEnabled, whatsappConfigured } from "../lib/messaging";

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

describe("feature flags — hard server-side gates", () => {
  test("SMS disabled by default (flag absent)", () => {
    delete process.env.SMS_ENABLED;
    assert.equal(smsFlagEnabled(), false);
    assert.equal(smsReady(), false);
  });
  test("SMS flag alone is not enough without Twilio credentials", () => {
    process.env.SMS_ENABLED = "true";
    delete process.env.TWILIO_ACCOUNT_SID;
    assert.equal(smsFlagEnabled(), true);
    assert.equal(smsReady(), false);
    delete process.env.SMS_ENABLED;
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
