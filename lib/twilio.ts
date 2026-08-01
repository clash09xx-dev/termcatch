// ─── Twilio client (server-only) ─────────────────────────────────────────────
// Single shared module for outbound Twilio SMS. Authenticated with an **API Key**
// (TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET) scoped to the account — the
// legacy Auth Token is NOT used for sending. (The Auth Token is still required
// elsewhere, only to validate inbound Twilio webhook signatures — see lib/sms.ts
// verifyTwilioSignature — because Twilio always signs webhooks with the Auth
// Token and API keys cannot do that.)
//
// `import "server-only"` guarantees this module (and the SDK + secrets it reads)
// can never be pulled into a client bundle. WhatsApp is intentionally NOT handled
// here — see lib/messaging.ts for the separate, feature-gated WhatsApp path.
import "server-only";
import twilio from "twilio";
import { normalizePhone } from "@/lib/phone";
import {
  resolveSender,
  senderParams,
  smsProviderConfigured,
  missingSmsEnv,
} from "@/lib/sms-config";

/**
 * Names of the required Twilio env vars that are missing or still placeholders,
 * including the sender requirement (a Messaging Service SID OR a from-number).
 * Delegates to the single config helper so this never drifts from lib/sms.ts.
 */
export function missingTwilioEnv(): string[] {
  return missingSmsEnv();
}

/** True when Twilio is fully configured to send (credentials + a usable sender). */
export function twilioSmsConfigured(): boolean {
  return smsProviderConfigured();
}

let cachedClient: ReturnType<typeof twilio> | null = null;

/**
 * Lazily build the production Twilio client from the API Key.
 * Throws with the list of missing vars if configuration is incomplete — never
 * includes any secret value in the message.
 */
export function getTwilioClient(): ReturnType<typeof twilio> {
  const missing = missingTwilioEnv();
  if (missing.length > 0) {
    throw new Error(`Twilio nie jest skonfigurowane — brak zmiennych: ${missing.join(", ")}`);
  }
  if (!cachedClient) {
    cachedClient = twilio(
      process.env.TWILIO_API_KEY_SID!,
      process.env.TWILIO_API_KEY_SECRET!,
      { accountSid: process.env.TWILIO_ACCOUNT_SID! }
    );
  }
  return cachedClient;
}

export type SendSmsResult = {
  ok: boolean;
  /** Twilio message SID (SM…) on success — safe to surface and log. */
  sid?: string;
  /** Twilio message status, e.g. "queued", "sent". */
  status?: string;
  /** Twilio error code, e.g. 21211 — safe to surface and log. */
  code?: number;
  /** Whether a temporary failure is worth retrying. */
  retryable?: boolean;
  /** Short, non-sensitive reason on failure. Never contains secrets. */
  error?: string;
};

type TwilioLikeError = { code?: unknown; status?: unknown; message?: unknown };

/**
 * Send one SMS via the API-key client.
 * - Normalizes Polish numbers to E.164 and refuses invalid ones (no send).
 * - Sender is resolved centrally: the "termcatch" Messaging Service SID when set
 *   (so Poland sees `TermCatch`), otherwise the legacy from-number fallback.
 *   Exactly one of messagingServiceSid / from is ever sent — never both.
 * - On failure logs only the Twilio error code + HTTP status — never the API key
 *   secret, Auth Token, recipient number, or message body.
 */
export async function sendSms(to: string, body: string): Promise<SendSmsResult> {
  const normalized = normalizePhone(to);
  if (!normalized) return { ok: false, error: "invalid_phone" };
  if (!body || !body.trim()) return { ok: false, error: "empty_body" };

  // Configuration errors are distinct from Twilio API rejections: no sender or no
  // credentials → "unconfigured" (never reaches the network).
  const sender = resolveSender();
  if (!sender) return { ok: false, error: "unconfigured" };

  let client: ReturnType<typeof twilio>;
  try {
    client = getTwilioClient();
  } catch {
    return { ok: false, error: "unconfigured" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const statusCallback = appUrl?.startsWith("https://") ? `${appUrl}/api/sms/status` : undefined;

  try {
    const message = await client.messages.create({
      to: normalized,
      body,
      // Exactly one sender field (messagingServiceSid XOR from) — never both.
      ...senderParams(sender),
      ...(statusCallback ? { statusCallback } : {}),
    });
    return { ok: true, sid: message.sid, status: message.status };
  } catch (err) {
    const e = (err ?? {}) as TwilioLikeError;
    const code = typeof e.code === "number" ? e.code : undefined;
    const httpStatus = typeof e.status === "number" ? e.status : undefined;
    // Log ONLY the Twilio error code + HTTP status. No number, no body, no secrets.
    console.error(`[twilio] messages.create failed code=${code ?? "unknown"} httpStatus=${httpStatus ?? "unknown"}`);
    return {
      ok: false,
      code,
      retryable: httpStatus === 429 || (httpStatus !== undefined && httpStatus >= 500),
      error: `twilio_${code ?? "error"}`,
    };
  }
}
