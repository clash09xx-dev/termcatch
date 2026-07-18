import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { earliestFreeSlot } from "../lib/slots";
import { warsawDateTimeToUtc } from "../lib/timezone";

const DAY = "2026-07-20"; // Monday
const at = (hm: string) => warsawDateTimeToUtc(DAY, hm).getTime();
const base = { dateYmd: DAY, openTime: "09:00", closeTime: "18:00", durationMin: 60, nowMs: at("00:00") - 1 };

describe("earliestFreeSlot — real availability, booking-grid semantics", () => {
  test("empty day → opening time", () => {
    assert.equal(earliestFreeSlot({ ...base, busy: [] }), "09:00");
  });
  test("busy morning block pushes to the first free grid slot", () => {
    const busy = [{ startMs: at("09:00"), endMs: at("11:30") }];
    assert.equal(earliestFreeSlot({ ...base, busy }), "11:30");
  });
  test("afterMinutes respected ('po 17:00' with 60-min service and 18:00 close → nothing)", () => {
    assert.equal(earliestFreeSlot({ ...base, busy: [], afterMinutes: 17 * 60 + 30 }), null);
    assert.equal(earliestFreeSlot({ ...base, busy: [], afterMinutes: 17 * 60 }), "17:00");
  });
  test("past slots are never offered (today at 14:10 → 14:30)", () => {
    assert.equal(earliestFreeSlot({ ...base, busy: [], nowMs: at("14:10") }), "14:30");
  });
  test("service longer than the remaining window → null", () => {
    const busy = [{ startMs: at("09:00"), endMs: at("17:30") }];
    assert.equal(earliestFreeSlot({ ...base, busy }), null);
  });
  test("overlap check is strict (adjacent appointments do not block)", () => {
    const busy = [{ startMs: at("10:00"), endMs: at("11:00") }];
    assert.equal(earliestFreeSlot({ ...base, busy, afterMinutes: 10 * 60 }), "11:00");
  });
});
