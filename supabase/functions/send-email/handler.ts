// ─── Send Email Hook handler (testable, runtime-agnostic) ───────────────────
// Orchestrates: verify Standard Webhooks signature → parse the Supabase Send
// Email Hook payload → render the message → send via Resend. All dependencies
// (secrets, sender identity, fetch) are injected so this is unit-tested from
// Node while the Deno entry (index.ts) wires in the real environment.

import { verifyStandardWebhook } from "./webhook.ts";
import { renderVerificationEmail, renderRecoveryEmail } from "./render.ts";

export type HandlerDeps = {
  hookSecret: string;
  resendApiKey: string;
  /** e.g. "TermCatch <hello@termcatch.com>" */
  from: string;
  /** e.g. "hello@termcatch.com" */
  replyTo: string;
  fetch: typeof fetch;
  /** Overridable for deterministic tests (unix seconds). */
  nowSeconds?: number;
};

type HookPayload = {
  user?: { email?: string };
  email_data?: {
    token?: string;
    token_hash?: string;
    email_action_type?: string;
    redirect_to?: string;
    site_url?: string;
  };
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Build a same-domain recovery link the app's /auth/confirm route understands. */
function recoveryConfirmUrl(email_data: NonNullable<HookPayload["email_data"]>): string | null {
  const hash = email_data.token_hash;
  const redirect = email_data.redirect_to || email_data.site_url || "";
  if (!hash || !redirect) return null;
  let origin: string;
  try {
    origin = new URL(redirect).origin;
  } catch {
    return null;
  }
  const qs = new URLSearchParams({ token_hash: hash, type: "recovery", next: "/auth/update-password" });
  return `${origin}/auth/confirm?${qs.toString()}`;
}

export async function handleSendEmail(req: Request, deps: HandlerDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const payload = await req.text();

  // 1) Authenticity — Standard Webhooks signature over the raw body.
  const verified = await verifyStandardWebhook(
    deps.hookSecret,
    payload,
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    deps.nowSeconds
  );
  if (!verified) return json(401, { error: "invalid_signature" });

  // 2) Parse the Send Email Hook payload.
  let data: HookPayload;
  try {
    data = JSON.parse(payload) as HookPayload;
  } catch {
    return json(400, { error: "invalid_payload" });
  }
  const email = data.user?.email;
  const emailData = data.email_data;
  if (!email || !emailData) return json(400, { error: "missing_fields" });

  const actionType = emailData.email_action_type ?? "signup";

  // 3) Render. Recovery keeps a same-domain link; everything else (signup and
  //    the other code-based flows) is a code-only email with no links/buttons.
  let rendered;
  if (actionType === "recovery") {
    const url = recoveryConfirmUrl(emailData);
    if (!url) return json(400, { error: "missing_recovery_target" });
    rendered = renderRecoveryEmail(url);
  } else {
    const token = emailData.token;
    if (!token) return json(400, { error: "missing_token" });
    rendered = renderVerificationEmail(token);
  }

  // 4) Send via Resend. Only status is logged on failure — never the OTP, the
  //    secret, the API key, or the response body.
  let res: Response;
  try {
    res = await deps.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deps.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: deps.from,
        to: [email],
        reply_to: deps.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
    });
  } catch {
    console.error("[send-email] resend request failed (network)");
    return json(502, { error: "resend_unreachable" });
  }

  if (!res.ok) {
    console.error(`[send-email] resend rejected status=${res.status}`);
    return json(502, { error: "resend_failed" });
  }

  return json(200, { success: true });
}
