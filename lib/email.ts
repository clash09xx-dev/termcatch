import { Resend } from "resend";
import { toLocale, type Locale } from "@/lib/i18n/config";

/** Pick a locale variant, falling back to Polish (the default/governing copy). */
function L<T>(locale: Locale, m: Record<Locale, T>): T {
  return m[locale] ?? m.pl;
}

/**
 * Transactional e-mail via Resend.
 *
 * Rules:
 * - All automated e-mails are sent from a REAL, monitored mailbox
 *   (hello@termcatch.com) — never no-reply@. A no-reply sender is a spam signal
 *   (Resend Insights flags it) and there is no deliverability reason to keep it.
 * - Every message is sent multipart (HTML + a real plain-text alternative),
 *   which improves inbox placement and accessibility.
 * - If RESEND_API_KEY is missing, sending is skipped gracefully with a
 *   warning log; the app never crashes because of e-mail.
 *
 * NOTE: deliverability also depends on domain reputation. termcatch.com is a new
 * domain, so cold-start spam filtering is expected until it warms up — code can
 * only remove aggravating signals (no-reply, HTML-only), not buy reputation.
 *
 * Env (set EMAIL_FROM to a hello@ sender in production — NOT no-reply@):
 *   RESEND_API_KEY
 *   EMAIL_FROM=TermCatch <hello@termcatch.com>
 *   EMAIL_REPLY_TO=hello@termcatch.com
 */

const FROM = process.env.EMAIL_FROM ?? "TermCatch <hello@termcatch.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@termcatch.com";
const SUPPORT_INBOX = process.env.EMAIL_REPLY_TO ?? "hello@termcatch.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";

let warnedMissingKey = false;

/** Czy wysyłka e-mail (Resend) jest realnie skonfigurowana. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

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
          <p style="margin:0;font-size:12px;color:#9ca3af;">Ta wiadomość została wysłana automatycznie przez TermCatch. Odpowiedzi trafiają do naszego zespołu wsparcia.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Plain-text alternative — every message ships multipart (better inbox
 * placement + accessibility). Strips any inline HTML from the lines. */
