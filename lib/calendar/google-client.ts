import "server-only";

import { prisma } from "@/lib/prisma";
import { createSecretBox } from "@/lib/crypto/secret-box";
import {
  GOOGLE_CALENDAR_API,
  GOOGLE_REVOKE_URL,
  GOOGLE_TOKEN_URL,
  TC_APPOINTMENT_KEY,
  TC_SOURCE_KEY,
  TC_SOURCE_VALUE,
  googleCalendarCreds,
  googleCalendarRedirectUri,
} from "./google-config";

/**
 * Google Calendar API access.
 *
 * Everything that touches a token lives here, so there is exactly one place
 * that decrypts credentials and exactly one place that refreshes them. Nothing
 * in this file returns a token to a caller — callers pass a connection id and
 * get data back.
 *
 * NEVER LOGGED: access tokens, refresh tokens, event titles, descriptions,
 * attendees. Errors carry a short code and, at most, an HTTP status.
 */

const box = createSecretBox("google-calendar-token", "GOOGLE_CALENDAR");

/** Bounded so a slow or hanging Google never holds a booking page open. */
const REQUEST_TIMEOUT_MS = 4000;
/** Refresh a little early: a token that expires mid-request is a failed request. */
const EXPIRY_SKEW_MS = 60_000;

export type ConnectionStatus = "connected" | "needs_reauth" | "error" | "disconnected";

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresInSec: number;
  scope?: string | null;
};

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

// ── Token exchange ───────────────────────────────────────────

/** Authorization code → tokens. Called once, from the OAuth callback. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens | null> {
  const creds = googleCalendarCreds();
  if (!creds) return null;

  const res = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: googleCalendarRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;

  const j = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!j.access_token) return null;

  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? null,
    expiresInSec: j.expires_in ?? 3600,
    scope: j.scope ?? null,
  };
}

/**
 * A live access token for a connection, refreshing when needed.
 *
 * Returns null when the connection cannot be used, and marks WHY on the row so
 * the settings page can say "Action required" instead of failing silently:
 *   - no refresh token, or Google rejects it  -> needs_reauth
 *   - integration not configured              -> error
 */
async function accessTokenFor(connectionId: string): Promise<string | null> {
  const creds = googleCalendarCreds();
  if (!creds) return null;

  const conn = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      status: true,
      encryptedAccessToken: true,
      encryptedRefreshToken: true,
      accessTokenExpiresAt: true,
    },
  });
  if (!conn || conn.status === "disconnected") return null;

  // Still valid (with skew)? Use it.
  if (conn.encryptedAccessToken && conn.accessTokenExpiresAt) {
    const validUntil = conn.accessTokenExpiresAt.getTime() - EXPIRY_SKEW_MS;
    if (Date.now() < validUntil) {
      const token = box.decrypt(conn.encryptedAccessToken);
      if (token) return token;
      // Ciphertext no longer decrypts — the signing secret was rotated. Fall
      // through to refresh, which will re-encrypt with the current key.
    }
  }

  const refresh = conn.encryptedRefreshToken ? box.decrypt(conn.encryptedRefreshToken) : null;
  if (!refresh) {
    await markConnection(connectionId, "needs_reauth", "missing_refresh_token");
    return null;
  }

  const res = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    // 400 invalid_grant is the revoked/expired case: the user pulled access in
    // their Google account, or the grant aged out. Either way, reconnect.
    const revoked = res?.status === 400 || res?.status === 401;
    await markConnection(connectionId, revoked ? "needs_reauth" : "error", revoked ? "revoked" : "refresh_failed");
    return null;
  }

  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) {
    await markConnection(connectionId, "needs_reauth", "revoked");
    return null;
  }

  await prisma.calendarConnection.update({
    where: { id: connectionId },
    data: {
      encryptedAccessToken: box.encrypt(j.access_token),
      accessTokenExpiresAt: new Date(Date.now() + (j.expires_in ?? 3600) * 1000),
      status: "connected",
      lastError: null,
    },
  });

  return j.access_token;
}

/** Record health on the connection. `code` is a short marker, never API content. */
export async function markConnection(
  connectionId: string,
  status: ConnectionStatus,
  code: string | null,
): Promise<void> {
  await prisma.calendarConnection
    .update({ where: { id: connectionId }, data: { status, lastError: code } })
    .catch(() => {});
}

async function markSynced(connectionId: string): Promise<void> {
  await prisma.calendarConnection
    .update({
      where: { id: connectionId },
      data: { status: "connected", lastError: null, lastSyncedAt: new Date() },
    })
    .catch(() => {});
}

