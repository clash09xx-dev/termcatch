// ─── SMS / Twilio configuration (single source of truth) ─────────────────────
// Pure, SDK-free, secret-free resolution of *how* an SMS should be sent. Safe to
// import from any server module AND from the unit tests: it never loads the
// Twilio SDK and never returns a secret (API key secret / Auth Token). The actual
// sending client lives in lib/twilio.ts (server-only + SDK); the transactional
// audit/dedupe layer lives in lib/sms.ts. Every "is SMS configured / which
// sender" decision routes through THIS module so the two never drift.

/** Required credentials for the API-key Twilio client (NOT the sender). */
const REQUIRED_CRED_ENV = ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET"] as const;

/** A value is "present" only if set to a real, non-placeholder string. */
function present(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0 && !value.includes("...");
}

/** Canonical launch kill-switch. `SMS_ENABLED=true` is the ONE flag — there is
 * intentionally no second `TWILIO_ENABLED`. When off, nothing is ever sent. */
export function smsFlagEnabled(): boolean {
  return process.env.SMS_ENABLED === "true";
}

/**
 * How Twilio will address the message. Exactly one of these is chosen — the two
 * are mutually exclusive in a single Twilio request.
 *
 * - `messaging_service` (PREFERRED): send with the "termcatch" Messaging Service
 *   SID. Twilio then presents the `TermCatch` Alphanumeric Sender ID to Polish
 *   networks that support it, and falls back — on Twilio's side — to the US
 *   number in the same Sender Pool for destinations that don't allow alpha
 *   senders. This is what makes PL recipients see `TermCatch` instead of `Info`.
 * - `from_number` (LEGACY FALLBACK): only when no Messaging Service SID is set.
 *   Sending a bare foreign (US) number to Poland typically gets relabelled by
 *   carriers to a generic sender such as `Info`.
 */
export type SenderSelection =
  | { kind: "messaging_service"; messagingServiceSid: string }
  | { kind: "from_number"; from: string };

/** The Messaging Service SID if configured (non-secret MG… identifier). */
export function messagingServiceSid(): string | undefined {
  const v = process.env.TWILIO_MESSAGING_SERVICE_SID;
  return present(v) ? v!.trim() : undefined;
}

/**
 * Resolve the sender. Messaging Service SID always wins; the bare from-number is
 * a backward-compatible fallback. The WhatsApp sender (TWILIO_WHATSAPP_FROM) is
 * NEVER considered here — WhatsApp has its own separate, disabled path. Returns
 * null when neither an SMS-capable sender is configured.
 */
export function resolveSender(): SenderSelection | null {
  const mss = messagingServiceSid();
  if (mss) return { kind: "messaging_service", messagingServiceSid: mss };
  const from = process.env.TWILIO_FROM_NUMBER;
  if (present(from)) return { kind: "from_number", from: from!.trim() };
  return null;
}

/**
 * The sender field(s) for a Twilio `messages.create` call. EXACTLY ONE of
 * `{ messagingServiceSid }` or `{ from }` is returned — never both (which Twilio
 * rejects), never neither (caller passes a resolved, non-null sender). Pure, so
 * the "prefer Messaging Service / never send both" rule is unit-testable without
 * the SDK or a network call.
 */
export function senderParams(
  sender: SenderSelection
): { messagingServiceSid: string } | { from: string } {
  return sender.kind === "messaging_service"
    ? { messagingServiceSid: sender.messagingServiceSid }
    : { from: sender.from };
}

/** API-key credentials are all present (independent of the sender). */
export function smsCredentialsConfigured(): boolean {
  return REQUIRED_CRED_ENV.every((key) => present(process.env[key]));
}

/** Provider is fully configured to send: credentials AND a usable sender. */
export function smsProviderConfigured(): boolean {
  return smsCredentialsConfigured() && resolveSender() !== null;
}

/** SMS is genuinely available: launch flag on AND provider configured. */
export function smsReady(): boolean {
  return smsFlagEnabled() && smsProviderConfigured();
}

/** Non-secret list of what's missing, for admin diagnostics. Never any value. */
export function missingSmsEnv(): string[] {
  const missing: string[] = REQUIRED_CRED_ENV.filter((key) => !present(process.env[key]));
  if (!resolveSender()) missing.push("TWILIO_MESSAGING_SERVICE_SID (lub TWILIO_FROM_NUMBER)");
  return missing;
}
