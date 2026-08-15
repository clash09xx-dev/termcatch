import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Calendar synchronization.
 *
 * The feature touches the two things this codebase protects hardest — the
 * double-booking guarantee and tenant isolation — so the suite is written
 * around failure, not around the happy path. Roughly in order: does an absent
 * or broken Google stay harmless, does a present one actually block, can one
 * salon or one specialist reach another's calendar, and does anything here ever
 * create a second copy of an appointment.
 *
 * Two collaborators are faked: Prisma (an in-memory store swapped onto the
 * singleton, the same technique tests/bugfixes.test.ts uses) and fetch (scripted
 * per URL). Everything else is the real module under test.
 */

// Read at call time by every consumer, so setting them here is enough.
process.env.GOOGLE_CALENDAR_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "test-client-secret";
process.env.INTEGRATION_ENCRYPTION_KEY = "unit-test-integration-key-please-change";
process.env.NEXT_PUBLIC_APP_URL = "https://app.termcatch.test";

import { prisma } from "../lib/prisma";
import { createSecretBox } from "../lib/crypto/secret-box";
import { getExternalBusy, clearExternalBusyCache } from "../lib/calendar/external-busy";
import { checkExternalConflict } from "../lib/calendar/assert-free";
import { syncAppointmentToCalendars, removeAppointmentFromCalendars } from "../lib/calendar/mirror";
import { revokeAndClear, freeBusy } from "../lib/calendar/google-client";
import { connectionForActor, canConnectFor, type CalendarActor } from "../lib/calendar/access";
import { encodeState, decodeState, safeReturnTo } from "../lib/calendar/oauth-state";
import { GOOGLE_CALENDAR_SCOPES, GOOGLE_CALENDAR_CALLBACK_PATH } from "../lib/calendar/google-config";
import { pl } from "../lib/i18n/dictionaries/pl";
import { en } from "../lib/i18n/dictionaries/en";
import { de } from "../lib/i18n/dictionaries/de";
import { tr } from "../lib/i18n/dictionaries/tr";

const box = createSecretBox("google-calendar-token", "GOOGLE_CALENDAR");

// ── Fake Prisma ──────────────────────────────────────────────────────────────
// Only the two calendar tables, and only the operators the code actually uses.
// Deliberately literal: a matcher that quietly ignores a clause it does not
// understand would let a missing tenant filter pass as a green test.

type Row = Record<string, unknown>;

function matches(row: Row, where: Row): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR") {
      if (!(cond as Row[]).some((c) => matches(row, c))) return false;
      continue;
    }
    if (cond !== null && typeof cond === "object") {
      const c = cond as Row;
      if ("not" in c) {
        if (c.not === null) {
          if (row[key] === null || row[key] === undefined) return false;
        } else if (row[key] === c.not) return false;
        continue;
      }
      // Compound unique key, e.g. appointmentId_connectionId.
      if (!Object.entries(c).every(([k, v]) => row[k] === v)) return false;
      continue;
    }
    if (row[key] !== cond) return false;
  }
  return true;
}

let idSeq = 0;

function table(seed: Row[] = []) {
  let rows: Row[] = seed.map((r) => ({ ...r }));
  return {
    all: () => rows,
    reset: (next: Row[]) => {
      rows = next.map((r) => ({ ...r }));
    },
    findMany: async ({ where = {} }: { where?: Row } = {}) => rows.filter((r) => matches(r, where)).map((r) => ({ ...r })),
    findFirst: async ({ where = {} }: { where?: Row } = {}) => {
      const hit = rows.find((r) => matches(r, where));
      return hit ? { ...hit } : null;
    },
    findUnique: async ({ where = {} }: { where?: Row } = {}) => {
      const hit = rows.find((r) => matches(r, where));
      return hit ? { ...hit } : null;
    },
    update: async ({ where = {}, data = {} }: { where?: Row; data?: Row }) => {
      const hit = rows.find((r) => matches(r, where));
      if (!hit) throw new Error("record not found");
      Object.assign(hit, data);
      return { ...hit };
    },
    updateMany: async ({ where = {}, data = {} }: { where?: Row; data?: Row }) => {
      const hits = rows.filter((r) => matches(r, where));
      hits.forEach((h) => Object.assign(h, data));
      return { count: hits.length };
    },
    delete: async ({ where = {} }: { where?: Row }) => {
      const i = rows.findIndex((r) => matches(r, where));
      if (i < 0) throw new Error("record not found");
      return rows.splice(i, 1)[0];
    },
    upsert: async ({ where = {}, create = {}, update = {} }: { where?: Row; create?: Row; update?: Row }) => {
      const hit = rows.find((r) => matches(r, where));
      if (hit) {
        Object.assign(hit, update);
        return { ...hit };
      }
      const row = { id: `row-${++idSeq}`, ...create };
      rows.push(row);
      return { ...row };
    },
  };
}

type Table = ReturnType<typeof table>;

let connections: Table;
let links: Table;