// ── Calendar list ────────────────────────────────────────────

export type GoogleCalendarSummary = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
};

/** The calendars this connection can see, so the user can pick one. */
export async function listCalendars(connectionId: string): Promise<GoogleCalendarSummary[] | null> {
  const token = await accessTokenFor(connectionId);
  if (!token) return null;

  const res = await fetchWithTimeout(
    `${GOOGLE_CALENDAR_API}/users/me/calendarList?minAccessRole=writer&maxResults=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => null);

  if (!res || !res.ok) {
    await markConnection(connectionId, res?.status === 401 ? "needs_reauth" : "error", "calendar_list_failed");
    return null;
  }

  const j = (await res.json()) as {
    items?: { id?: string; summary?: string; primary?: boolean; accessRole?: string }[];
  };
  await markSynced(connectionId);

  return (j.items ?? [])
    .filter((c): c is { id: string; summary?: string; primary?: boolean; accessRole?: string } => Boolean(c.id))
    .map((c) => ({
      id: c.id,
      summary: c.summary ?? c.id,
      primary: Boolean(c.primary),
      accessRole: c.accessRole ?? "reader",
    }));
}

// ── FreeBusy ─────────────────────────────────────────────────

export type BusyInterval = { startMs: number; endMs: number };

/**
 * Busy intervals from Google for one connection.
 *
 * FreeBusy is used rather than events.list on purpose: it returns ONLY start
 * and end times. No title, no description, no attendees, no location. The
 * product needs "busy 10:00–11:00" and nothing else, so it asks for nothing
 * else — the private contents of a specialist's calendar never reach our
 * servers, let alone our database.
 *
 * Returns null on any failure so the caller can distinguish "no busy periods"
 * from "we could not ask", which are very different for a booking decision.
 */
export async function freeBusy(
  connectionId: string,
  calendarId: string,
  fromMs: number,
  toMs: number,
): Promise<BusyInterval[] | null> {
  const token = await accessTokenFor(connectionId);
  if (!token) return null;

  const res = await fetchWithTimeout(`${GOOGLE_CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      timeMin: new Date(fromMs).toISOString(),
      timeMax: new Date(toMs).toISOString(),
      items: [{ id: calendarId }],
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    await markConnection(connectionId, res?.status === 401 ? "needs_reauth" : "error", "freebusy_failed");
    return null;
  }

  const j = (await res.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
  };
  const cal = j.calendars?.[calendarId];
  if (!cal || (cal.errors && cal.errors.length > 0)) {
    await markConnection(connectionId, "error", "freebusy_calendar_error");
    return null;
  }

  await markSynced(connectionId);
  return (cal.busy ?? []).map((b) => ({
    startMs: new Date(b.start).getTime(),
    endMs: new Date(b.end).getTime(),
  }));
}

/**
 * Event ids in a window that TermCatch itself created.
 *
 * FreeBusy cannot tell us which busy blocks are our own mirrors, so this second
 * call asks events.list for exactly the events carrying our private marker and
 * returns their time ranges. Subtracting these from the FreeBusy result is what
 * stops a mirrored appointment being counted twice (once from our database,
 * once from Google).
 *
 * privateExtendedProperty filters server-side, so we receive only our own
 * events — never anything the user wrote.
 */
export async function ownMirroredBusy(
  connectionId: string,
  calendarId: string,
  fromMs: number,
  toMs: number,
): Promise<BusyInterval[] | null> {
  const token = await accessTokenFor(connectionId);
  if (!token) return null;

  const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set("timeMin", new Date(fromMs).toISOString());
  url.searchParams.set("timeMax", new Date(toMs).toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("maxResults", "250");
  url.searchParams.set("privateExtendedProperty", `${TC_SOURCE_KEY}=${TC_SOURCE_VALUE}`);
  // Only the fields needed to match a time range — explicitly not summary.
  url.searchParams.set("fields", "items(id,start,end,status)");

  const res = await fetchWithTimeout(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);

  if (!res || !res.ok) return null;

  const j = (await res.json()) as {
    items?: { start?: { dateTime?: string }; end?: { dateTime?: string }; status?: string }[];
  };

  return (j.items ?? [])
    .filter((e) => e.status !== "cancelled" && e.start?.dateTime && e.end?.dateTime)
    .map((e) => ({
      startMs: new Date(e.start!.dateTime!).getTime(),
      endMs: new Date(e.end!.dateTime!).getTime(),
    }));
}

// ── Event write ──────────────────────────────────────────────

export type MirrorEventInput = {
  appointmentId: string;
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  timeZone: string;
};

function eventBody(input: MirrorEventInput) {
  return {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso, timeZone: input.timeZone },
    end: { dateTime: input.endIso, timeZone: input.timeZone },
    // The loop breaker. Private = visible only to this app.
    extendedProperties: {
      private: {
        [TC_SOURCE_KEY]: TC_SOURCE_VALUE,
        [TC_APPOINTMENT_KEY]: input.appointmentId,
      },
    },
  };
}

/** Create a mirrored event. Returns the Google event id, or null on failure. */
export async function createEvent(
  connectionId: string,
  calendarId: string,
  input: MirrorEventInput,
): Promise<string | null> {
  const token = await accessTokenFor(connectionId);
  if (!token) return null;

  const res = await fetchWithTimeout(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody(input)),
    },
  ).catch(() => null);

  if (!res || !res.ok) {
    await markConnection(connectionId, res?.status === 401 ? "needs_reauth" : "error", "event_create_failed");
    return null;
  }

  const j = (await res.json()) as { id?: string };
  if (!j.id) return null;
  await markSynced(connectionId);
  return j.id;
}

