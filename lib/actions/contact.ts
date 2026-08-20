"use server";

import { z } from "zod";
import { sendSupportAutoReply, sendSupportNotification } from "@/lib/email";
import { getServerI18n } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/dictionaries";
import { LEGAL } from "@/lib/legal";
import { clientIp, consume } from "@/lib/rate-limit";

/** Stable topic keys — the form submits these, never a translated label. */
const TOPIC_KEYS = ["general", "support", "enterprise", "partnership", "other"] as const;
type TopicKey = (typeof TOPIC_KEYS)[number];

export type ContactState = {
  error?: string;
  success?: string;
};

export async function submitContactAction(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Validation messages and the outcome now speak the same language as the
  // form the visitor just filled in, so the schema is built per request.
  const { dict } = await getServerI18n();
  const T = dict.publicPages.contact;

  const ContactSchema = z.object({
    firstName: z.string().min(2, T.errFirstName).max(50),
    lastName: z.string().min(2, T.errLastName).max(50),
    email: z.string().email(T.errEmail),
    topic: z.enum(TOPIC_KEYS),
    message: z.string().min(10, T.errMessage).max(5000),
    // Honeypot — bots fill the hidden field, people do not
    website: z.string().max(0).optional().or(z.literal("")),
  });

  const parsed = ContactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    message: formData.get("message"),
    website: (formData.get("website") as string) ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? T.errInvalid };
  }

  const { firstName, lastName, email, topic, message, website } = parsed.data;

  // Honeypot triggered — pretend success, send nothing
  if (website && website.length > 0) {
    return { success: T.successBody };
  }

  // Rate limit AFTER validation and the honeypot, so garbage and bots do not
  // consume a real visitor's budget, and BEFORE sending, which is the part that
  // costs money and reaches an inbox.
  //
  // This endpoint sends TWO e-mails per call, and one of them goes to an address
  // the caller supplies. Unlimited, that is a reflected e-mail amplifier: point
  // `email` at a victim and loop, and TermCatch floods them on TermCatch's
  // Resend quota. The honeypot alone does not stop that — a bot that simply
  // omits the hidden field walks straight through.
  //
  // Two keys, first to trip wins: the IP bounds a single sender, the e-mail
  // bounds a single victim even from a botnet.
  const ip = await clientIp();
  const perIp = consume(`contact:ip:${ip}`, 5, 60 * 60 * 1000);
  const perEmail = consume(`contact:to:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!perIp.ok || !perEmail.ok) {
    return { error: T.errTooMany };
  }

  // The inbox gets a readable topic, not the raw key.
  const topicLabel = T.topics[topic as TopicKey];

  // 1. Support request → the support inbox (reply-to: the user) — this is the
  //    one that MUST succeed; the auto-reply is best-effort.
  // 2. Auto-reply → the user.
  const [notif, autoReply] = await Promise.allSettled([
    sendSupportNotification({ firstName, lastName, email, topic: topicLabel, message }),
    sendSupportAutoReply(email),
  ]);
  void autoReply;

  const teamNotified = notif.status === "fulfilled" && notif.value?.sent === true;
  if (!teamNotified) {
    // Never claim we received it if the message wasn't actually delivered to us.
    return { error: interpolate(T.errSendFailed, { email: LEGAL.CONTACT_EMAIL }) };
  }

  return { success: T.successBody };
}
