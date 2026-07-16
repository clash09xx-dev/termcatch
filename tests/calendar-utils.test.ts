import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeLanes, getWeekStart, warsawTodayYmd } from "../lib/calendar-utils";

const EMPS = [{ id: "e1" }, { id: "e2" }];

describe("computeLanes — day-view lane assignment", () => {
  test("no employees → single unassigned lane", () => {
    assert.deepEqual(computeLanes([], "all", true), [null]);
    assert.deepEqual(computeLanes([], "all", false), [null]);
  });

  test("employees, no unassigned appointments → one lane per employee", () => {
    assert.deepEqual(computeLanes(EMPS, "all", false), EMPS);
  });

  test("employees + unassigned appointments → extra 'Bez przypisania' lane (the fixed bug)", () => {
    const lanes = computeLanes(EMPS, "all", true);
    assert.equal(lanes.length, 3);
    assert.equal(lanes[2], null); // unassigned lane exists — appointments can't vanish
  });

  test("employee filter → only that employee's lane", () => {
    assert.deepEqual(computeLanes(EMPS, "e2", true), [EMPS[1]]);
  });

  test("filter for unknown id → falls back to unassigned lane, never zero lanes", () => {
    assert.deepEqual(computeLanes(EMPS, "ghost", false), [null]);
  });
});

describe("getWeekStart — Monday-first weeks", () => {
  test("Wednesday → preceding Monday", () => {
    const ws = getWeekStart(new Date(2026, 6, 15)); // Wed 15 Jul 2026 local
    assert.equal(ws.getDay(), 1);
    assert.equal(ws.getDate(), 13);
  });

  test("Monday → same day", () => {
    const ws = getWeekStart(new Date(2026, 6, 13));
    assert.equal(ws.getDate(), 13);
  });

  test("Sunday belongs to the WEEK BEFORE's Monday (Monday-first)", () => {
    const ws = getWeekStart(new Date(2026, 6, 19)); // Sun 19 Jul
    assert.equal(ws.getDay(), 1);
    assert.equal(ws.getDate(), 13);
  });

  test("midnight is zeroed", () => {
    const ws = getWeekStart(new Date(2026, 6, 15, 17, 45));
    assert.equal(ws.getHours(), 0);
    assert.equal(ws.getMinutes(), 0);
  });
});

describe("warsawTodayYmd — Warsaw calendar day on any server timezone", () => {
  test("UTC 22:30 in July (CEST, UTC+2) is already the NEXT Warsaw day", () => {
    assert.equal(warsawTodayYmd(new Date("2026-07-16T22:30:00Z")), "2026-07-17");
  });

  test("UTC 12:00 is the same Warsaw day", () => {
    assert.equal(warsawTodayYmd(new Date("2026-07-16T12:00:00Z")), "2026-07-16");
  });

  test("winter (CET, UTC+1): 23:30 UTC is next Warsaw day", () => {
    assert.equal(warsawTodayYmd(new Date("2026-01-10T23:30:00Z")), "2026-01-11");
  });
});
