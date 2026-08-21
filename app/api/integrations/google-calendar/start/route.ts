import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_CALENDAR_SCOPES,
  googleCalendarCreds,
  googleCalendarRedirectUri,
  appUrl,
} from "@/lib/calendar/google-config";
import { encodeState, safeReturnTo } from "@/lib/calendar/oauth-state";
import { canConnectFor, resolveCalendarActor } from "@/lib/calendar/access";
import { prisma } from "@/lib/prisma";
import { logGoogleCalendarConfigOnce } from "@/lib/integration-diagnostics";

export const dynamic = "force-dynamic";

/**
 * Absolute redirect back into the app.
 *
 * NEVER `new URL(path, req.url)`. Behind Railway's proxy the Node server is
 * addressed on its internal port, so `req.url` is "http://localhost:8080/..."
 * and resolving a relative path against it produced
 * "localhost:8080/business/settings/calendar?calendar=not_configured" — a dead
 * link for every production user. The canonical origin comes from configuration
 * (lib/app-url), never from the request, which is also what keeps a spoofed
 * Host header out of an OAuth flow.
 */
function appRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, appUrl()));
}

/**
 * Begin "Connect Google Calendar".
 *
 * Separate from the Google LOGIN flow on purpose: signing in must never ask for
 * calendar access, and calendar access must be an explicit, revocable decision
 * taken from the settings page. Consent is requested only when someone presses
 * the button.
 *
 * Authorization happens HERE, before Google is involved: the caller must be the
 * salon owner, or the specialist whose own calendar is being connected.
 */
export async function GET(req: NextRequest) {
  const creds = googleCalendarCreds();
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));

  if (!creds) {
    // Not configured in this environment. Say so rather than bouncing the user
    // to a Google error page — and record WHICH variables are missing in the
    // server log, since the user-facing message deliberately does not name
    // them and the admin-only detail needs an admin session to be seen.
    logGoogleCalendarConfigOnce();
    return appRedirect(`${returnTo}?calendar=not_configured`);
  }

  const employeeIdRaw = req.nextUrl.searchParams.get("employeeId");
  const employeeId = employeeIdRaw && employeeIdRaw.trim() ? employeeIdRaw.trim() : null;

  const actor = await resolveCalendarActor();
  if (!actor) return appRedirect("/login");
  if (!canConnectFor(actor, employeeId)) {
    return appRedirect(`${returnTo}?calendar=forbidden`);
  }

  // The employee must belong to this salon. Without this a valid owner could
  // pass another salon's employee id and bind a connection across tenants.
  if (employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, businessId: actor.businessId },
      select: { id: true },
    });
    if (!emp) return appRedirect(`${returnTo}?calendar=forbidden`);
  }

  const state = encodeState({
    userId: actor.userId,
    businessId: actor.businessId,
    employeeId,
    returnTo,
  });

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", googleCalendarRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES.join(" "));
  // offline + consent: we need a refresh token, and Google only issues one on
  // an explicit consent. Without it the connection dies after an hour.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
