// ─── Auth e-mail rendering (pure, runtime-agnostic) ─────────────────────────
// No Deno/Node-specific APIs and no imports, so the exact same code that the
// Edge Function ships is unit-tested from Node. All dynamic content is escaped.

/** Escape untrusted values before embedding in HTML. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type RenderedEmail = { subject: string; html: string; text: string };

/**
 * The signup / e-mail verification code message.
 *
 * Deliverability rules baked in (this is the permanent Gmail fix):
 * - shows ONLY the 6-digit code — no confirmation button, no verification or
 *   redirect link, no URL of any kind (so there is no cross-domain link signal);
 * - sender identity (hello@…, Reply-To) is set by the caller, never no-reply@;
 * - a real plain-text alternative accompanies the HTML.
 */
export function renderVerificationEmail(token: string): RenderedEmail {
  const code = escapeHtml(token);
  const subject = "Twój kod weryfikacyjny TermCatch";

  const html = `<!DOCTYPE html>
<html lang="pl">
  <body style="margin:0;padding:0;background-color:#f1f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f6fb;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;border:1px solid #e5eaf1;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;">
            <span style="font-size:18px;letter-spacing:-0.5px;"><span style="font-weight:400;color:#9ca3af;">term</span><span style="font-weight:800;color:#111827;">catch</span></span>
          </td></tr>
          <tr><td style="padding:24px 32px 4px;">
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;">Twój kod weryfikacyjny</h1>
          </td></tr>
          <tr><td style="padding:0 32px;">
            <p style="margin:8px 0;font-size:14px;line-height:1.6;color:#4b5563;">Wpisz poniższy 6-cyfrowy kod w aplikacji TermCatch, aby dokończyć zakładanie konta.</p>
          </td></tr>
          <tr><td style="padding:20px 32px 8px;">
            <div style="background-color:#f1f6fb;border:1px solid #e5eaf1;border-radius:12px;padding:20px;text-align:center;">
              <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#0f172a;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${code}</div>
            </div>
          </td></tr>
          <tr><td style="padding:6px 32px 0;">
            <p style="margin:8px 0;font-size:13px;line-height:1.6;color:#6b7280;">Kod jest ważny przez 1 godzinę. Jeśli wygaśnie, poproś w aplikacji o nowy kod.</p>
          </td></tr>
          <tr><td style="padding:8px 32px 0;">
            <p style="margin:8px 0;font-size:13px;line-height:1.6;color:#6b7280;">Nie udostępniaj tego kodu nikomu — pracownicy TermCatch nigdy o niego nie proszą. Jeśli to nie Ty zakładasz konto, zignoruj tę wiadomość.</p>
          </td></tr>
          <tr><td style="padding:24px 32px 28px;">
            <hr style="border:none;border-top:1px solid #eef2f7;margin:0 0 16px;" />
            <p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#9ca3af;">Potrzebujesz pomocy? Napisz na hello@termcatch.com</p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">Ta wiadomość została wysłana automatycznie przez TermCatch.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `Twój kod weryfikacyjny TermCatch to: ${token}`,
    "",
    "Wpisz go w aplikacji, aby dokończyć zakładanie konta.",
    "Kod jest ważny przez 1 godzinę.",
    "",
    "Nie udostępniaj tego kodu nikomu — pracownicy TermCatch nigdy o niego nie proszą.",
    "Jeśli to nie Ty zakładasz konto, zignoruj tę wiadomość.",
    "",
    "Pomoc: hello@termcatch.com",
  ].join("\n");

  return { subject, html, text };
}

/**
 * Password-reset (recovery) message. Recovery genuinely needs a link, so this
 * one carries a single button — pointed at the SAME domain we send from
 * (termcatch.com/auth/confirm), which satisfies Resend's "link URLs match
 * sending domain" guidance. This is NOT the verification email.
 */
export function renderRecoveryEmail(confirmUrl: string): RenderedEmail {
  const url = escapeHtml(confirmUrl);
  const subject = "Reset hasła — TermCatch";
  const html = `<!DOCTYPE html>
<html lang="pl">
  <body style="margin:0;padding:0;background-color:#f1f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f6fb;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;border:1px solid #e5eaf1;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;">
            <span style="font-size:18px;letter-spacing:-0.5px;"><span style="font-weight:400;color:#9ca3af;">term</span><span style="font-weight:800;color:#111827;">catch</span></span>
          </td></tr>
          <tr><td style="padding:24px 32px 8px;">
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;">Reset hasła</h1>
            <p style="margin:10px 0;font-size:14px;line-height:1.6;color:#4b5563;">Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta TermCatch. Kliknij poniżej, aby ustawić nowe hasło. Link wygasa po 60 minutach. Jeśli to nie Ty — zignoruj tę wiadomość.</p>
          </td></tr>
          <tr><td style="padding:12px 32px 8px;">
            <a href="${url}" style="display:inline-block;background-color:#111827;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none;">Ustaw nowe hasło</a>
          </td></tr>
          <tr><td style="padding:24px 32px 28px;">
            <hr style="border:none;border-top:1px solid #eef2f7;margin:0 0 16px;" />
            <p style="margin:0;font-size:12px;color:#9ca3af;">Potrzebujesz pomocy? Napisz na hello@termcatch.com</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = [
    "Reset hasła — TermCatch",
    "",
    "Otrzymaliśmy prośbę o zresetowanie hasła. Otwórz poniższy link, aby ustawić nowe hasło (ważny 60 minut):",
    confirmUrl,
    "",
    "Jeśli to nie Ty — zignoruj tę wiadomość.",
    "Pomoc: hello@termcatch.com",
  ].join("\n");
  return { subject, html, text };
}
