"use server";

import { z } from "zod";
import { sendSupportAutoReply, sendSupportNotification } from "@/lib/email";

const ContactSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć min. 2 znaki").max(50),
  lastName: z.string().min(2, "Nazwisko musi mieć min. 2 znaki").max(50),
  email: z.string().email("Nieprawidłowy adres e-mail"),
  topic: z.string().min(1).max(100),
  message: z.string().min(10, "Wiadomość musi mieć min. 10 znaków").max(5000),
  // Honeypot — boty wypełniają ukryte pole, ludzie nie
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactState = {
  error?: string;
  success?: string;
};

export async function submitContactAction(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const parsed = ContactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    topic: formData.get("topic"),
    message: formData.get("message"),
    website: (formData.get("website") as string) ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Nieprawidłowe dane formularza." };
  }

  const { firstName, lastName, email, topic, message, website } = parsed.data;

  // Honeypot triggered — pretend success, send nothing
  if (website && website.length > 0) {
    return { success: "Dziękujemy! Otrzymaliśmy Twoją wiadomość." };
  }

  // 1. Support request → hello@termcatch.com (reply-to: the user)
  // 2. Auto-reply → the user (from no-reply@, reply-to: hello@)
  await Promise.allSettled([
    sendSupportNotification({ firstName, lastName, email, topic, message }),
    sendSupportAutoReply(email),
  ]);

  return {
    success:
      "Dziękujemy! Otrzymaliśmy Twoją wiadomość i odpowiemy najszybciej jak to możliwe.",
  };
}
