import { Resend } from "resend";

/**
 * Transactional e-mail via Resend.
 * Gracefully no-ops when RESEND_API_KEY is not configured, so the app
 * works in development and the booking flow never breaks on e-mail errors.
 */

const FROM = process.env.EMAIL_FROM ?? "Termcatch <powiadomienia@termcatch.com>";

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

type SendEmailParams = {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
};

function renderHtml({ heading, lines, ctaLabel, ctaUrl }: SendEmailParams): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";
  return `<!DOCTYPE html>
<html lang="pl">
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;border:1px solid #f3f4f6;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <a href="${appUrl}" style="text-decoration:none;">
            <span style="font-size:18px;font-weight:800;color:#111827;letter-spacing:-0.5px;">termcatch</span>
          </a>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:0 32px;">
          ${lines
            .map(
              (l) =>
                `<p style="margin:10px 0;font-size:14px;line-height:1.6;color:#4b5563;">${l}</p>`
            )
            .join("")}
        </td></tr>
        ${
          ctaLabel && ctaUrl
            ? `<tr><td style="padding:20px 32px 8px;">
          <a href="${ctaUrl}" style="display:inline-block;background-color:#111827;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none;">${ctaLabel}</a>
        </td></tr>`
            : ""
        }
        <tr><td style="padding:28px 32px 28px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Ta wiadomość została wysłana automatycznie przez Termcatch.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const client = getClient();
  if (!client) {
    console.log(`[email:skipped] ${params.to} — ${params.subject}`);
    return;
  }
  try {
    await client.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: renderHtml(params),
    });
  } catch (err) {
    // E-mail failures must never break the booking flow
    console.error("[email:error]", err);
  }
}
