import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  intervalsOverlap,
  assertSlotAvailable,
  mapBookingWriteError,
  isExclusionViolation,
  SLOT_TAKEN,
} from "../lib/booking-conflict";
import { encodeBookingIntent, decodeBookingIntent, bookingResumePath } from "../lib/booking-intent";
import { warsawDateTimeToUtc, warsawTimeString } from "../lib/timezone";
import { formatTime } from "../lib/i18n/format";

const D = (iso: string) => new Date(iso);

/** Minimal Prisma.TransactionClient stand-in for assertSlotAvailable. */
function mockTx(opts: { employeeConflict?: boolean; capacity?: number; concurrent?: number }): Prisma.TransactionClient {
  return {
    appointment: {
      findFirst: async () => (opts.employeeConflict ? { id: "existing" } : null),
      count: async () => opts.concurrent ?? 0,
    },
    employee: { count: async () => opts.capacity ?? 1 },
    $executeRaw: async () => 0,
  } as unknown as Prisma.TransactionClient;
}

// ── P0: double-booking conflict logic ────────────────────────────────────────
describe("double-booking guard", () => {
  test("1. conflicting booking for the SAME employee is rejected (SLOT_TAKEN)", async () => {
    await assert.rejects(
      () =>
        assertSlotAvailable(mockTx({ employeeConflict: true }), {
          businessId: "b1",
          employeeId: "emp-1",
          start: D("2026-07-15T08:00:00Z"),
          end: D("2026-07-15T09:00:00Z"),
        }),
      (e: Error) => e.message === SLOT_TAKEN
    );
  });

  test("2. a DIFFERENT employee at the same time is allowed (no throw)", async () => {
    // findFirst scoped to that employee returns null → free.
    await assert.doesNotReject(() =>
      assertSlotAvailable(mockTx({ employeeConflict: false }), {
        businessId: "b1",
        employeeId: "emp-2",
        start: D("2026-07-15T08:00:00Z"),
        end: D("2026-07-15T09:00:00Z"),
      })
    );
  });

  test("2b. 'any specialist' books while capacity remains, rejects when full", async () => {
    // 2 chairs, 1 concurrent booking → still bookable.
    await assert.doesNotReject(() =>
      assertSlotAvailable(mockTx({ capacity: 2, concurrent: 1 }), {
        businessId: "b1",
        employeeId: null,
        start: D("2026-07-15T08:00:00Z"),
        end: D("2026-07-15T09:00:00Z"),
      })
    );
    // 2 chairs, 2 concurrent → full → SLOT_TAKEN.
    await assert.rejects(
      () =>
        assertSlotAvailable(mockTx({ capacity: 2, concurrent: 2 }), {
          businessId: "b1",
          employeeId: null,
          start: D("2026-07-15T08:00:00Z"),
          end: D("2026-07-15T09:00:00Z"),
        }),
      (e: Error) => e.message === SLOT_TAKEN
    );
  });

  test("3. overlapping DURATIONS conflict; adjacent slots do not (half-open [) )", () => {
    const a0 = D("2026-07-15T10:00:00Z"), a1 = D("2026-07-15T11:00:00Z");
    assert.equal(intervalsOverlap(a0, a1, D("2026-07-15T10:30:00Z"), D("2026-07-15T11:30:00Z")), true);  // 10–11 vs 10:30–11:30
    assert.equal(intervalsOverlap(a0, a1, D("2026-07-15T09:30:00Z"), D("2026-07-15T10:30:00Z")), true);  // vs 9:30–10:30
    assert.equal(intervalsOverlap(a0, a1, D("2026-07-15T11:00:00Z"), D("2026-07-15T12:00:00Z")), false); // adjacent 11–12
    assert.equal(intervalsOverlap(a0, a1, D("2026-07-15T08:00:00Z"), D("2026-07-15T10:00:00Z")), false); // adjacent 8–10
  });

  test("6. a DB exclusion violation (23P01) maps to the friendly SLOT_TAKEN", () => {
    const pgErr = new Prisma.PrismaClientKnownRequestError("exclusion violated", {
      code: "P2010",
      clientVersion: "x",
      meta: { code: "23P01", constraint: "appointments_no_employee_overlap" },
    });
    assert.equal(isExclusionViolation(pgErr), true);
    assert.throws(() => mapBookingWriteError(pgErr), (e: Error) => e.message === SLOT_TAKEN);
    // An unrelated error is re-thrown UNCHANGED (never masked as a slot clash).
    const other = new Error("null constraint on customer_id");
    assert.equal(isExclusionViolation(other), false);
    assert.throws(() => mapBookingWriteError(other), (e: Error) => e.message === "null constraint on customer_id");
  });
});

