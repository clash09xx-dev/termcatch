import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeState } from "@/lib/calendar/oauth-state";
import { exchangeCodeForTokens, storeTokens } from "@/lib/calendar/google-client";
import { getServerUser } from "@/lib/supabase/server";
import { appUrl } from "@/lib/calendar/google-config";

export const dynamic = "force-dynamic";

/** See the note in ../start/route.ts: `req.url` is Railway's internal address. */
function appRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, appUrl()));
}

/**
 * Google redirects back here after consent.
 *
 * Four checks before anything is written, in order of cheapness:
 *   1. the state must verify (signed, unexpired) — blocks CSRF and a forged
 *      callback that would bind an attacker's calendar to someone's salon
 *   2. the session user must be the one who STARTED the flow — blocks the case
 *      where the victim finishes a link the attacker began
 *   3. the business must still exist
 *   4. the code must exchange
 *
 * Nothing about the failure is echoed into the URL beyond a short code: an
 * error string from Google can contain account details.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = decodeState(params.get("state"));

  // Without valid state we do not even know where to return to safely.
  const fallback = "/business/settings/calendar";
  if (!state) return appRedirect(`${fallback}?calendar=invalid_state`);

  const back = (code: string) => appRedirect(`${state.returnTo}?calendar=${code}`);

  // The user declined, or Google refused.
  if (params.get("error")) return back("denied");

  const authUser = await getServerUser();
  if (!authUser) return appRedirect("/login");
  if (authUser.id !== state.userId) return back("state_mismatch");

  const code = params.get("code");
  if (!code) return back("denied");

  const business = await prisma.business.findUnique({
    where: { id: state.businessId },
    select: { id: true },
  });
  if (!business) return back("forbidden");

  if (state.employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: state.employeeId, businessId: state.businessId },
      select: { id: true },
    });
    if (!emp) return back("forbidden");
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) return back("exchange_failed");

  // Which Google account this is — shown in the UI so two connections are
  // distinguishable. Best effort: a failure here must not lose the connection.
  let accountEmail: string | null = null;
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const j = (await res.json()) as { email?: string };
      accountEmail = j.email ?? null;
    }
  } catch {
    /* non-fatal */
  }

  // Reconnecting must reuse the existing row so the appointment ↔ event links
  // that hang off it survive. The partial unique indexes make "one per
  // employee, one salon-wide" the invariant; this find mirrors them.
  const existing = await prisma.calendarConnection.findFirst({
    where: {
      businessId: state.businessId,
      provider: "google",
      employeeId: state.employeeId ?? null,
    },
    select: { id: true },
  });

  const connection = existing
    ? await prisma.calendarConnection.update({
        where: { id: existing.id },
        data: { accountEmail, status: "connected", lastError: null },
        select: { id: true },
      })
    : await prisma.calendarConnection.create({
        data: {
          businessId: state.businessId,
          employeeId: state.employeeId ?? null,
          provider: "google",
          accountEmail,
          // Reading busy is the safety half and is on immediately. Writing our
          // events into someone's calendar is opt-in, so it stays off until
          // they ask for it.
          readBusy: true,
          writeEvents: false,
        },
        select: { id: true },
      });

  await storeTokens(connection.id, tokens);

  // No calendar chosen yet — the settings page asks which one next.
  return back("connected");
}
