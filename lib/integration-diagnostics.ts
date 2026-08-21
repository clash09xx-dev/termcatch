import "server-only";

import { googleCalendarConfigDiagnosis } from "@/lib/calendar/google-config";

/**
 * Server-side "why is this integration off" logging.
 *
 * WHY IT LIVES OUTSIDE lib/calendar
 * Every module under lib/calendar handles OAuth tokens and calendar event data,
 * so that directory carries a hard rule — enforced by a test — that none of it
 * may log at all. It is a good rule: the cheapest way to leak a token is a
 * debug line that outlives the debugging. So the calendar modules expose a pure
 * diagnosis, and the decision to write it to a log lives here instead.
 *
 * WHAT MAY BE LOGGED
 * Variable NAMES and the derived redirect URI. Never a value, never a token,
 * never a secret, not even truncated.
 */

let googleCalendarLogged = false;

/**
 * Record which Google Calendar variables are missing, once per process.
 *
 * The settings page shows salon owners a plain "temporarily unavailable" (their
 * deployment's variable names are not their problem) and the detailed list is
 * admin-gated. Without this, a misconfigured deployment would be invisible to
 * whoever is actually able to fix it unless they happened to hold an admin
 * session in a browser.
 */
export function logGoogleCalendarConfigOnce(): void {
  if (googleCalendarLogged) return;
  googleCalendarLogged = true;
  const d = googleCalendarConfigDiagnosis();
  if (d.ok) return;
  console.warn(
    "[google-calendar] integration disabled — missing configuration:",
    d.missing.join(", "),
    "| expected redirect_uri:",
    d.redirectUri
  );
}