// ── P0: Google-OAuth booking intent survives auth (identifiers ONLY) ──────────
describe("booking intent round-trip", () => {
  test("4. encodes + decodes serviceId/employeeId/date/time and resume flag", () => {
    const params = encodeBookingIntent({ serviceId: "svc-1", employeeId: "emp-9", date: "2026-07-15", time: "10:00" });
    const decoded = decodeBookingIntent(params);
    assert.equal(decoded.resume, true);
    assert.equal(decoded.serviceId, "svc-1");
    assert.equal(decoded.employeeId, "emp-9");
    assert.equal(decoded.date, "2026-07-15");
    assert.equal(decoded.time, "10:00");
  });

  test("4b. resume path survives full URL round-trip (query preserved)", () => {
    const path = bookingResumePath("nasz-salon", { serviceId: "svc-1", date: "2026-07-15", time: "10:00" });
    // Simulate what /auth/callback?next=<path> reconstructs.
    const url = new URL(`https://termcatch.com${path}`);
    const decoded = decodeBookingIntent(url.searchParams);
    assert.equal(decoded.serviceId, "svc-1");
    assert.equal(decoded.time, "10:00");
    assert.equal(decoded.resume, true);
  });

  test("5. intent carries NO price/discount/duration (server stays authoritative)", () => {
    const raw = encodeBookingIntent({ serviceId: "svc-1", employeeId: "emp-1", date: "2026-07-15", time: "10:00" }).toString();
    for (const forbidden of ["price", "discount", "duration", "total", "coupon", "amount"]) {
      assert.ok(!raw.includes(forbidden), `intent must not carry "${forbidden}"`);
    }
  });

  test("5b. a plain deep-link (?serviceId only, no resume) does NOT count as a resume", () => {
    const decoded = decodeBookingIntent(new URLSearchParams("serviceId=svc-1"));
    assert.equal(decoded.resume, false);
  });
});

// ── P1: Europe/Warsaw timezone correctness (DST-aware, both seasons) ──────────
describe("Warsaw timezone — 10:00 stays 10:00 in summer AND winter", () => {
  test("9. SUMMER (CEST, UTC+2): 10:00 booking stores 08:00Z and renders 10:00", () => {
    const utc = warsawDateTimeToUtc("2026-07-15", "10:00");
    assert.equal(utc.getUTCHours(), 8, "10:00 CEST is 08:00 UTC");
    assert.equal(warsawTimeString(utc), "10:00");
  });

  test("10. WINTER (CET, UTC+1): 10:00 booking stores 09:00Z and renders 10:00", () => {
    const utc = warsawDateTimeToUtc("2026-01-15", "10:00");
    assert.equal(utc.getUTCHours(), 9, "10:00 CET is 09:00 UTC");
    assert.equal(warsawTimeString(utc), "10:00");
  });

  test("11. i18n formatTime is pinned to Warsaw (never the server/UTC zone)", () => {
    // 08:00Z in summer is 10:00 in Warsaw — must read 10:00 regardless of runner TZ.
    assert.equal(formatTime(new Date("2026-07-15T08:00:00Z"), "en"), "10:00");
    assert.equal(formatTime(new Date("2026-01-15T09:00:00Z"), "de"), "10:00");
  });
});