const realConnections = (prisma as unknown as Row).calendarConnection;
const realLinks = (prisma as unknown as Row).appointmentCalendarEvent;

// ── Fake fetch ───────────────────────────────────────────────────────────────

type Call = { url: string; method: string; body: string | undefined; auth: string | undefined };
type Reply = { status: number; json?: unknown; text?: string };

let calls: Call[] = [];
let route: (url: string, method: string, body: string | undefined) => Reply = () => ({ status: 200, json: {} });
const realFetch = globalThis.fetch;

function callsTo(fragment: string, method?: string): Call[] {
  return calls.filter((c) => c.url.includes(fragment) && (!method || c.method === method));
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BIZ_A = "biz-a";
const BIZ_B = "biz-b";
const EMP_A = "emp-a";
const EMP_B = "emp-b";

const DAY = "2026-09-14";
const T = (hhmm: string) => new Date(`${DAY}T${hhmm}:00+02:00`).getTime();

function connRow(over: Row = {}): Row {
  return {
    id: "conn-1",
    businessId: BIZ_A,
    employeeId: null,
    provider: "google",
    status: "connected",
    readBusy: true,
    writeEvents: true,
    calendarId: "primary",
    calendarSummary: "Work",
    accountEmail: "salon@example.test",
    encryptedAccessToken: box.encrypt("access-token-live"),
    encryptedRefreshToken: box.encrypt("refresh-token-live"),
    accessTokenExpiresAt: new Date(Date.now() + 30 * 60_000),
    scope: GOOGLE_CALENDAR_SCOPES.join(" "),
    lastError: null,
    lastSyncedAt: null,
    connectedAt: new Date(),
    ...over,
  };
}

/** Google answers: busy in the given ranges, for whichever calendar was asked about. */
function googleBusy(ranges: [string, string][], own: [string, string][] = []) {
  return (url: string, _method: string, body: string | undefined): Reply => {
    if (url.includes("/freeBusy")) {
      const asked = (JSON.parse(body ?? "{}") as { items?: { id: string }[] }).items?.[0]?.id ?? "primary";
      return {
        status: 200,
        json: {
          calendars: {
            [asked]: {
              busy: ranges.map(([s, e]) => ({
                start: new Date(T(s)).toISOString(),
                end: new Date(T(e)).toISOString(),
              })),
            },
          },
        },
      };
    }
    if (url.includes("/events")) {
      return {
        status: 200,
        json: {
          items: own.map(([s, e]) => ({
            id: "ev",
            status: "confirmed",
            start: { dateTime: new Date(T(s)).toISOString() },
            end: { dateTime: new Date(T(e)).toISOString() },
          })),
        },
      };
    }
    return { status: 200, json: {} };
  };
}

beforeEach(() => {
  clearExternalBusyCache();
  calls = [];
  route = () => ({ status: 200, json: {} });
  connections = table();
  links = table();
  (prisma as unknown as Row).calendarConnection = connections;
  (prisma as unknown as Row).appointmentCalendarEvent = links;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    // URLSearchParams for form posts, a string for JSON — normalize so
    // assertions can just look for a substring.
    const body = init?.body === undefined ? undefined : String(init.body);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, method, body, auth: headers.Authorization });
    const r = route(url, method, body);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.json ?? {},
      text: async () => r.text ?? JSON.stringify(r.json ?? {}),
    } as Response;
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  (prisma as unknown as Row).calendarConnection = realConnections;
  (prisma as unknown as Row).appointmentCalendarEvent = realLinks;
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. A disconnected (or unconfigured) Google must be a non-event for booking.
// ─────────────────────────────────────────────────────────────────────────────
describe("1. booking still works with no Google connection", () => {
  test("no rows: no external busy, not degraded, no network call", async () => {
    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.deepEqual(res, { busy: [], degraded: false });
    assert.equal(calls.length, 0);
  });

  test("write path raises no conflict without a connection", async () => {
    const res = await checkExternalConflict({
      businessId: BIZ_A, dateYmd: DAY, startMs: T("10:00"), endMs: T("11:00"),
    });
    assert.deepEqual(res, { conflict: false, degraded: false });
  });

  test("a disconnected row is ignored rather than errored on", async () => {
    connections.reset([connRow({ status: "disconnected" }), connRow({ id: "c2", status: "needs_reauth" })]);
    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.deepEqual(res.busy, []);
    assert.equal(calls.length, 0);
  });

  test("integration not configured: feature is off, no DB read at all", async () => {
    const id = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID;
    try {
      connections.reset([connRow()]);
      const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
      assert.deepEqual(res, { busy: [], degraded: false });
      assert.equal(calls.length, 0);
    } finally {
      process.env.GOOGLE_CALENDAR_CLIENT_ID = id;
    }
  });

  test("a database failure degrades instead of throwing into the booking page", async () => {
    (prisma as unknown as Row).calendarConnection = {
      findMany: async () => { throw new Error("db down"); },
    };
    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.deepEqual(res, { busy: [], degraded: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2 & 3. Blocking is real, and adjacency is not blocking.
// ─────────────────────────────────────────────────────────────────────────────
describe("2. a Google busy period blocks the slot", () => {
  beforeEach(() => {
    connections.reset([connRow()]);
    route = googleBusy([["10:00", "11:00"]]);
  });

  test("busy interval reaches the availability engine", async () => {
    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.equal(res.degraded, false);
    assert.deepEqual(res.busy, [{ startMs: T("10:00"), endMs: T("11:00") }]);
  });

  test("the write path rejects an overlapping booking", async () => {
    for (const [s, e] of [["10:00", "11:00"], ["10:30", "11:30"], ["09:30", "10:30"], ["10:15", "10:45"]] as const) {
      const res = await checkExternalConflict({ businessId: BIZ_A, dateYmd: DAY, startMs: T(s), endMs: T(e) });
      assert.equal(res.conflict, true, `${s}-${e} should have been rejected`);
    }
  });

  test("an unreachable Google does NOT reject the booking (outage must not close a salon)", async () => {
    clearExternalBusyCache();
    route = () => ({ status: 503 });
    const res = await checkExternalConflict({
      businessId: BIZ_A, dateYmd: DAY, startMs: T("10:00"), endMs: T("11:00"),
    });
    assert.deepEqual(res, { conflict: false, degraded: true });
  });
});

describe("3. an adjacent event does not falsely block", () => {
  beforeEach(() => {
    connections.reset([connRow()]);
    route = googleBusy([["10:00", "11:00"]]);
  });

  test("back-to-back bookings on either side stay available", async () => {
    for (const [s, e] of [["11:00", "12:00"], ["09:00", "10:00"]] as const) {
      const res = await checkExternalConflict({ businessId: BIZ_A, dateYmd: DAY, startMs: T(s), endMs: T(e) });
      assert.deepEqual(res, { conflict: false, degraded: false }, `${s}-${e} should have stayed bookable`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. One specialist's calendar must not bleed into another's availability.
// ─────────────────────────────────────────────────────────────────────────────
describe("4. per-employee isolation", () => {
  beforeEach(() => {
    connections.reset([
      connRow({ id: "conn-a", employeeId: EMP_A, calendarId: "primary" }),
      connRow({ id: "conn-b", employeeId: EMP_B, calendarId: "other" }),
    ]);
  });

  test("employee A's busy time does not block employee B", async () => {
    route = (url, _m, body) => {
      if (url.includes("/freeBusy")) {
        const asked = JSON.parse(body ?? "{}") as { items: { id: string }[] };
        const cal = asked.items[0].id;
        return {
          status: 200,
          json: {
            calendars: {
              [cal]: {
                busy: cal === "primary"
                  ? [{ start: new Date(T("10:00")).toISOString(), end: new Date(T("11:00")).toISOString() }]
                  : [],
              },
            },
          },
        };
      }
      return { status: 200, json: { items: [] } };
    };

    const forA = await checkExternalConflict({
      businessId: BIZ_A, dateYmd: DAY, startMs: T("10:00"), endMs: T("11:00"), employeeId: EMP_A,
    });
    assert.equal(forA.conflict, true);

    clearExternalBusyCache();
    calls = [];
    const forB = await checkExternalConflict({
      businessId: BIZ_A, dateYmd: DAY, startMs: T("10:00"), endMs: T("11:00"), employeeId: EMP_B,
    });
    assert.equal(forB.conflict, false);
    // B's lookup must never have touched A's calendar at all.
    assert.equal(calls.some((c) => (c.body ?? "").includes("primary")), false);
  });

  test("'any specialist' reads every connected calendar", async () => {
    route = googleBusy([["10:00", "11:00"]]);
    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.equal(callsTo("/freeBusy", "POST").length, 2);
    // Each busy calendar removes one unit of capacity, exactly like an appointment.
    assert.equal(res.busy.length, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Tenant isolation.
// ─────────────────────────────────────────────────────────────────────────────
describe("5. business A cannot reach business B's connection", () => {
  const ownerA: CalendarActor = { userId: "u-a", businessId: BIZ_A, employeeId: null, isOwner: true };
  const staffA: CalendarActor = { userId: "u-s", businessId: BIZ_A, employeeId: EMP_A, isOwner: false };

  beforeEach(() => {
    connections.reset([
      connRow({ id: "conn-a", businessId: BIZ_A, employeeId: EMP_A }),
      connRow({ id: "conn-b", businessId: BIZ_B, employeeId: null }),
    ]);
  });

  test("a foreign connection id resolves to nothing, not to a rejected row", async () => {
    assert.equal(await connectionForActor(ownerA, "conn-b"), null);
  });

  test("the owner reaches their own salon's connection", async () => {
    const conn = await connectionForActor(ownerA, "conn-a");
    assert.equal(conn?.id, "conn-a");
  });

  test("a specialist cannot manage a colleague's connection", async () => {
    connections.reset([
      connRow({ id: "conn-a", businessId: BIZ_A, employeeId: EMP_A }),
      connRow({ id: "conn-other", businessId: BIZ_A, employeeId: EMP_B }),
    ]);
    assert.equal(await connectionForActor(staffA, "conn-other"), null);
    assert.equal((await connectionForActor(staffA, "conn-a"))?.id, "conn-a");
  });

  test("a specialist may only start a connect flow for themselves", () => {
    assert.equal(canConnectFor(staffA, EMP_A), true);
    assert.equal(canConnectFor(staffA, EMP_B), false);
    assert.equal(canConnectFor(staffA, null), false, "staff must not claim the salon-wide calendar");
    assert.equal(canConnectFor(ownerA, null), true);
    assert.equal(canConnectFor(ownerA, EMP_B), true);
  });

  test("busy lookups are scoped by business", async () => {
    route = googleBusy([["10:00", "11:00"]]);
    await getExternalBusy({ businessId: BIZ_B, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    // Only B's single connection, never A's.
    assert.equal(callsTo("/freeBusy", "POST").length, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6 & 7. Mirroring is idempotent: one appointment, one Google event, forever.
// ─────────────────────────────────────────────────────────────────────────────
describe("6. duplicate Google event creation is prevented", () => {
  const payload = {
    appointmentId: "appt-1",
    businessId: BIZ_A,
    employeeId: null,
    startIso: new Date(T("10:00")).toISOString(),
    endIso: new Date(T("11:00")).toISOString(),
    timeZone: "Europe/Warsaw",
    summary: "Strzyzenie",
  };

  beforeEach(() => {
    connections.reset([connRow()]);
    route = (url, method) => {
      if (url.includes("/events") && method === "POST") return { status: 200, json: { id: "gcal-event-1" } };
      return { status: 200, json: {} };
    };
  });

  test("syncing the same appointment twice creates one event, then patches it", async () => {
    await syncAppointmentToCalendars(payload);
    await syncAppointmentToCalendars(payload);

    assert.equal(callsTo("/events", "POST").length, 1, "a second create would be a duplicate appointment in Google");
    assert.equal(callsTo("/events/gcal-event-1", "PATCH").length, 1);
    assert.equal(links.all().length, 1);
    assert.equal(links.all()[0].externalEventId, "gcal-event-1");
    assert.equal(links.all()[0].syncState, "synced");
  });

  test("an appointment is written to one calendar only, never the specialist's AND the salon's", async () => {
    connections.reset([
      connRow({ id: "conn-emp", employeeId: EMP_A }),
      connRow({ id: "conn-salon", employeeId: null }),
    ]);
    await syncAppointmentToCalendars({ ...payload, employeeId: EMP_A });
    assert.equal(callsTo("/events", "POST").length, 1, "two events would consume two units of capacity");
  });

  test("a specialist with no calendar of their own falls back to the salon calendar", async () => {
    connections.reset([connRow({ id: "conn-salon", employeeId: null })]);
    await syncAppointmentToCalendars({ ...payload, employeeId: EMP_A });
    assert.equal(callsTo("/events", "POST").length, 1);
  });

  test("a failed create is recorded, not silently lost, and never throws", async () => {
    route = () => ({ status: 500 });
    await syncAppointmentToCalendars(payload);
    assert.equal(links.all().length, 1);
    assert.equal(links.all()[0].syncState, "failed");
    assert.equal(links.all()[0].lastError, "create_failed");
    // The appointment itself is untouched: the mirror lives in after(), outside
    // the transaction, and resolves rather than rejecting.
  });

  test("writing is off by default per connection: writeEvents=false mirrors nothing", async () => {
    connections.reset([connRow({ writeEvents: false })]);
    await syncAppointmentToCalendars(payload);
    assert.equal(calls.length, 0);
    assert.equal(links.all().length, 0);
  });
});

describe("7. a reschedule updates the existing event", () => {
  const base = {
    appointmentId: "appt-2",
    businessId: BIZ_A,
    employeeId: null,
    timeZone: "Europe/Warsaw",
    summary: "Strzyzenie",
  };

  beforeEach(() => {
    connections.reset([connRow()]);
    route = (url, method) => {
      if (url.includes("/events") && method === "POST") return { status: 200, json: { id: "gcal-event-2" } };
      return { status: 200, json: {} };
    };
  });

  test("PATCHes the same event id with the new time instead of creating a second one", async () => {
    await syncAppointmentToCalendars({
      ...base, startIso: new Date(T("10:00")).toISOString(), endIso: new Date(T("11:00")).toISOString(),
    });
    await syncAppointmentToCalendars({
      ...base, startIso: new Date(T("14:00")).toISOString(), endIso: new Date(T("15:00")).toISOString(),
    });

    assert.equal(callsTo("/events", "POST").length, 1);
    const patch = callsTo("/events/gcal-event-2", "PATCH");
    assert.equal(patch.length, 1);
    assert.ok((patch[0].body ?? "").includes(new Date(T("14:00")).toISOString()));
    assert.equal(links.all().length, 1);
  });

  test("an event deleted by hand in Google is recreated rather than patched forever", async () => {
    await syncAppointmentToCalendars({
      ...base, startIso: new Date(T("10:00")).toISOString(), endIso: new Date(T("11:00")).toISOString(),
    });
    route = (url, method) => {
      if (url.includes("/events/gcal-event-2") && method === "PATCH") return { status: 410 };
      if (url.includes("/events") && method === "POST") return { status: 200, json: { id: "gcal-event-2b" } };
      return { status: 200, json: {} };
    };
    await syncAppointmentToCalendars({
      ...base, startIso: new Date(T("14:00")).toISOString(), endIso: new Date(T("15:00")).toISOString(),
    });

    assert.equal(links.all().length, 1);
    assert.equal(links.all()[0].externalEventId, "gcal-event-2b");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Cancellation.
// ─────────────────────────────────────────────────────────────────────────────
describe("8. cancellation removes the mirrored event safely", () => {
  beforeEach(() => {
    connections.reset([connRow()]);
    links.reset([{
      id: "link-1", appointmentId: "appt-3", connectionId: "conn-1",
      externalEventId: "gcal-event-3", externalCalendarId: "primary", syncState: "synced", lastError: null,
    }]);
  });

  test("deletes the event and drops the link", async () => {
    route = () => ({ status: 204 });
    await removeAppointmentFromCalendars("appt-3");
    assert.equal(callsTo("/events/gcal-event-3", "DELETE").length, 1);
    assert.equal(links.all().length, 0);
  });

  test("an already-deleted event counts as done (no retry loop)", async () => {
    route = () => ({ status: 410 });
    await removeAppointmentFromCalendars("appt-3");
    assert.equal(links.all().length, 0);
  });

  test("a Google failure leaves a visible leftover instead of losing it", async () => {
    route = () => ({ status: 500 });
    await removeAppointmentFromCalendars("appt-3");
    assert.equal(links.all().length, 1);
    assert.equal(links.all()[0].syncState, "failed");
    assert.equal(links.all()[0].lastError, "delete_failed");
  });

  test("a link from a failed create is cleaned up without calling Google", async () => {
    links.reset([{
      id: "link-2", appointmentId: "appt-4", connectionId: "conn-1",
      externalEventId: "", externalCalendarId: null, syncState: "failed", lastError: "create_failed",
    }]);
    await removeAppointmentFromCalendars("appt-4");
    assert.equal(calls.length, 0);
    assert.equal(links.all().length, 0);
  });

  test("cancelling an appointment that was never mirrored is a no-op", async () => {
    links.reset([]);
    await removeAppointmentFromCalendars("appt-never");
    assert.equal(calls.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9 & 10. Token lifecycle.
// ─────────────────────────────────────────────────────────────────────────────
describe("9. an expired access token is refreshed transparently", () => {
  beforeEach(() => {
    connections.reset([connRow({
      encryptedAccessToken: box.encrypt("stale-access-token"),
      accessTokenExpiresAt: new Date(Date.now() - 60_000),
    })]);
  });

  test("refreshes, stores the new token encrypted, and completes the read", async () => {
    route = (url) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return { status: 200, json: { access_token: "fresh-access-token", expires_in: 3600 } };
      }
      if (url.includes("/freeBusy")) {
        return { status: 200, json: { calendars: { primary: { busy: [] } } } };
      }
      return { status: 200, json: { items: [] } };
    };

    const busy = await freeBusy("conn-1", "primary", T("09:00"), T("18:00"));
    assert.deepEqual(busy, []);

    const refresh = callsTo("oauth2.googleapis.com/token", "POST");
    assert.equal(refresh.length, 1);
    assert.ok((refresh[0].body ?? "").includes("grant_type=refresh_token"));

    const row = connections.all()[0];
    assert.equal(row.status, "connected");
    // Stored encrypted, and it really is the new token.
    assert.notEqual(row.encryptedAccessToken, "fresh-access-token");
    assert.ok(!String(row.encryptedAccessToken).includes("fresh-access-token"));
    assert.equal(box.decrypt(String(row.encryptedAccessToken)), "fresh-access-token");
    // The API call carried the refreshed token, not the stale one.
    assert.equal(callsTo("/freeBusy")[0].auth, "Bearer fresh-access-token");
  });

  test("a connection with no refresh token asks for reconnection instead of failing silently", async () => {
    connections.reset([connRow({ encryptedRefreshToken: null, accessTokenExpiresAt: new Date(Date.now() - 60_000) })]);
    const busy = await freeBusy("conn-1", "primary", T("09:00"), T("18:00"));
    assert.equal(busy, null);
    assert.equal(connections.all()[0].status, "needs_reauth");
    assert.equal(connections.all()[0].lastError, "missing_refresh_token");
  });
});

describe("10. a revoked grant becomes an actionable state", () => {
  beforeEach(() => {
    connections.reset([connRow({ accessTokenExpiresAt: new Date(Date.now() - 60_000) })]);
  });

  test("400 invalid_grant marks needs_reauth, and availability degrades rather than opening the slot", async () => {
    route = (url) => (url.includes("oauth2.googleapis.com/token") ? { status: 400 } : { status: 200, json: {} });

    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.equal(res.degraded, true, "the salon must be told protection was lost");

    const row = connections.all()[0];
    assert.equal(row.status, "needs_reauth");
    assert.equal(row.lastError, "revoked");
  });

  test("a 5xx at the token endpoint is an error, not a revocation", async () => {
    route = (url) => (url.includes("oauth2.googleapis.com/token") ? { status: 503 } : { status: 200, json: {} });
    await freeBusy("conn-1", "primary", T("09:00"), T("18:00"));
    assert.equal(connections.all()[0].status, "error");
    assert.equal(connections.all()[0].lastError, "refresh_failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Disconnect.
// ─────────────────────────────────────────────────────────────────────────────
describe("11. disconnect revokes at Google and destroys local credentials", () => {
  beforeEach(() => connections.reset([connRow()]));

  test("revokes first, then clears every credential column", async () => {
    route = () => ({ status: 200, json: {} });
    await revokeAndClear("conn-1");

    const revoke = callsTo("oauth2.googleapis.com/revoke", "POST");
    assert.equal(revoke.length, 1);
    assert.ok((revoke[0].body ?? "").includes("refresh-token-live"));

    const row = connections.all()[0];
    assert.equal(row.encryptedAccessToken, null);
    assert.equal(row.encryptedRefreshToken, null);
    assert.equal(row.accessTokenExpiresAt, null);
    assert.equal(row.scope, null);
    assert.equal(row.status, "disconnected");
    assert.equal(row.readBusy, false);
    assert.equal(row.writeEvents, false);
  });

  test("credentials are cleared even when Google's revoke endpoint fails", async () => {
    route = () => ({ status: 500 });
    await revokeAndClear("conn-1");
    const row = connections.all()[0];
    assert.equal(row.encryptedRefreshToken, null);
    assert.equal(row.status, "disconnected");
  });

  test("a disconnected connection stops contributing busy periods", async () => {
    route = () => ({ status: 200, json: {} });
    await revokeAndClear("conn-1");
    clearExternalBusyCache();
    calls = [];
    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.deepEqual(res, { busy: [], degraded: false });
    assert.equal(calls.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Loop prevention: our own mirror must not come back in as a second booking.
// ─────────────────────────────────────────────────────────────────────────────
describe("12. our own mirrored events do not feed back in", () => {
  beforeEach(() => connections.reset([connRow()]));

  test("a busy span that is our own mirror is subtracted", async () => {
    route = googleBusy([["10:00", "11:00"]], [["10:00", "11:00"]]);
    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.deepEqual(res.busy, [], "counting it here as well as from our own DB would eat two chairs for one booking");
  });

  test("a genuinely external event at another time still blocks", async () => {
    route = googleBusy([["10:00", "11:00"], ["15:00", "16:00"]], [["10:00", "11:00"]]);
    const res = await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    assert.deepEqual(res.busy, [{ startMs: T("15:00"), endMs: T("16:00") }]);
  });

  test("the own-events query filters server-side on our private marker and asks for no content", async () => {
    route = googleBusy([["10:00", "11:00"]], []);
    await getExternalBusy({ businessId: BIZ_A, dateYmd: DAY, fromMs: T("09:00"), toMs: T("18:00") });
    const list = callsTo("/events", "GET")[0];
    assert.ok(list, "expected an events.list call");
    assert.ok(list.url.includes("privateExtendedProperty=termcatchSource%3Dtermcatch"));
    assert.ok(!list.url.includes("summary"), "we must not request event titles");
    assert.ok(!list.url.includes("description"));
    assert.ok(!list.url.includes("attendees"));
  });

  test("no calendar module ever creates a TermCatch appointment from a Google event", () => {
    const dir = join(process.cwd(), "lib/calendar");
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), "utf8");
      assert.ok(
        !/prisma\.appointment\.(create|upsert|createMany)/.test(src),
        `${f} must not turn calendar events into appointments`,
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Privacy and secret handling — §4 and §11 of the brief.
// ─────────────────────────────────────────────────────────────────────────────
describe("privacy and secret handling", () => {
  test("busy reads go through FreeBusy, which returns times and nothing else", () => {
    const src = readFileSync(join(process.cwd(), "lib/calendar/google-client.ts"), "utf8");
    assert.ok(src.includes("/freeBusy"));
    assert.ok(src.includes("startMs") && src.includes("endMs"));
  });

  test("no calendar module logs anything", () => {
    const dir = join(process.cwd(), "lib/calendar");
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), "utf8");
      assert.ok(!/console\.(log|info|warn|error|debug)/.test(src), `${f} must not log; tokens and event data pass through it`);
    }
  });

  test("nothing outside google-client decrypts a token", () => {
    const dir = join(process.cwd(), "lib/calendar");
    for (const f of readdirSync(dir)) {
      if (f === "google-client.ts") continue;
      const src = readFileSync(join(dir, f), "utf8");
      assert.ok(!src.includes("createSecretBox"), `${f} must not hold its own crypto box`);
    }
  });

  test("the settings page never selects token columns into the render tree", () => {
    const src = readFileSync(
      join(process.cwd(), "app/business/(business-layout)/settings/calendar/page.tsx"),
      "utf8",
    );
    assert.ok(!src.includes("encryptedAccessToken"));
    assert.ok(!src.includes("encryptedRefreshToken"));
  });

  test("no event content is persisted: the link row stores ids and state only", () => {
    const src = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const block = src.slice(src.indexOf("model AppointmentCalendarEvent"));
    const body = block.slice(0, block.indexOf("\n}"));
    for (const forbidden of ["summary", "description", "attendee", "location"]) {
      assert.ok(!body.toLowerCase().includes(forbidden), `AppointmentCalendarEvent must not store ${forbidden}`);
    }
  });

  test("token ciphertext is domain-separated from other integrations", () => {
    const calendar = createSecretBox("google-calendar-token", "GOOGLE_CALENDAR");
    const other = createSecretBox("some-other-integration");
    assert.equal(other.decrypt(calendar.encrypt("refresh-token")), null);
  });

  test("scopes are least privilege: read-only plus events we own", () => {
    assert.deepEqual([...GOOGLE_CALENDAR_SCOPES], [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events.owned",
    ]);
    // The broad write scope would let a bug touch the user's own events.
    assert.ok(!GOOGLE_CALENDAR_SCOPES.includes("https://www.googleapis.com/auth/calendar" as never));
  });
});

describe("OAuth state: CSRF and open-redirect", () => {
  const state = { userId: "u-1", businessId: BIZ_A, employeeId: EMP_A, returnTo: "/business/settings/calendar" };

  test("round-trips", () => {
    assert.deepEqual(decodeState(encodeState(state)), state);
  });

  test("a tampered payload or signature is rejected", () => {
    const raw = encodeState(state);
    const [body, sig] = [raw.slice(0, raw.lastIndexOf(".")), raw.slice(raw.lastIndexOf(".") + 1)];
    const forged = Buffer.from(JSON.stringify({ ...state, businessId: BIZ_B, n: "x", t: Date.now() })).toString("base64url");
    assert.equal(decodeState(`${forged}.${sig}`), null);
    assert.equal(decodeState(`${body}.${sig.slice(0, -1)}A`), null);
    assert.equal(decodeState("garbage"), null);
    assert.equal(decodeState(null), null);
  });

  test("protocol-relative and absolute return targets are refused", () => {
    assert.equal(safeReturnTo("//evil.example"), "/business/settings/calendar");
    assert.equal(safeReturnTo("https://evil.example"), "/business/settings/calendar");
    assert.equal(safeReturnTo("/business/settings"), "/business/settings");
    assert.equal(safeReturnTo(undefined), "/business/settings/calendar");
  });

  test("the callback path is a single fixed value (must match Cloud Console exactly)", () => {
    assert.equal(GOOGLE_CALENDAR_CALLBACK_PATH, "/api/integrations/google-calendar/callback");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Honesty about Booksy.
// ─────────────────────────────────────────────────────────────────────────────
describe("13. the Booksy wizard never claims a direct integration", () => {
  const locales = { pl, en, de, tr };

  // Verified 2026-08-15: Booksy exposes no self-serve public API, and pushes
  // nothing outward to Google. Copy implying otherwise would be a lie the salon
  // only discovers when a Booksy booking double-books them.
  //
  // The copy DOES have to talk about connecting and Booksy in the same breath —
  // that is how you say "we do not connect to Booksy". So the check is per
  // sentence: any sentence pairing Booksy with a connect/sync verb must also
  // carry that locale's negation.
  const NEGATION: Record<string, RegExp> = {
    pl: /\bnie\b/i,
    en: /\b(not|no|cannot|without)\b/i,
    de: /\b(nicht|kein\w*|ohne)\b/i,
    tr: /(değil|yok|sunmuyor|vaat etmiyoruz|\w+m[ae]z\b|\w+miyor\b|\w+muyor\b)/i,
  };
  const CLAIM = /(connect|integrat|synchroni|sync|bağlan|verbind|łącz|integrac|entegrasyon|senkroniz)/i;

  test("every sentence pairing Booksy with a connect or sync claim is negated", () => {
    for (const [name, dict] of Object.entries(locales)) {
      const copy = (dict as typeof pl).pages.calendarSync as unknown as Record<string, string>;
      for (const [key, value] of Object.entries(copy)) {
        // Headings and button labels are names, not assertions — "Synchronize
        // with Booksy" is the wizard's title, and the intro directly under it
        // is where the honest framing lives. Prose is what gets checked.
        if (/Title$|Link$|Cta$|Setup$|Status$/.test(key)) continue;
        for (const sentence of value.split(/(?<=[.!?])\s+/)) {
          if (!/booksy/i.test(sentence) || !CLAIM.test(sentence)) continue;
          // "Move your schedule into Booksy" / the .ics import are instructions
          // about Booksy's own UI, not claims about a TermCatch connection.
          if (/termcatch/i.test(sentence) === false && !/synchroni|senkroniz|sync/i.test(sentence)) continue;
          assert.ok(
            NEGATION[name].test(sentence),
            `${name}.${key} states a Booksy connection without negating it: "${sentence}"`,
          );
        }
      }
    }
  });

  test("no locale advertises a direct Booksy integration or an API key", () => {
    const forbidden = [
      /booksy api key/i,
      /klucz api booksy/i,
      /bezpośrednia integracja z booksy/i,
      /direct booksy integration/i,
      /direkte booksy-?integration/i,
      /doğrudan booksy entegrasyonu/i,
      /booksy ↔ termcatch/i,
    ];
    for (const [name, dict] of Object.entries(locales)) {
      const copy = JSON.stringify((dict as typeof pl).pages.calendarSync);
      for (const rx of forbidden) {
        assert.ok(!rx.test(copy), `${name} calendarSync copy matches forbidden claim ${rx}`);
      }
    }
  });

  test("no code path calls a Booksy endpoint", () => {
    const roots = ["lib/calendar", "app/business/(business-layout)/settings/calendar"];
    for (const root of roots) {
      const dir = join(process.cwd(), root);
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
        const src = readFileSync(join(dir, f), "utf8");
        // support.booksy.com is a help article link, not an API call.
        assert.ok(
          !/fetch\([^)]*booksy/i.test(src) && !/api\.booksy/i.test(src),
          `${root}/${f} appears to call Booksy, which has no usable public API`,
        );
      }
    }
  });

  test("every locale states the asymmetry: Booksy does not push out to Google", () => {
    for (const [name, dict] of Object.entries(locales)) {
      const c = (dict as typeof pl).pages.calendarSync;
      assert.ok(c.limit1.length > 20, `${name} limit1 must actually say something`);
      assert.ok(c.limitsNote.length > 20, `${name} limitsNote must actually say something`);
      assert.ok(/booksy/i.test(c.booksyBody), `${name} booksyBody must name Booksy`);
    }
  });

  test("the wizard component contains no hardcoded marketing copy", () => {
    const src = readFileSync(
      join(process.cwd(), "app/business/(business-layout)/settings/calendar/booksy-wizard.tsx"),
      "utf8",
    );
    // Everything a user reads comes from the dictionary, so the honesty checks
    // above cannot be bypassed by a string baked into the component.
    const literals = src.match(/>\s*[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][^<>{}\n]{6,}</g) ?? [];
    assert.deepEqual(literals, [], `unexpected hardcoded copy: ${literals.join(" | ")}`);
  });

  test("the wizard only performs the step it can actually perform", () => {
    const src = readFileSync(
      join(process.cwd(), "app/business/(business-layout)/settings/calendar/booksy-wizard.tsx"),
      "utf8",
    );
    assert.ok(src.includes("testCalendarSync"), "step 4 must run a real check, not a fake success");
    assert.ok(!/booksy.*fetch|fetch.*booksy/i.test(src), "there is no Booksy endpoint to call");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Locale parity.
// ─────────────────────────────────────────────────────────────────────────────
describe("14. locale parity for the new UI copy", () => {
  const plKeys = Object.keys(pl.pages.calendarSync).sort();

  for (const [name, dict] of Object.entries({ en, de, tr })) {
    test(`${name} has exactly the same calendarSync keys as pl`, () => {
      const keys = Object.keys((dict as typeof pl).pages.calendarSync).sort();
      assert.deepEqual(keys, plKeys);
    });

    test(`${name} translates every string (no leftover Polish, no empties)`, () => {
      const target = (dict as typeof pl).pages.calendarSync as Record<string, string>;
      const source = pl.pages.calendarSync as Record<string, string>;
      for (const k of plKeys) {
        assert.equal(typeof target[k], "string", `${name}.${k} must be a string`);
        assert.ok(target[k].trim().length > 0, `${name}.${k} is empty`);
        // Proper nouns and the identical placeholder-only strings are allowed
        // to match; anything longer that is byte-identical to Polish is untranslated.
        if (source[k].length > 30) {
          assert.notEqual(target[k], source[k], `${name}.${k} looks untranslated`);
        }
      }
    });

    test(`${name} keeps the same interpolation placeholders`, () => {
      const target = (dict as typeof pl).pages.calendarSync as Record<string, string>;
      const source = pl.pages.calendarSync as Record<string, string>;
      for (const k of plKeys) {
        const want = (source[k].match(/\{[a-z]+\}/gi) ?? []).sort();
        const got = (target[k].match(/\{[a-z]+\}/gi) ?? []).sort();
        assert.deepEqual(got, want, `${name}.${k} placeholder mismatch`);
      }
    });
  }
});
