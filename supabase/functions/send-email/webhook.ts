// ─── Standard Webhooks signature verification (portable) ────────────────────
// Implements the Standard Webhooks scheme (https://www.standardwebhooks.com) that
// Supabase's Send Email Hook uses — the same algorithm as the `standardwebhooks`
// library, but with Web Crypto so it runs identically in Deno (the Edge Function)
// and Node (the unit tests). No secret is ever logged.

export type WebhookHeaders = {
  id?: string | null;
  timestamp?: string | null;
  signature?: string | null;
};

const FIVE_MINUTES = 5 * 60;

/**
 * The Supabase-provided hook secret can arrive as:
 *   "v1,whsec_<base64>"  |  "whsec_<base64>"  |  "<base64>"
 * The "vN," belongs to the signature encoding and "whsec_" is a display prefix;
 * the actual HMAC key is the trailing base64. Strip both to get the raw key.
 */
export function normalizeSecret(raw: string): string {
  let s = (raw ?? "").trim();
  s = s.replace(/^v\d+,/, "");
  s = s.replace(/^whsec_/, "");
  return s;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** Constant-time string comparison (avoids leaking via early exit). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** base64(HMAC-SHA256(key, message)) — the Standard Webhooks signature. */
export async function signContent(rawSecret: string, message: string): Promise<string> {
  const keyBytes = base64ToBytes(normalizeSecret(rawSecret));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToBase64(new Uint8Array(sig));
}

/** Build a valid `webhook-signature` header value (used by the Edge Function's
 *  own callers and by the tests). */
export async function buildSignatureHeader(secret: string, id: string, timestamp: string, payload: string): Promise<string> {
  const sig = await signContent(secret, `${id}.${timestamp}.${payload}`);
  return `v1,${sig}`;
}

/**
 * Verify a Standard Webhooks request. Returns true only when the HMAC over
 * `${id}.${timestamp}.${payload}` matches one of the provided signatures AND the
 * timestamp is within a 5-minute window (replay protection). Never throws.
 */
export async function verifyStandardWebhook(
  rawSecret: string,
  payload: string,
  headers: WebhookHeaders,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  const id = headers.id ?? "";
  const ts = headers.timestamp ?? "";
  const sigHeader = headers.signature ?? "";
  if (!rawSecret || !id || !ts || !sigHeader) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(nowSeconds - tsNum) > FIVE_MINUTES) return false;

  let expected: string;
  try {
    expected = await signContent(rawSecret, `${id}.${ts}.${payload}`);
  } catch {
    return false;
  }

  // The header is a space-separated list of "v1,<sig>" entries — accept if any match.
  for (const part of sigHeader.split(" ")) {
    const sig = part.includes(",") ? part.slice(part.indexOf(",") + 1) : part;
    if (sig && timingSafeEqual(sig, expected)) return true;
  }
  return false;
}
