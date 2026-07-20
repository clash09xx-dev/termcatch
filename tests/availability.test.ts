import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeDaySlots, resolveDayHours } from "../lib/availability";
import { warsawDateTimeToUtc } from "../lib/timezone";

const DAY = "2026-07-20"; // Monday
const at = (hm: string) => warsawDateTimeToUtc(DAY, hm).getTime();
const OPEN = 9 * 60; // 09:00
const CLOSE = 18 * 60; // 18:00
const beforeDay = at("00:00") - 1;

const base = { dateYmd: DAY, openMin: OPEN, closeMin: CLOSE, durationMin: 60, busy: [], nowMs: beforeDay };

describe("computeDaySlots — the shared booking+search engine", () => {
  test("free valid slot: empty open day starts at opening time", () => {
    const slots = computeDaySlots({ ...base });
    assert.equal(slots[0], "09:00");
    assert.ok(slots.includes("17:00")); // last 60-min slot before 18:00
    assert.ok(!slots.includes("17:30")); // would end 18:30 > close
  });

  test("all slots occupied: a full-day appointment leaves nothing", () => {
    const busy = [{ startMs: at("09:00"), endMs: at("18:00") }];
    assert.deepEqual(computeDaySlots({ ...base, busy }), []);
  });

  test("existing appointment blocks only its span; cancelled (excluded upstream) frees it", () => {
    const busy = [{ startMs: at("10:00"), endMs: at("11:00") }];
    const withAppt = computeDaySlots({ ...base, busy });
    assert.ok(!withAppt.includes("10:00")); // overlaps the appointment
    assert.ok(withAppt.includes("11:00")); // adjacent is fine
    // Removing it (as cancelled appointments are removed before this call) frees 10:00.
    assert.ok(computeDaySlots({ ...base, busy: [] }).includes("10:00"));
  });

  test("past slots are never returned (now = 14:10 → first is 14:30)", () => {
    assert.equal(computeDaySlots({ ...base, nowMs: at("14:10") })[0], "14:30");
  });

  test("duration crossing closing time yields no slot", () => {
    assert.deepEqual(computeDaySlots({ ...base, durationMin: 10 * 60 }), []);
  });

  test("breaks are respected (lunch 12:00–13:00 removes overlapping slots)", () => {
    const breaks = [{ startMin: 12 * 60, endMin: 13 * 60 }];
    const slots = computeDaySlots({ ...base, breaks });
    assert.ok(slots.includes("11:00")); // ends exactly at 12:00 — allowed
    assert.ok(!slots.includes("12:00"));
    assert.ok(!slots.includes("12:30"));
    assert.ok(slots.includes("13:00"));
  });

  test("buffers pad busy spans (30-min after-buffer blocks the adjacent slot)", () => {
    const busy = [{ startMs: at("10:00"), endMs: at("11:00") }];
    const slots = computeDaySlots({ ...base, busy, bufferAfterMin: 30 });
    assert.ok(!slots.includes("11:00")); // within the 30-min after-buffer
    assert.ok(slots.includes("11:30"));
  });
});

describe("resolveDayHours — weekly hours + SpecialDay overrides", () => {
  test("salon closed today (weekly not open) → closed", () => {
    assert.equal(resolveDayHours({ isOpen: false, openTime: "09:00", closeTime: "18:00" }, null).open, false);
  });
  test("no weekly row → closed", () => {
    assert.equal(resolveDayHours(null, null).open, false);
  });
  test("SpecialDay closed overrides open weekly hours", () => {
    const weekly = { isOpen: true, openTime: "09:00", closeTime: "18:00" };
    assert.equal(resolveDayHours(weekly, { isClosed: true, openTime: null, closeTime: null }).open, false);
  });
  test("SpecialDay custom hours override the weekly window", () => {
    const weekly = { isOpen: true, openTime: "09:00", closeTime: "18:00" };
    const r = resolveDayHours(weekly, { isClosed: false, openTime: "12:00", closeTime: "16:00" });
    assert.equal(r.open, true);
    assert.equal(r.openMin, 12 * 60);
    assert.equal(r.closeMin, 16 * 60);
  });
  test("open weekly day carries its breaks through", () => {
    const weekly = { isOpen: true, openTime: "09:00", closeTime: "18:00", breaks: [{ startTime: "12:00", endTime: "13:00" }] };
    const r = resolveDayHours(weekly, null);
    assert.equal(r.open, true);
    assert.deepEqual(r.breaks, [{ startMin: 720, endMin: 780 }]);
  });
});