function renderText(params: Pick<SendEmailParams, "heading" | "lines" | "ctaLabel" | "ctaUrl">): string {
  const strip = (s: string) =>
    s.replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();
  const parts = [params.heading, "", ...params.lines.map(strip)];
  if (params.ctaLabel && params.ctaUrl) parts.push("", `${strip(params.ctaLabel)}: ${params.ctaUrl}`);
  parts.push("", "— TermCatch", "Pomoc: hello@termcatch.com");
  return parts.join("\n");
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
      text: renderText(params),
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
    subject: "Zresetuj hasło — TermCatch",
    heading: "Reset hasła",
    lines: [
      "Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta TermCatch.",
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
    subject: "Potwierdź swój adres e-mail — TermCatch",
    heading: "Potwierdź adres e-mail",
    lines: [
      "Dziękujemy za rejestrację w TermCatch.",
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
  /** Recipient's UI language; defaults to Polish when unknown. */
  locale?: Locale | string | null;
};

// Shared CTA labels + inline connectors for the localized booking emails.
const CTA_MY_BOOKINGS: Record<Locale, string> = { pl: "Moje rezerwacje", en: "My bookings", de: "Meine Buchungen", tr: "Randevularım" };

/** Booking request sent (waiting for salon confirmation). */
export async function sendBookingRequestEmail(
  params: BookingEmailBase & { priceLabel: string }
): Promise<{ sent: boolean }> {
  const loc = toLocale(params.locale);
  return sendEmail({
    to: params.to,
    subject: L(loc, {
      pl: `Rezerwacja wysłana — ${params.businessName}`,
      en: `Booking sent — ${params.businessName}`,
      de: `Buchung gesendet — ${params.businessName}`,
      tr: `Randevu gönderildi — ${params.businessName}`,
    }),
    heading: L(loc, {
      pl: "Twoja rezerwacja została wysłana",
      en: "Your booking has been sent",
      de: "Ihre Buchung wurde gesendet",
      tr: "Randevunuz gönderildi",
    }),
    lines: [
      L(loc, {
        pl: `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
        en: `<strong>${params.serviceName}</strong> at <strong>${params.businessName}</strong>`,
        de: `<strong>${params.serviceName}</strong> bei <strong>${params.businessName}</strong>`,
        tr: `<strong>${params.businessName}</strong> — <strong>${params.serviceName}</strong>`,
      }),
      L(loc, {
        pl: `Termin: <strong>${params.slotLabel}</strong>`,
        en: `Time: <strong>${params.slotLabel}</strong>`,
        de: `Termin: <strong>${params.slotLabel}</strong>`,
        tr: `Zaman: <strong>${params.slotLabel}</strong>`,
      }),
      L(loc, {
        pl: `Cena: <strong>${params.priceLabel}</strong>`,
        en: `Price: <strong>${params.priceLabel}</strong>`,
        de: `Preis: <strong>${params.priceLabel}</strong>`,
        tr: `Fiyat: <strong>${params.priceLabel}</strong>`,
      }),
      L(loc, {
        pl: "Salon potwierdzi wizytę — poinformujemy Cię o zmianie statusu.",
        en: "The salon will confirm your appointment — we'll let you know when the status changes.",
        de: "Der Salon bestätigt Ihren Termin — wir informieren Sie über Statusänderungen.",
        tr: "Salon randevunuzu onaylayacak — durum değiştiğinde size haber vereceğiz.",
      }),
    ],
    ctaLabel: L(loc, CTA_MY_BOOKINGS),
    ctaUrl: `${APP_URL}/customer/dashboard`,
  });
}

/** Booking confirmed by the salon. */
export async function sendBookingConfirmationEmail(
  params: BookingEmailBase
): Promise<{ sent: boolean }> {
  const loc = toLocale(params.locale);
  return sendEmail({
    to: params.to,
    subject: L(loc, {
      pl: `Wizyta potwierdzona — ${params.businessName}`,
      en: `Appointment confirmed — ${params.businessName}`,
      de: `Termin bestätigt — ${params.businessName}`,
      tr: `Randevu onaylandı — ${params.businessName}`,
    }),
    heading: L(loc, {
      pl: "Twoja wizyta została potwierdzona",
      en: "Your appointment is confirmed",
      de: "Ihr Termin ist bestätigt",
      tr: "Randevunuz onaylandı",
    }),
    lines: [
      L(loc, {
        pl: `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
        en: `<strong>${params.serviceName}</strong> at <strong>${params.businessName}</strong>`,
        de: `<strong>${params.serviceName}</strong> bei <strong>${params.businessName}</strong>`,
        tr: `<strong>${params.businessName}</strong> — <strong>${params.serviceName}</strong>`,
      }),
      L(loc, {
        pl: `Termin: <strong>${params.slotLabel}</strong>`,
        en: `Time: <strong>${params.slotLabel}</strong>`,
        de: `Termin: <strong>${params.slotLabel}</strong>`,
        tr: `Zaman: <strong>${params.slotLabel}</strong>`,
      }),
      L(loc, { pl: "Do zobaczenia!", en: "See you there!", de: "Bis bald!", tr: "Görüşmek üzere!" }),
    ],
    ctaLabel: L(loc, CTA_MY_BOOKINGS),
    ctaUrl: `${APP_URL}/customer/dashboard`,
  });
}

/** Booking cancelled (by salon or customer — pass the right recipient). */
export async function sendBookingCancellationEmail(
  params: BookingEmailBase & { cancelledBy: "business" | "customer"; reason?: string }
): Promise<{ sent: boolean }> {
  const bySalon = params.cancelledBy === "business";
  const reason = params.reason?.trim();
  const loc = toLocale(params.locale);
  return sendEmail({
    to: params.to,
    subject: L(loc, {
      pl: `Wizyta odwołana — ${params.businessName}`,
      en: `Appointment cancelled — ${params.businessName}`,
      de: `Termin storniert — ${params.businessName}`,
      tr: `Randevu iptal edildi — ${params.businessName}`,
    }),
    heading: bySalon
      ? L(loc, { pl: "Twoja wizyta została odwołana", en: "Your appointment was cancelled", de: "Ihr Termin wurde storniert", tr: "Randevunuz iptal edildi" })
      : L(loc, { pl: "Rezerwacja anulowana", en: "Booking cancelled", de: "Buchung storniert", tr: "Randevu iptal edildi" }),
    lines: [
      L(loc, {
        pl: `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
        en: `<strong>${params.serviceName}</strong> at <strong>${params.businessName}</strong>`,
        de: `<strong>${params.serviceName}</strong> bei <strong>${params.businessName}</strong>`,
        tr: `<strong>${params.businessName}</strong> — <strong>${params.serviceName}</strong>`,
      }),
      L(loc, {
        pl: `Termin: <strong>${params.slotLabel}</strong>`,
        en: `Time: <strong>${params.slotLabel}</strong>`,
        de: `Termin: <strong>${params.slotLabel}</strong>`,
        tr: `Zaman: <strong>${params.slotLabel}</strong>`,
      }),
      bySalon
        ? L(loc, {
            pl: "Salon odwołał tę wizytę. Możesz zarezerwować inny termin.",
            en: "The salon cancelled this appointment. You can book another time.",
            de: "Der Salon hat diesen Termin storniert. Sie können einen anderen Termin buchen.",
            tr: "Salon bu randevuyu iptal etti. Başka bir saat seçebilirsiniz.",
          })
        : L(loc, {
            pl: "Klient anulował tę wizytę — termin jest znów dostępny.",
            en: "The customer cancelled this appointment — the slot is available again.",
            de: "Der Kunde hat diesen Termin storniert — der Slot ist wieder verfügbar.",
            tr: "Müşteri bu randevuyu iptal etti — saat yeniden müsait.",
          }),
      ...(bySalon && reason
        ? [L(loc, {
            pl: `Powód odwołania: <strong>${escapeHtml(reason)}</strong>`,
            en: `Cancellation reason: <strong>${escapeHtml(reason)}</strong>`,
            de: `Stornierungsgrund: <strong>${escapeHtml(reason)}</strong>`,
            tr: `İptal nedeni: <strong>${escapeHtml(reason)}</strong>`,
          })]
        : []),
    ],
    ctaLabel: bySalon
      ? L(loc, { pl: "Zarezerwuj ponownie", en: "Book again", de: "Erneut buchen", tr: "Tekrar randevu al" })
      : L(loc, { pl: "Otwórz kalendarz", en: "Open calendar", de: "Kalender öffnen", tr: "Takvimi aç" }),
    ctaUrl: bySalon ? `${APP_URL}/customer/dashboard` : `${APP_URL}/business/calendar`,
  });
}

/** Salon changed the appointment time — notify the CUSTOMER (shows both times). */
export async function sendBookingTimeChangedEmail(
  params: BookingEmailBase & { oldSlotLabel: string }
): Promise<{ sent: boolean }> {
  const loc = toLocale(params.locale);
  return sendEmail({
    to: params.to,
    subject: L(loc, {
      pl: `Zmiana godziny wizyty — ${params.businessName}`,
      en: `Appointment time changed — ${params.businessName}`,
      de: `Terminzeit geändert — ${params.businessName}`,
      tr: `Randevu saati değişti — ${params.businessName}`,
    }),
    heading: L(loc, {
      pl: "Salon zmienił godzinę Twojej wizyty",
      en: "The salon changed your appointment time",
      de: "Der Salon hat Ihre Terminzeit geändert",
      tr: "Salon randevu saatinizi değiştirdi",
    }),
    lines: [
      L(loc, {
        pl: `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
        en: `<strong>${params.serviceName}</strong> at <strong>${params.businessName}</strong>`,
        de: `<strong>${params.serviceName}</strong> bei <strong>${params.businessName}</strong>`,
        tr: `<strong>${params.businessName}</strong> — <strong>${params.serviceName}</strong>`,
      }),
      L(loc, {
        pl: `Poprzedni termin: ${params.oldSlotLabel}`,
        en: `Previous time: ${params.oldSlotLabel}`,
        de: `Vorheriger Termin: ${params.oldSlotLabel}`,
        tr: `Önceki zaman: ${params.oldSlotLabel}`,
      }),
      L(loc, {
        pl: `Nowy termin: <strong>${params.slotLabel}</strong>`,
        en: `New time: <strong>${params.slotLabel}</strong>`,
        de: `Neuer Termin: <strong>${params.slotLabel}</strong>`,
        tr: `Yeni zaman: <strong>${params.slotLabel}</strong>`,
      }),
      L(loc, {
        pl: "Jeśli nowy termin Ci nie odpowiada, przełóż lub anuluj wizytę w panelu.",
        en: "If the new time doesn't suit you, reschedule or cancel in the app.",
        de: "Wenn der neue Termin nicht passt, verschieben oder stornieren Sie ihn in der App.",
        tr: "Yeni saat uygun değilse, uygulamadan erteleyin veya iptal edin.",
      }),
    ],
    ctaLabel: L(loc, CTA_MY_BOOKINGS),
    ctaUrl: `${APP_URL}/customer/dashboard`,
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
  const loc = toLocale(params.locale);
  return sendEmail({
    to: params.to,
    subject: L(loc, {
      pl: `Przypomnienie: jutro wizyta — ${params.businessName}`,
      en: `Reminder: appointment tomorrow — ${params.businessName}`,
      de: `Erinnerung: Termin morgen — ${params.businessName}`,
      tr: `Hatırlatma: yarın randevu — ${params.businessName}`,
    }),
    heading: L(loc, {
      pl: "Przypomnienie o wizycie",
      en: "Appointment reminder",
      de: "Terminerinnerung",
      tr: "Randevu hatırlatması",
    }),
    lines: [
      L(loc, {
        pl: `<strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>`,
        en: `<strong>${params.serviceName}</strong> at <strong>${params.businessName}</strong>`,
        de: `<strong>${params.serviceName}</strong> bei <strong>${params.businessName}</strong>`,
        tr: `<strong>${params.businessName}</strong> — <strong>${params.serviceName}</strong>`,
      }),
      L(loc, {
        pl: `Termin: <strong>${params.slotLabel}</strong>`,
        en: `Time: <strong>${params.slotLabel}</strong>`,
        de: `Termin: <strong>${params.slotLabel}</strong>`,
        tr: `Zaman: <strong>${params.slotLabel}</strong>`,
      }),
      L(loc, {
        pl: `Adres: ${params.address}`,
        en: `Address: ${params.address}`,
        de: `Adresse: ${params.address}`,
        tr: `Adres: ${params.address}`,
      }),
      L(loc, {
        pl: "Jeśli nie możesz przyjść — przełóż lub anuluj wizytę w panelu, żeby ktoś inny mógł skorzystać z terminu.",
        en: "If you can't make it, reschedule or cancel in the app so someone else can take the slot.",
        de: "Falls Sie nicht können, verschieben oder stornieren Sie den Termin in der App, damit jemand anderes ihn nutzen kann.",
        tr: "Gelemeyecekseniz, başkasının yararlanabilmesi için randevuyu uygulamadan erteleyin veya iptal edin.",
      }),
    ],
    ctaLabel: L(loc, CTA_MY_BOOKINGS),
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

/** Subscription payment failed / past-due — alert the salon owner (dunning). */
export async function sendBillingPaymentFailedEmail(
  params: { to: string; businessName: string }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: "Problem z płatnością subskrypcji — TermCatch",
    heading: "Nie udało się pobrać płatności",
    lines: [
      `Nie udało się pobrać opłaty za subskrypcję dla <strong>${escapeHtml(params.businessName)}</strong>.`,
      "Zaktualizuj metodę płatności w panelu, aby zachować dostęp — Twoje dane są bezpieczne.",
    ],
    ctaLabel: "Zarządzaj subskrypcją",
    ctaUrl: `${APP_URL}/business/payments`,
  });
}

/** Subscription cancelled — confirm to the salon owner (no silent loss of plan). */
export async function sendSubscriptionCancelledEmail(
  params: { to: string; businessName: string }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: "Subskrypcja anulowana — TermCatch",
    heading: "Subskrypcja została anulowana",
    lines: [
      `Subskrypcja dla <strong>${escapeHtml(params.businessName)}</strong> została anulowana.`,
      "Twoje dane są bezpieczne. Możesz w każdej chwili wznowić subskrypcję w panelu.",
    ],
    ctaLabel: "Wznów subskrypcję",
    ctaUrl: `${APP_URL}/business/payments`,
  });
}

/** Trial ending soon — heads-up before the first charge. */
export async function sendTrialEndingEmail(
  params: { to: string; businessName: string; endsAtLabel?: string }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: "Twój okres próbny wkrótce się kończy — TermCatch",
    heading: "Okres próbny dobiega końca",
    lines: [
      `Okres próbny dla <strong>${escapeHtml(params.businessName)}</strong>${params.endsAtLabel ? ` kończy się ${params.endsAtLabel}` : " wkrótce się kończy"}.`,
      "Aby zachować ciągłość działania, upewnij się, że masz aktualną metodę płatności.",
    ],
    ctaLabel: "Zarządzaj subskrypcją",
    ctaUrl: `${APP_URL}/business/payments`,
  });
}

/** Post-visit — ask the customer to leave a review. */
export async function sendReviewRequestEmail(
  params: { to: string; businessName: string; serviceName: string; reviewUrl: string; locale?: Locale | string | null }
): Promise<{ sent: boolean }> {
  const loc = toLocale(params.locale);
  return sendEmail({
    to: params.to,
    subject: L(loc, {
      pl: `Jak było? Oceń wizytę — ${params.businessName}`,
      en: `How was it? Rate your visit — ${params.businessName}`,
      de: `Wie war es? Bewerten Sie Ihren Besuch — ${params.businessName}`,
      tr: `Nasıldı? Ziyaretinizi değerlendirin — ${params.businessName}`,
    }),
    heading: L(loc, {
      pl: "Jak minęła Twoja wizyta?",
      en: "How was your visit?",
      de: "Wie war Ihr Besuch?",
      tr: "Ziyaretiniz nasıldı?",
    }),
    lines: [
      L(loc, {
        pl: `Dziękujemy za wizytę: <strong>${params.serviceName}</strong> w <strong>${params.businessName}</strong>.`,
        en: `Thanks for your visit: <strong>${params.serviceName}</strong> at <strong>${params.businessName}</strong>.`,
        de: `Danke für Ihren Besuch: <strong>${params.serviceName}</strong> bei <strong>${params.businessName}</strong>.`,
        tr: `Ziyaretiniz için teşekkürler: <strong>${params.businessName}</strong> — <strong>${params.serviceName}</strong>.`,
      }),
      L(loc, {
        pl: "Twoja opinia zajmie chwilę, a pomaga salonowi i innym klientom.",
        en: "Your review takes a moment and helps the salon and other customers.",
        de: "Ihre Bewertung dauert nur einen Moment und hilft dem Salon und anderen Kunden.",
        tr: "Değerlendirmeniz bir dakika sürer ve salona ve diğer müşterilere yardımcı olur.",
      }),
    ],
    ctaLabel: L(loc, { pl: "Oceń wizytę", en: "Rate your visit", de: "Besuch bewerten", tr: "Ziyareti değerlendir" }),
    ctaUrl: params.reviewUrl,
  });
}

/** New review — notify the salon (honors the newReview.email preference). */
export async function sendNewReviewNotificationEmail(
  params: { to: string; businessName: string; rating: number }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: `Nowa opinia — ${params.businessName}`,
    heading: "Masz nową opinię",
    lines: [
      `Twój salon <strong>${escapeHtml(params.businessName)}</strong> otrzymał nową ocenę: <strong>${params.rating}/5</strong>.`,
      "Zobacz szczegóły i odpowiedz w panelu.",
    ],
    ctaLabel: "Zobacz opinie",
    ctaUrl: `${APP_URL}/business/reviews`,
  });
}

