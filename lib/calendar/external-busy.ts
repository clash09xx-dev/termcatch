import "server-only";

import { prisma } from "@/lib/prisma";
import { freeBusy, ownMirroredBusy, type BusyInterval } from "./google-client";
import { googleCalendarConfigured } from "./google-config";

/**
 * External busy periods, for the availability engine.
 *
 * This is the safety-critical half of the integration: if Google says the
 * specialist is busy 10:00–11:00, TermCatch must not offer an overlapping slot.
 *
 * THREE THINGS THIS FILE IS CAREFUL ABOUT
 *
 * 1. OUR OWN MIRRORS. When outbound sync is on, a TermCatch appointment also
 *    exists as a Google event. Counting it from both sources would consume two
 *    units of capacity for one booking, so a multi-chair salon would look full
 *    at half occupancy. Mirrors are identified by the private marker we stamp
 *    on them and subtracted.
 *
 * 2. COST. A booking page must not fan out to Google once per employee per
 *    render. Results are cached briefly in process, and the whole lookup is
 *    bounded; a cache miss costs at most two calls per connected calendar for
 *    the whole day, not per slot.
 *
 * 3. FAILURE. Google being down must not take the booking page with it, and
 *    must not silently open slots that are actually taken. See the note on
 *    `degraded` below.
 */

export type ExternalBusyResult = {
  /** Busy spans to feed into computeDaySlots. */
  busy: BusyInterval[];
  /**
   * True when at least one connected calendar could NOT be read.
   *
   * Deliberately surfaced rather than swallowed. The engine still returns
   * slots — refusing to show any availability because Google is slow would be
   * worse for the salon than the risk it avoids — but the connection is marked
   * unhealthy so the business sees "Action required" instead of quietly losing
   * protection. The stale-cache fallback below means a brief outage usually
   * keeps the last known busy periods rather than dropping to nothing.
   */
  degraded: boolean;
};

const EMPTY: ExternalBusyResult = { busy: [], degraded: false };

// ── Cache ────────────────────────────────────────────────────
// Short by design: a busy period added in Google should start blocking within
// about a minute, which is far quicker than a human books, while still
// collapsing the dozens of reads a single booking session produces.
//
// In-process, so each server instance keeps its own copy. That is acceptable
// here because entries are short-lived and identical across instances; the
// only cost of a miss is one extra API call.
const TTL_MS = 60_000;
/** How long a stale entry may still be served when Google is unreachable. */
const STALE_GRACE_MS = 15 * 60_000;

type Entry = { at: number; busy: BusyInterval[] };
const cache = new Map<string, Entry>();

function cacheKey(connectionId: string, calendarId: string, dateYmd: string): string {
  return `${connectionId}|${calendarId}|${dateYmd}`;
}

/** Exposed for tests and for the "test synchronization" wizard step. */
export function clearExternalBusyCache(): void {
  cache.clear();
}

// ── Connection lookup ────────────────────────────────────────

type UsableConnection = { id: string; calendarId: string; employeeId: string | null };

/**
 * Connections that can actually be read right now.
 *
 * A row is usable only when it is connected, has a chosen calendar and has
 * busy-reading enabled. Anything else (needs_reauth, no calendar picked yet,
 * reading switched off) contributes nothing rather than erroring.
 */
async function usableConnections(
  businessId: string,
  employeeId?: string,
): Promise<UsableConnection[]> {
  const rows = await prisma.calendarConnection.findMany({
    where: {
      businessId,
      provider: "google",
      status: "connected",
      readBusy: true,
      calendarId: { not: null },
      // A specific specialist is bounded by their own calendar plus any
      // salon-wide one; "any specialist" reads every connected calendar.
      ...(employeeId ? { OR: [{ employeeId }, { employeeId: null }] } : {}),
    },
    select: { id: true, calendarId: true, employeeId: true },
  });

  return rows
    .filter((r): r is typeof r & { calendarId: string } => Boolean(r.calendarId))
    .map((r) => ({ id: r.id, calendarId: r.calendarId, employeeId: r.employeeId }));
}

// ── Read ─────────────────────────────────────────────────────

async function busyForConnection(
  conn: UsableConnection,
  dateYmd: string,
  fromMs: number,
  toMs: number,
): Promise<{ busy: BusyInterval[]; ok: boolean }> {
  const key = cacheKey(conn.id, conn.calendarId, dateYmd);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { busy: hit.busy, ok: true };

  const raw = await freeBusy(conn.id, conn.calendarId, fromMs, toMs);
  if (raw === null) {
    // Unreachable. Prefer a recent-but-stale answer over no protection at all:
    // yesterday's busy periods are a far better guess than "completely free".
    if (hit && Date.now() - hit.at < STALE_GRACE_MS) return { busy: hit.busy, ok: false };
    return { busy: [], ok: false };
  }

  // Remove our own mirrored appointments so they are not counted twice.
  // A failure here is non-fatal: keeping every busy span is the conservative
  // direction (it can only remove slots, never wrongly offer one).
  const mine = await ownMirroredBusy(conn.id, conn.calendarId, fromMs, toMs).catch(() => null);
  const busy = mine && mine.length > 0 ? subtractOwn(raw, mine) : raw;

  cache.set(key, { at: Date.now(), busy });
  return { busy, ok: true };
}

/**
 * Drop busy spans that exactly correspond to one of our own mirrors.
 *
 * Matched on start/end within a small tolerance rather than by id, because
 * FreeBusy returns no ids at all. The tolerance absorbs Google rounding without
 * being loose enough to swallow a genuinely different appointment: a real
 * second booking at the same minute would be a double-book we already prevent
 * in our own database.
 */
const MATCH_TOLERANCE_MS = 60_000;

function subtractOwn(all: BusyInterval[], own: BusyInterval[]): BusyInterval[] {
  return all.filter(
    (b) =>
      !own.some(
        (o) =>
          Math.abs(o.startMs - b.startMs) <= MATCH_TOLERANCE_MS &&
          Math.abs(o.endMs - b.endMs) <= MATCH_TOLERANCE_MS,
      ),
  );
}

/**
 * External busy for one business/day, ready for `computeDaySlots`.
 *
 * The result plugs into the engine's existing capacity model without changing
 * it: each returned span occupies one unit of capacity for the window it
 * covers, exactly like a TermCatch appointment. So for a chosen specialist
 * (capacity 1) their Google busy blocks the slot outright, and for "any
 * specialist" (capacity = number of specialists) one busy calendar removes one
 * chair rather than closing the salon.
 */
export async function getExternalBusy(input: {
  businessId: string;
  dateYmd: string;
  fromMs: number;
  toMs: number;
  employeeId?: string;
}): Promise<ExternalBusyResult> {
  if (!googleCalendarConfigured()) return EMPTY;

  let connections: UsableConnection[];
  try {
    connections = await usableConnections(input.businessId, input.employeeId);
  } catch {
    // A database hiccup here must not break the booking page.
    return { busy: [], degraded: true };
  }
  if (connections.length === 0) return EMPTY;

  const results = await Promise.all(
    connections.map((c) =>
      busyForConnection(c, input.dateYmd, input.fromMs, input.toMs).catch(() => ({
        busy: [] as BusyInterval[],
        ok: false,
      })),
    ),
  );

  return {
    busy: results.flatMap((r) => r.busy),
    degraded: results.some((r) => !r.ok),
  };
}
