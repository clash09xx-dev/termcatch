import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isFutureStart,
  hoursUntil,
  changeAllowedByPolicy,
  intervalsOverlap,
} from "../lib/appointment-rules";

const at = (iso: string) => new Date(iso);

describe("isFutureStart — no booking in the past", () => {
  const now = at("2026-07-24T12:00:00Z");
  test("future start allowed", () => {
    assert.equal(isFutureStart(at("2026-07-24T13:00:00Z"), now), true);
  });
  test("past start rejected", () => {
    assert.equal(isFutureStart(at("2026-07-24T11:59:00Z"), now), false);
  });
  test("exactly now is not in the future", () => {
    assert.equal(isFutureStart(at("2026-07-24T12:00:00Z"), now), false);
  });
});

describe("changeAllowedByPolicy — cancellation/reschedule window", () => {
  const now = at("2026-07-24T12:00:00Z");
  test("allowed when more than limit hours remain (24h policy)", () => {
    assert.equal(changeAllowedByPolicy(at("2026-07-26T12:00:00Z"), now, 24), true); // 48h left
  });
  test("rejected inside the window", () => {
    assert.equal(changeAllowedByPolicy(at("2026-07-24T20:00:00Z"), now, 24), false); // 8h left
  });
  test("boundary: exactly limitHours is allowed", () => {
    assert.equal(changeAllowedByPolicy(at("2026-07-25T12:00:00Z"), now, 24), true); // exactly 24h
  });
  test("hoursUntil is negative once passed", () => {
    assert.ok(hoursUntil(at("2026-07-24T11:00:00Z"), now) < 0);
  });
});

describe("intervalsOverlap — double-booking rule (mirrors the SQL guard)", () => {
  const s = (h: number) => at(`2026-07-24T${String(h).padStart(2, "0")}:00:00Z`);
  test("overlapping intervals conflict", () => {
    // existing 10:00–11:00 vs new 10:30–11:30
    assert.equal(intervalsOverlap(s(10), s(11), at("2026-07-24T10:30:00Z"), at("2026-07-24T11:30:00Z")), true);
  });
  test("new inside existing conflicts", () => {
    assert.equal(intervalsOverlap(s(9), s(12), s(10), s(11)), true);
  });
  test("back-to-back does NOT conflict (half-open)", () => {
    assert.equal(intervalsOverlap(s(10), s(11), s(11), s(12)), false);
    assert.equal(intervalsOverlap(s(11), s(12), s(10), s(11)), false);
  });
  test("fully separate does not conflict", () => {
    assert.equal(intervalsOverlap(s(9), s(10), s(14), s(15)), false);
  });
});