/** Notify an EMPLOYEE about one of THEIR appointments (new / changed / cancelled). */
export async function sendEmployeeAppointmentEmail(
  params: { to: string; businessName: string; serviceName: string; slotLabel: string; clientName: string; kind: "new" | "changed" | "cancelled" }
): Promise<{ sent: boolean }> {
  const heading =
    params.kind === "new" ? "Masz nową wizytę w grafiku"
    : params.kind === "changed" ? "Zmieniono termin Twojej wizyty"
    : "Twoja wizyta została odwołana";
  const subjectVerb = params.kind === "new" ? "Nowa wizyta" : params.kind === "changed" ? "Zmiana terminu" : "Odwołana wizyta";
  return sendEmail({
    to: params.to,
    subject: `${subjectVerb} — ${escapeHtml(params.serviceName)}`,
    heading,
    lines: [
      `<strong>${escapeHtml(params.serviceName)}</strong> — ${escapeHtml(params.clientName)}`,
      escapeHtml(params.slotLabel),
      `Salon: ${escapeHtml(params.businessName)}`,
    ],
    ctaLabel: "Zobacz swój grafik",
    ctaUrl: `${APP_URL}/employee/dashboard`,
  });
}

/** One-time welcome / account-created email (sent after signup completes). */
export async function sendWelcomeEmail(
  params: { to: string; firstName?: string | null }
): Promise<{ sent: boolean }> {
  const name = params.firstName ? escapeHtml(params.firstName) : "";
  return sendEmail({
    to: params.to,
    subject: "Witaj w TermCatch 👋",
    heading: name ? `Cześć ${name}!` : "Witaj w TermCatch!",
    lines: [
      "Twoje konto zostało utworzone. Możesz już rezerwować wizyty i zarządzać swoim kontem w TermCatch.",
      "Cieszymy się, że jesteś z nami.",
    ],
    ctaLabel: "Przejdź do TermCatch",
    ctaUrl: APP_URL,
  });
}

