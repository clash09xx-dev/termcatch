import "server-only";

import { getAppUrl } from "@/lib/app-url";

/**
 * Google Calendar OAuth configuration.
 *
 * WHY SEPARATE CREDENTIALS FROM GOOGLE LOGIN
 * Sign-in with Google goes through Supabase Auth (actions/auth: signInWithOAuth
 * with provider "google"), so the OAuth client belongs to Supabase and the
 * token we receive is a Supabase session — it carries no Google API scopes and
 * no refresh token we control. Calendar access therefore needs its own OAuth
 * client, its own redirect URI and its own consent step. That is also the
 * behaviour the product wants: nobody should be handed a calendar-access
 * prompt while they are only trying to log in.
 */

/** Least privilege, and deliberately two scopes rather than one broad one. */
export const GOOGLE_CALENDAR_SCOPES = [
  // Read-only list of the user's calendars + FreeBusy. This alone is enough for
  // the safety-critical half of the feature (never double-book).
  "https://www.googleapis.com/auth/calendar.readonly",
  // Create/update/delete ONLY events this app created. Google enforces that
  // restriction server-side, so even a bug here cannot touch a user's own
  // events. Preferred over the full calendar.events scope for exactly that.
  "https://www.googleapis.com/auth/calendar.events.owned",
] as const;

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** Path Google redirects back to. Must match the Cloud Console entry exactly. */
export const GOOGLE_CALENDAR_CALLBACK_PATH = "/api/integrations/google-calendar/callback";

/**
 * The public origin, from the ONE canonical helper.
 *
 * This used to read NEXT_PUBLIC_APP_URL itself and fall back to
 * "http://localhost:3000" — a second, weaker copy of lib/app-url. Two helpers
 * meant two different answers for "where does this app live", and the weaker
 * one defaulted to a developer's machine, so an unset variable in production
 * produced a redirect_uri pointing at localhost instead of failing loudly.
 * getAppUrl() validates the value and falls back to the real production origin.
 */
export function appUrl(): string {
  return getAppUrl();
}

export function googleCalendarRedirectUri(): string {
  return `${appUrl()}${GOOGLE_CALENDAR_CALLBACK_PATH}`;
}

export type GoogleCalendarCreds = { clientId: string; clientSecret: string };

/**
 * Credentials, or null when the integration is not configured.
 *
 * Returning null rather than throwing is deliberate: an unconfigured
 * deployment must still run. Every caller treats null as "feature off", the
 * settings page says so plainly, and availability silently falls back to
 * TermCatch-only busy periods.
 */
export function googleCalendarCreds(): GoogleCalendarCreds | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function googleCalendarConfigured(): boolean {
  return googleCalendarCreds() !== null;
}

/**
 * WHICH pieces of configuration are missing. Names only, never values.
 *
 * Exists so the cause is knowable from the server log without needing an admin
 * session in the browser: the settings page shows a plain "temporarily
 * unavailable" to salon owners (correctly — internal variable names are not
 * their problem), and the detailed list is admin-gated, so a misconfigured
 * deployment could otherwise be invisible to whoever is debugging it.
 */
export function googleCalendarConfigDiagnosis(): {
  ok: boolean;
  missing: string[];
  redirectUri: string;
  originIsHttps: boolean;
} {
  const missing: string[] = [];
  if (!process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim()) missing.push("GOOGLE_CALENDAR_CLIENT_ID");
  if (!process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()) missing.push("GOOGLE_CALENDAR_CLIENT_SECRET");
  const redirectUri = googleCalendarRedirectUri();
  return {
    ok: missing.length === 0,
    missing,
    redirectUri,
    originIsHttps: redirectUri.startsWith("https://"),
  };
}

/**
 * Private extended properties stamped on every event we create.
 *
 * This is the loop breaker. Booksy (or anything else) may also write into the
 * same Google calendar, and TermCatch writes its own appointments there too. On
 * the way back in, a busy period carrying our own source marker is skipped:
 * the appointment it mirrors is already counted from our database, so counting
 * it twice would consume two units of capacity for one booking.
 *
 * "Private" here is Google's term: these properties are visible only to the app
 * that set them, so nothing leaks into the user's calendar UI.
 */
export const TC_SOURCE_KEY = "termcatchSource";
export const TC_SOURCE_VALUE = "termcatch";
export const TC_APPOINTMENT_KEY = "termcatchAppointmentId";
