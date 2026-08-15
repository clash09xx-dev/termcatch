import { NextRequest, NextResponse } from "next/server";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_CALENDAR_SCOPES,
  googleCalendarCreds,
  googleCalendarRedirectUri,
} from "@/lib/calendar/google-config";
import { encodeState, safeReturnTo } from "@/lib/calendar/oauth-state";
import { canConnectFor, resolveCalendarActor } from "@/lib/calendar/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    // to a Google error page.
    return NextResponse.redirect(new URL(`${returnTo}?calendar=not_configured`, req.url));
  }

  const employeeIdRaw = req.nextUrl.searchParams.get("employeeId");
  const employeeId = employeeIdRaw && employeeIdRaw.trim() ? employeeIdRaw.trim() : null;

  const actor = await resolveCalendarActor();
  if (!actor) return NextResponse.redirect(new URL("/login", req.url));
  if (!canConnectFor(actor, employeeId)) {
    return NextResponse.redirect(new URL(`${returnTo}?calendar=forbidden`, req.url));
  }

  // The employee must belong to this salon. Without this a valid owner could
  // pass another salon's employee id and bind a connection across tenants.
  if (employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, businessId: actor.businessId },
      select: { id: true },
    });
    if (!emp) return NextResponse.redirect(new URL(`${returnTo}?calendar=forbidden`, req.url));
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
