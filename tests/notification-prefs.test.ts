import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  salonWants,
  SALON_EVENTS,
  type BusinessNotificationSettings,
} from "../lib/notification-settings";

function settings(over: Partial<BusinessNotificationSettings>): BusinessNotificationSettings {
  return { ...structuredClone(DEFAULT_NOTIFICATION_SETTINGS), ...over };
}

describe("salon notification preferences — per-event × per-channel dispatch gate", () => {
  test("defaults: in-app on, email on, SMS off (opt-in)", () => {
    const s = DEFAULT_NOTIFICATION_SETTINGS;
    assert.equal(salonWants(s, "newBooking", "inApp"), true);
    assert.equal(salonWants(s, "newBooking", "email"), true);
    assert.equal(salonWants(s, "newBooking", "sms"), false);
  });

  test("email master switch off ⇒ no email for any event, even if per-event email is on", () => {
    const s = settings({ emailEnabled: false });
    for (const { key } of SALON_EVENTS) assert.equal(salonWants(s, key, "email"), false);
  });

  test("per-event email can be disabled independently", () => {
    const s = structuredClone(DEFAULT_NOTIFICATION_SETTINGS);
    s.events.newBooking.email = false;
    assert.equal(salonWants(s, "newBooking", "email"), false);
    assert.equal(salonWants(s, "cancellation", "email"), true);
  });

  test("SMS requires master ON + a phone + the per-event flag", () => {
    // master off
    assert.equal(salonWants(settings({}), "newReview", "sms"), false);
    // master on but no phone
    assert.equal(salonWants(settings({ smsEnabled: true }), "newReview", "sms"), false);
    // master on + phone but per-event sms still off (default)
    assert.equal(salonWants(settings({ smsEnabled: true, smsPhone: "+48123456789" }), "newReview", "sms"), false);
    // all conditions met
    const s = settings({ smsEnabled: true, smsPhone: "+48123456789" });
    s.events.newReview.sms = true;
    assert.equal(salonWants(s, "newReview", "sms"), true);
    // ...but a different event stays off
    assert.equal(salonWants(s, "newBooking", "sms"), false);
  });

  test("in-app can be turned off per event", () => {
    const s = structuredClone(DEFAULT_NOTIFICATION_SETTINGS);
    s.events.reschedule.inApp = false;
    assert.equal(salonWants(s, "reschedule", "inApp"), false);
    assert.equal(salonWants(s, "newBooking", "inApp"), true);
  });
});
