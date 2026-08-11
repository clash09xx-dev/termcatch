import { NextRequest, NextResponse } from "next/server";
import { runDueAutomations } from "@/lib/marketing-automations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Marketing automations runner — evaluates every ENABLED rule and sends what's
 * due (birthday / after-visit / win-back). Idempotent (MarketingDelivery
 * dedupe), so run it hourly or daily:
 *   GET /api/cron/marketing-automations?key=CRON_SECRET
 * or with an Authorization: Bearer CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const key = request.nextUrl.searchParams.get("key");
  const authorized = Boolean(secret) && (auth === `Bearer ${secret}` || key === secret);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueAutomations();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
