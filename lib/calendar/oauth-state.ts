import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Signed OAuth `state` — CSRF protection for the calendar connect flow.
 *
 * Without this, an attacker can hand a victim a crafted callback URL and bind
 * the ATTACKER's Google account to the VICTIM's salon: the victim's calendar
 * connection would then read from, and write to, a calendar the attacker
 * controls. That is why the state carries who started the flow and is signed.
 *
 * Contents (all needed on the way back, none secret):
 *   n   nonce, so two flows are never identical
 *   u   the Supabase user id that started it
 *   b   the business id being connected
 *   e   the employee id, when connecting a specialist's own calendar
 *   r   where to return afterwards, path-only
 *   t   issued-at, for the short expiry
 *
 * The signature is HMAC-SHA256 over the payload with a server-only secret, so
 * the callback can verify the state came from us without any server-side
 * session store. Compared with timingSafeEqual to avoid leaking the signature
 * byte by byte.
 */

const MAX_AGE_MS = 15 * 60 * 1000; // a consent screen is not a long-running task

function secret(): string {
  const s =
    process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY ||
    process.env.INTEGRATION_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Missing secret for OAuth state signing.");
  return s;
}

export type CalendarOAuthState = {
  /** Supabase user id that initiated the flow. */
  userId: string;
  businessId: string;
  employeeId?: string | null;
  /** Path to return to. Path-only by construction; re-validated on the way back. */
  returnTo: string;
};

type Payload = CalendarOAuthState & { n: string; t: number };

function sign(json: string): string {
  return createHmac("sha256", secret()).update(json).digest("base64url");
}

export function encodeState(input: CalendarOAuthState): string {
  const payload: Payload = { ...input, n: randomBytes(9).toString("base64url"), t: Date.now() };
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, "utf8").toString("base64url");
  return `${body}.${sign(json)}`;
}

/** Returns null for anything tampered with, malformed or stale (fail closed). */
export function decodeState(raw: string | null | undefined): CalendarOAuthState | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  let json: string;
  try {
    json = Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(json);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(json) as Payload;
  } catch {
    return null;
  }

  if (typeof payload.t !== "number" || Date.now() - payload.t > MAX_AGE_MS) return null;
  if (!payload.userId || !payload.businessId) return null;

  return {
    userId: payload.userId,
    businessId: payload.businessId,
    employeeId: payload.employeeId ?? null,
    returnTo: safeReturnTo(payload.returnTo),
  };
}

/**
 * Open-redirect guard.
 *
 * Only same-origin paths survive. "//evil.com" is rejected because browsers
 * read it as protocol-relative and would leave the site — the classic bypass
 * for a naive `startsWith("/")` check.
 */
export function safeReturnTo(value: unknown): string {
  const fallback = "/business/settings/calendar";
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
