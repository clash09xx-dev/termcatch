import { NextRequest, NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/is-admin";
import { sendSms, twilioSmsConfigured, missingTwilioEnv } from "@/lib/twilio";
import { normalizePhone } from "@/lib/phone";

// Protected diagnostic: send exactly one "Test SMS z TermCatch" via the API-key
// Twilio client. Admin-only, rate-limited, and never echoes any secret. It checks
// Twilio *configuration* rather than the SMS_ENABLED launch kill-switch, so an
// admin can verify credentials before automated transactional SMS is turned on.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fixed-window, in-memory limiter. Per-instance only (resets on redeploy) — fine
// for a rarely-used admin diagnostic, and adds no external dependency.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  if (!(await isPlatformAdmin())) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`test-sms:${ip}`)) {
    return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });
  }

  if (!twilioSmsConfigured()) {
    // Names only — never any secret value.
    return NextResponse.json({ success: false, error: "unconfigured", missing: missingTwilioEnv() }, { status: 503 });
  }

  let phone: unknown;
  try {
    ({ phone } = (await request.json()) as { phone?: unknown });
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 });
  }

  const to = normalizePhone(String(phone ?? "").slice(0, 20));
  if (!to) {
    return NextResponse.json({ success: false, error: "invalid_phone" }, { status: 400 });
  }

  const result = await sendSms(to, "Test SMS z TermCatch");
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error, code: result.code }, { status: 502 });
  }
  return NextResponse.json({ success: true, status: result.status, messageSid: result.sid });
}
