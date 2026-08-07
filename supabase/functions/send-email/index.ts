// ─── Supabase "Send Email" Auth Hook — Edge Function (Deno) ─────────────────
// Supabase calls this endpoint (instead of sending auth e-mail itself) for every
// auth e-mail. We render + send via Resend from hello@termcatch.com, code-only,
// so Gmail stops discarding the messages. Authenticity is enforced by the
// Standard Webhooks signature (SEND_EMAIL_HOOK_SECRET), which is why JWT
// verification is disabled for this function (see supabase/config.toml).
//
// All real logic lives in ./handler.ts (+ ./render.ts, ./webhook.ts) so it is
// unit-tested from Node; this entry only wires the Deno environment in.
import { handleSendEmail } from "./handler.ts";

Deno.serve((req: Request) =>
  handleSendEmail(req, {
    hookSecret: Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "",
    resendApiKey: Deno.env.get("RESEND_API_KEY") ?? "",
    from: Deno.env.get("AUTH_EMAIL_FROM") ?? "TermCatch <hello@termcatch.com>",
    replyTo: Deno.env.get("AUTH_EMAIL_REPLY_TO") ?? "hello@termcatch.com",
    fetch,
  })
);
