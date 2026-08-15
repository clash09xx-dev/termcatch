"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerI18n } from "@/lib/i18n/server";
import { connectionForActor, resolveCalendarActor } from "@/lib/calendar/access";
import { listCalendars, revokeAndClear, type GoogleCalendarSummary } from "@/lib/calendar/google-client";
import { clearExternalBusyCache, getExternalBusy } from "@/lib/calendar/external-busy";
import { warsawDayEndUtc, warsawDayStartUtc } from "@/lib/timezone";

/**
 * Calendar-sync management actions.
 *
 * Every one of these starts by resolving the caller's position at the salon and
 * loading the connection THROUGH that position, so a submitted connection id
 * that belongs to another business simply finds nothing. No action trusts an id
 * from the client for anything except lookup.
 */

const SETTINGS_PATH = "/business/settings/calendar";

export type CalendarActionResult = { ok: true } | { ok: false; error: string };

// ── Calendar selection ───────────────────────────────────────

export type CalendarChoices =
  | { ok: true; calendars: GoogleCalendarSummary[] }
  | { ok: false; error: string };

/** The calendars in the connected account, for the picker. */
export async function fetchCalendarChoices(connectionId: string): Promise<CalendarChoices> {
  const { dict } = await getServerI18n();
  const T = dict.pages.calendarSync;

  const actor = await resolveCalendarActor();
  if (!actor) return { ok: false, error: dict.errors.forbidden };

  const conn = await connectionForActor(actor, connectionId);
  if (!conn) return { ok: false, error: dict.errors.forbidden };

  const calendars = await listCalendars(conn.id);
  if (!calendars) return { ok: false, error: T.errNeedsReconnect };

  return { ok: true, calendars };
}

/** Choose which calendar in the connected account is used. */
export async function selectCalendar(
  connectionId: string,
  calendarId: string,
  calendarSummary: string,
): Promise<CalendarActionResult> {
  const { dict } = await getServerI18n();

  const actor = await resolveCalendarActor();
  if (!actor) return { ok: false, error: dict.errors.forbidden };

  const conn = await connectionForActor(actor, connectionId);
  if (!conn) return { ok: false, error: dict.errors.forbidden };

  // Only a calendar the account actually holds — this stops an arbitrary id
  // being written and then queried against someone else's calendar.
  const calendars = await listCalendars(conn.id);
  if (!calendars) return { ok: false, error: dict.pages.calendarSync.errNeedsReconnect };
  const match = calendars.find((c) => c.id === calendarId);
  if (!match) return { ok: false, error: dict.errors.generic };

  await prisma.calendarConnection.update({
    where: { id: conn.id },
    data: { calendarId: match.id, calendarSummary: calendarSummary || match.summary, status: "connected", lastError: null },
  });

  clearExternalBusyCache();
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

// ── Direction switches ───────────────────────────────────────

/**
 * Turn the two directions on or off independently.
 *
 * Reading busy and writing events are genuinely different decisions: the first
 * only protects the salon from double-booking, the second puts TermCatch data
 * into someone's personal calendar. Bundling them behind one switch would make
 * the safe half hostage to the invasive one.
 */
export async function setSyncDirections(
  connectionId: string,
  input: { readBusy?: boolean; writeEvents?: boolean },
): Promise<CalendarActionResult> {
  const { dict } = await getServerI18n();

  const actor = await resolveCalendarActor();
  if (!actor) return { ok: false, error: dict.errors.forbidden };

  const conn = await connectionForActor(actor, connectionId);
  if (!conn) return { ok: false, error: dict.errors.forbidden };

  await prisma.calendarConnection.update({
    where: { id: conn.id },
    data: {
      ...(typeof input.readBusy === "boolean" ? { readBusy: input.readBusy } : {}),
      ...(typeof input.writeEvents === "boolean" ? { writeEvents: input.writeEvents } : {}),
    },
  });

  clearExternalBusyCache();
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

// ── Disconnect ───────────────────────────────────────────────

/**
 * Disconnect: revoke the grant at Google, then destroy the stored credentials.
 *
 * The row itself is kept (with status "disconnected" and every token column
 * nulled) rather than deleted, so the appointment ↔ event links that hang off
 * it are not silently cascaded away while a retry might still need them. The
 * user-visible outcome is the same: no credentials, no access, nothing syncing.
 */
export async function disconnectCalendar(connectionId: string): Promise<CalendarActionResult> {
  const { dict } = await getServerI18n();

  const actor = await resolveCalendarActor();
  if (!actor) return { ok: false, error: dict.errors.forbidden };

  const conn = await connectionForActor(actor, connectionId);
  if (!conn) return { ok: false, error: dict.errors.forbidden };

  try {
    await revokeAndClear(conn.id);
  } catch {
    return { ok: false, error: dict.errors.generic };
  }

  clearExternalBusyCache();
  revalidatePath(SETTINGS_PATH);
  return { ok: true };
}

// ── Wizard step 4: test synchronization ──────────────────────

export type SyncTestResult =
  | { ok: true; busyCount: number; degraded: boolean }
  | { ok: false; error: string };

/**
 * Read today's busy periods straight from Google, bypassing the cache.
 *
 * This is what makes the wizard's "test" step honest rather than decorative:
 * the user adds a busy block in Google, presses the button, and sees the count
 * TermCatch can actually see. If it is zero, the bridge is not working and they
 * find out here rather than after a double booking.
 */
export async function testCalendarSync(dateYmd?: string): Promise<SyncTestResult> {
  const { dict } = await getServerI18n();

  const actor = await resolveCalendarActor();
  if (!actor) return { ok: false, error: dict.errors.forbidden };

  const day = dateYmd && /^\d{4}-\d{2}-\d{2}$/.test(dateYmd)
    ? dateYmd
    : new Date().toISOString().slice(0, 10);

  clearExternalBusyCache();

  const result = await getExternalBusy({
    businessId: actor.businessId,
    dateYmd: day,
    fromMs: warsawDayStartUtc(day).getTime(),
    toMs: warsawDayEndUtc(day).getTime(),
    // Deliberately unscoped: the test should see every calendar the salon has
    // connected, not just the caller's own.
  });

  return { ok: true, busyCount: result.busy.length, degraded: result.degraded };
}
