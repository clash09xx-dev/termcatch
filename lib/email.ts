import { Resend } from "resend";

/**
 * Transactional e-mail via Resend.
 *
 * Rules:
 * - All automated e-mails are sent from EMAIL_FROM (no-reply@termcatch.com).
 * - Every e-mail carries Reply-To: EMAIL_REPLY_TO (hello@termcatch.com),
 *   so replies land in the real support inbox — Resend is never an inbox.
 * - If RESEND_API_KEY is missing, sending is skipped gracefully with a
 *   warning log; the app never crashes because of e-mail.
 *
 * Env:
 *   RESEND_API_KEY
 *   EMAIL_FROM=TermCatch <no-reply@termcatch.com>
 *   EMAIL_REPLY_TO=hello@termcatch.com
 */

const FROM = process.env.EMAIL_FROM ?? "TermCatch <no-reply@termcatch.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@termcatch.com";
const SUPPORT_INBOX = process.env.EMAIL_REPLY_TO ?? "hello@termcatch.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";

let warnedMissingKey = false;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      console.warn(
        "[email] RESEND_API_KEY is not set — transactional e-mails are disabled (skipping gracefully)."
      );
      warnedMissingKey = true;
    }
    return null;
  }
  return new Resend(key);
}

// ─── Types ────────────────────────────────────────────────────

export type SendEmailParams = {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  /** Override the default Reply-To (e.g. support notifications reply to the user). */
  replyTo?: string;
};

export type SupportRequest = {
  firstName: string;
  lastName: string;
  email: string;
  topic: string;
  message: string;
};

// ─── Template ─────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(params: Pick<SendEmailParams, "heading" | "lines" | "ctaLabel" | "ctaUrl">): string {
  const { heading, lines, ctaLabel, ctaUrl } = params;
  return `<!DOCTYPE html>
<html lang="pl">
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;border:1px solid #f3f4f6;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <a href="${APP_URL}" style="text-decoration:none;">
            <span style="font-size:18px;letter-spacing:-0.5px;"><span style="font-weight:400;color:#9ca3af;">term</span><span style="font-weight:800;color:#111827;">catch</span></span>
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
          <p style="margin:0;font-size:12px;color:#9ca3af;">Ta wiadomość została wysłana automatycznie przez Termcatch. Odpowiedzi trafiają do naszego zespołu wsparcia.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Core sender ──────────────────────────────────────────────

/** Low-level sender. All other helpers go through this. Never throws. */
export async function sendEmail(params: SendEmailParams): Promise<{ sent: boolean }> {
  const client = getClient();
  if (!client) {
    console.log(`[email:skipped] to=${params.to} subject="${params.subject}"`);
    return { sent: false };
  }
  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: params.to,
      replyTo: params.replyTo ?? REPLY_TO,
      subject: params.subject,
      html: renderHtml(params),
    });
    if (error) {
      console.error("[email:error]", error);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    // E-mail failures must never break application flows
    console.error("[email:error]", err);
    return { sent: false };
  }
}

// ─── Support / contact form ───────────────────────────────────

/** Auto-reply to the user who submitted the contact/support form. */
export async function sendSupportAutoReply(to: string): Promise<{ sent: boolean }> {
  return sendEmail({
    to,
    subject: "We received your message",
    heading: "We received your message",
    lines: [
      "Hi,",
      "Thanks for contacting TermCatch. We received your message and will get back to you as soon as possible.",
      "Best,<br/>TermCatch Team",
    ],
  });
}

/** Forward the support request details to the team inbox (hello@termcatch.com). */
export async function sendSupportNotification(req: SupportRequest): Promise<{ sent: boolean }> {
  return sendEmail({
    to: SUPPORT_INBOX,
    // Replying to this e-mail answers the user directly
    replyTo: req.email,
    subject: `[Kontakt] ${req.topic} — ${req.firstName} ${req.lastName}`,
    heading: "Nowa wiadomość z formularza kontaktowego",
    lines: [
      `<strong>Od:</strong> ${escapeHtml(req.firstName)} ${escapeHtml(req.lastName)} &lt;${escapeHtml(req.email)}&gt;`,
      `<strong>Temat:</strong> ${escapeHtml(req.topic)}`,
      `<strong>Wiadomość:</strong>`,
      escapeHtml(req.message).replace(/\n/g, "<br/>"),
    ],
  });
}

// ─── Auth ─────────────────────────────────────────────────────

/**
 * Password reset e-mail.
 * Note: by default Supabase Auth sends reset e-mails itself. Use this helper
 * only if you switch to a custom reset flow (e.g. admin.generateLink).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<{ sent: boolean }> {
  return sendEmail({
    to,
    subject: "Zresetuj hasło — Termcatch",
    heading: "Reset hasła",
    lines: [
      "Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta Termcatch.",
      "Kliknij poniższy przycisk, aby ustawić nowe hasło. Link wygasa po 60 minutach.",
      "Jeśli to nie Ty — zignoruj tę wiadomość.",
    ],
    ctaLabel: "Ustaw nowe hasło",
    ctaUrl: resetUrl,
  });
}

/**
 * E-mail verification.
 * Note: by default Supabase Auth sends verification e-mails itself.
 */
export async function sendEmailVerificationEmail(
  to: string,
  verifyUrl: string
): Promise<{ sent: boolean }> {
  return sendEmail({
    to,
    subject: "Potwierdź swój adres e-mail — Termcatch",
    heading: "Potwierdź adres e-mail",
    lines: [
      "Dziękujemy za rejestrację w Termcatch.",
      "Kliknij poniższy przycisk, aby potwierdzić swój adres e-mail i aktywować konto.",
    ],
    ctaLabel: "Potwierdź e-mail",
    ctaUrl: verifyUrl,
  });
}

// ─── Bookings ─────────────────────────────────────────────────

type BookingEmailBase = {
  to: string;
  businessName: string;
  serviceName: string;
  /** Human-readable slot, e.g. "piątek, 10 lipca o 14:30" */
  slotLabel: string;
};

/** Booking request sent (waiting for salon confirmation). */
export async function sendBookingRequestEmail(
  params: BookingEmailBase & { priceLabel: string }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: `Rezerwacja wysłana — ${params.businessName}`,
    heading: "Twoja rezerwacja została wysłana",
    lines: [
      `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
      `Termin: <strong>${params.slotLabel}</strong>`,
      `Cena: <strong>${params.priceLabel}</strong>`,
      "Salon potwierdzi wizytę — poinformujemy Cię o zmianie statusu.",
    ],
    ctaLabel: "Moje rezerwacje",
    ctaUrl: `${APP_URL}/customer/dashboard`,
  });
}