/** Employee invitation — branded, one CTA to activate the account (7-day validity). */
export async function sendEmployeeInvitationEmail(
  params: { to: string; employeeName: string; businessName: string; url: string }
): Promise<{ sent: boolean }> {
  const name = params.employeeName ? escapeHtml(params.employeeName) : "";
  return sendEmail({
    to: params.to,
    subject: `Zaproszenie do zespołu ${params.businessName} w TermCatch`,
    heading: `Dołącz do zespołu ${escapeHtml(params.businessName)}`,
    lines: [
      name ? `Cześć ${name}!` : "Cześć!",
      `<strong>${escapeHtml(params.businessName)}</strong> zaprasza Cię do TermCatch. Utwórz swoje konto pracownika, aby widzieć swój grafik, wizyty, wolne terminy i operacyjnego asystenta AI.`,
      "Link jest jednorazowy i ważny przez 7 dni.",
    ],
    ctaLabel: "Aktywuj konto",
    ctaUrl: params.url,
  });
}

/** Confirmation after an employee activates their account. */
export async function sendEmployeeInvitationAcceptedEmail(
  params: { to: string; employeeName: string; businessName: string }
): Promise<{ sent: boolean }> {
  return sendEmail({
    to: params.to,
    subject: `Konto pracownika aktywne — ${params.businessName}`,
    heading: "Twoje konto jest gotowe",
    lines: [
      params.employeeName ? `Cześć ${escapeHtml(params.employeeName)}!` : "Cześć!",
      `Twoje konto pracownika w <strong>${escapeHtml(params.businessName)}</strong> zostało aktywowane. Zaloguj się, aby zobaczyć swój dzień.`,
    ],
    ctaLabel: "Przejdź do panelu",
    ctaUrl: `${APP_URL}/employee/dashboard`,
  });
}