/**
 * Update an existing mirrored event in place.
 *
 * Returns "gone" when Google no longer has the event (404/410) — the user
 * deleted it by hand. The caller then knows to create a fresh one rather than
 * retrying a patch that can never succeed.
 */
export async function updateEvent(
  connectionId: string,
  calendarId: string,
  eventId: string,
  input: MirrorEventInput,
): Promise<"ok" | "gone" | "failed"> {
  const token = await accessTokenFor(connectionId);
  if (!token) return "failed";

  const res = await fetchWithTimeout(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody(input)),
    },
  ).catch(() => null);

  if (!res) return "failed";
  if (res.status === 404 || res.status === 410) return "gone";
  if (!res.ok) {
    await markConnection(connectionId, res.status === 401 ? "needs_reauth" : "error", "event_update_failed");
    return "failed";
  }
  await markSynced(connectionId);
  return "ok";
}

/** Delete a mirrored event. An already-gone event counts as success. */
export async function deleteEvent(
  connectionId: string,
  calendarId: string,
  eventId: string,
): Promise<boolean> {
  const token = await accessTokenFor(connectionId);
  if (!token) return false;

  const res = await fetchWithTimeout(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => null);

  if (!res) return false;
  // 410 Gone / 404 Not Found: someone removed it first. The desired end state
  // holds, so treat it as done rather than retrying forever.
  if (res.ok || res.status === 404 || res.status === 410) {
    await markSynced(connectionId);
    return true;
  }
  await markConnection(connectionId, res.status === 401 ? "needs_reauth" : "error", "event_delete_failed");
  return false;
}

// ── Disconnect ───────────────────────────────────────────────

/**
 * Revoke at Google, then destroy the local credentials.
 *
 * Order matters: revoke first so the grant is dead even if the delete fails,
 * and clear the columns regardless of what Google answers — a user who pressed
 * Disconnect must not be left with ciphertext on our side.
 */
export async function revokeAndClear(connectionId: string): Promise<void> {
  const conn = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
    select: { encryptedRefreshToken: true, encryptedAccessToken: true },
  });

  const token =
    (conn?.encryptedRefreshToken ? box.decrypt(conn.encryptedRefreshToken) : null) ??
    (conn?.encryptedAccessToken ? box.decrypt(conn.encryptedAccessToken) : null);

  if (token) {
    await fetchWithTimeout(GOOGLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    }).catch(() => null);
  }

  await prisma.calendarConnection.update({
    where: { id: connectionId },
    data: {
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null,
      scope: null,
      status: "disconnected",
      lastError: null,
      readBusy: false,
      writeEvents: false,
    },
  });
}

/** Encrypt-and-store helper, so the OAuth callback never touches the box. */
export async function storeTokens(connectionId: string, tokens: GoogleTokens): Promise<void> {
  await prisma.calendarConnection.update({
    where: { id: connectionId },
    data: {
      encryptedAccessToken: box.encrypt(tokens.accessToken),
      // Google only returns a refresh token on the first consent. Keep the one
      // we already hold when a re-consent omits it.
      ...(tokens.refreshToken ? { encryptedRefreshToken: box.encrypt(tokens.refreshToken) } : {}),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expiresInSec * 1000),
      scope: tokens.scope ?? null,
      status: "connected",
      lastError: null,
      connectedAt: new Date(),
    },
  });
}