/** Booking confirmed by the salon. */
export async function sendBookingConfirmationEmail(
  params: BookingEmailBase
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: `Wizyta potwierdzona — ${params.businessName}`,
    heading: "Twoja wizyta została potwierdzona",
    lines: [
      `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
      `Termin: <strong>${params.slotLabel}</strong>`,
      "Do zobaczenia!",
    ],
    ctaLabel: "Moje rezerwacje",
    ctaUrl: `${APP_URL}/customer/dashboard`,
  });
}

/** Booking cancelled (by salon or customer — pass the right recipient). */
export async function sendBookingCancellationEmail(
  params: BookingEmailBase & { cancelledBy: "business" | "customer" }
): Promise<{ sent: boolean }> {
  const bySalon = params.cancelledBy === "business";
  return sendEmail({
    to: params.to,
    subject: `Wizyta odwołana — ${params.businessName}`,
    heading: bySalon ? "Twoja wizyta została odwołana" : "Rezerwacja anulowana",
    lines: [
      `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
      `Termin: <strong>${params.slotLabel}</strong>`,
      bySalon
        ? "Salon odwołał tę wizytę. Możesz zarezerwować inny termin."
        : "Klient anulował tę wizytę — termin jest znów dostępny.",
    ],
    ctaLabel: bySalon ? "Zarezerwuj ponownie" : "Otwórz kalendarz",
    ctaUrl: bySalon ? `${APP_URL}/customer/dashboard` : `${APP_URL}/business/calendar`,
  });
}

/** Booking rescheduled by the customer — notify the salon. */
export async function sendBookingRescheduleEmail(
  params: BookingEmailBase & { customerName: string; oldSlotLabel: string }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: `Wizyta przełożona — ${params.serviceName}`,
    heading: "Klient przełożył wizytę",
    lines: [
      `Klient: <strong>${params.customerName}</strong>`,
      `Usługa: <strong>${params.serviceName}</strong>`,
      `Poprzedni termin: ${params.oldSlotLabel}`,
      `Nowy termin: <strong>${params.slotLabel}</strong>`,
      "Potwierdź nowy termin w kalendarzu.",
    ],
    ctaLabel: "Otwórz kalendarz",
    ctaUrl: `${APP_URL}/business/calendar`,
  });
}

/** Reminder for the customer — day before the visit. */
export async function sendBookingReminderEmail(
  params: BookingEmailBase & { address: string }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: `Przypomnienie: jutro wizyta — ${params.businessName}`,
    heading: "Przypomnienie o wizycie",
    lines: [
      `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
      `Termin: <strong>${params.slotLabel}</strong>`,
      `Adres: ${params.address}`,
      "Jeśli nie możesz przyjść — przełóż lub anuluj wizytę w panelu, żeby ktoś inny mógł skorzystać z terminu.",
    ],
    ctaLabel: "Moje rezerwacje",
    ctaUrl: `${APP_URL}/customer/dashboard`,
  });
}

/** New booking — notify the salon. */
export async function sendNewBookingNotificationEmail(
  params: BookingEmailBase & { customerName: string }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: `Nowa rezerwacja — ${params.serviceName}`,
    heading: "Masz nową rezerwację",
    lines: [
      `Klient: <strong>${params.customerName}</strong>`,
      `Usługa: <strong>${params.serviceName}</strong>`,
      `Termin: <strong>${params.slotLabel}</strong>`,
    ],
    ctaLabel: "Otwórz kalendarz",
    ctaUrl: `${APP_URL}/business/calendar`,
  });
}
