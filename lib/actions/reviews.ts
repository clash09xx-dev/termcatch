"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { getBusinessNotificationSettings, salonWants } from "@/lib/notification-settings";
import { sendTransactionalSms } from "@/lib/sms";

async function getBusinessId(): Promise<string> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");
  return business.id;
}

async function getDbUser() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });
  if (!dbUser) redirect("/login");
  return dbUser;
}

/** Customer: create a review for their own COMPLETED appointment. */
export async function createReview(input: {
  appointmentId: string;
  rating: number;
  comment?: string;
}) {
  const customer = await getDbUser();

  const rating = Math.round(input.rating);
  if (rating < 1 || rating > 5) throw new Error("Ocena musi być w skali 1-5.");

  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: {
      review: { select: { id: true } },
      business: { select: { id: true, slug: true, name: true, ownerId: true } },
    },
  });

  if (!appointment) throw new Error("Nie znaleziono wizyty.");
  if (appointment.customerId !== customer.id)
    throw new Error("Możesz ocenić tylko własne wizyty.");
  if (appointment.status !== "COMPLETED")
    throw new Error("Możesz ocenić tylko zakończone wizyty.");
  if (appointment.review)
    throw new Error("Ta wizyta została już oceniona.");

  await prisma.review.create({
    data: {
      businessId: appointment.businessId,
      customerId: customer.id,
      appointmentId: appointment.id,
      employeeId: appointment.employeeId,
      rating,
      comment: input.comment?.trim() || null,
      status: "PUBLISHED",
    },
  });

  // Recompute the salon's aggregate rating
  const agg = await prisma.review.aggregate({
    where: { businessId: appointment.businessId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.business.update({
    where: { id: appointment.businessId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      totalReviews: agg._count.rating,
    },
  });

  // Notify the salon owner — in-app + optional SMS, both preference-gated and
  // non-blocking (a failing notification must never break review submission).
  // SMS is deduped per appointment (retries can't double-send). createReview
  // itself can't double-fire (appointmentId is @unique — already guarded above).
  const { settings } = await getBusinessNotificationSettings(appointment.businessId);
  const reviewsLink = `${getAppUrl()}/business/reviews`;
  await Promise.allSettled([
    salonWants(settings, "newReview", "inApp")
      ? prisma.notification.create({
          data: {
            userId: appointment.business.ownerId,
            businessId: appointment.businessId,
            type: "REVIEW_RECEIVED",
            channel: "IN_APP",
            title: "Nowa opinia",
            body: `${customer.firstName} ${customer.lastName} wystawił(a) ocenę ${rating}/5.`,
            data: { link: "/business/reviews" },
            sentAt: new Date(),
          },
        })
      : Promise.resolve(null),
    // Concise Polish; rating + safe dashboard link only — no private customer detail.
    salonWants(settings, "newReview", "sms")
      ? sendTransactionalSms({
          toPhone: settings.smsPhone,
          template: "salon",
          dedupeKey: `sms:salon:review:${appointment.id}`,
          body: `TermCatch: nowa opinia ${rating}/5 dla Twojego salonu. Szczegóły: ${reviewsLink}`,
        })
      : Promise.resolve(null),
  ]);

  revalidatePath(`/b/${appointment.business.slug}`);
  revalidatePath("/customer/dashboard");
  revalidatePath("/business/reviews");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function replyToReview(reviewId: string, replyText: string) {
  const businessId = await getBusinessId();
  const text = replyText.trim();
  if (!text) throw new Error("Odpowiedź nie może być pusta.");

  // Atomic first-reply claim: only the call that transitions replyText from
  // empty → text wins the notification. Retries, double-clicks and later edits
  // hit the fallback edit path below and can never send a duplicate e-mail.
  const claimed = await prisma.review.updateMany({
    where: { id: reviewId, businessId, OR: [{ replyText: null }, { replyText: "" }] },
    data: { replyText: text, repliedAt: new Date() },
  });

  const isFirstReply = claimed.count === 1;
  if (!isFirstReply) {
    // Edit of an existing reply (or unknown id — scoped updateMany is a no-op).
    await prisma.review.updateMany({
      where: { id: reviewId, businessId },
      data: { replyText: text, repliedAt: new Date() },
    });
  }

  if (isFirstReply) {
    // Notify the customer — only AFTER the reply was successfully saved.
    const review = await prisma.review.findFirst({
      where: { id: reviewId, businessId },
      select: {
        rating: true,
        comment: true,
        customer: { select: { id: true, firstName: true, email: true, emailNotifications: true } },
        business: { select: { name: true, slug: true } },
      },
    });
    if (review) {
      const { customer, business } = review;
      // Walk-in placeholders can't receive mail; respect the e-mail opt-out.
      const emailOk =
        customer.emailNotifications &&
        !!customer.email &&
        !customer.email.endsWith("@termcatch.local") &&
        !customer.email.endsWith("@unknown.termcatch.com");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";
      const excerpt = review.comment ? (review.comment.length > 140 ? `${review.comment.slice(0, 140)}…` : review.comment) : null;
      const stars = "★".repeat(review.rating) + "☆".repeat(Math.max(0, 5 - review.rating));

      await Promise.allSettled([
        prisma.notification.create({
          data: {
            userId: customer.id,
            businessId,
            type: "REVIEW_RECEIVED",
            channel: "IN_APP",
            title: `${business.name} odpowiedział na Twoją opinię`,
            body: text.length > 120 ? `${text.slice(0, 120)}…` : text,
            sentAt: new Date(),
          },
        }),
        emailOk
          ? sendEmail({
              to: customer.email,
              subject: `${business.name} odpowiedział na Twoją opinię`,
              heading: `${business.name} odpowiedział na Twoją opinię`,
              lines: [
                `Cześć${customer.firstName ? ` ${escapeHtml(customer.firstName)}` : ""},`,
                `Twoja ocena: <strong>${stars} (${review.rating}/5)</strong>`,
                ...(excerpt ? [`Twoja opinia: „${escapeHtml(excerpt)}"`] : []),
                `<strong>Odpowiedź salonu:</strong> ${escapeHtml(text)}`,
              ],
              ctaLabel: "Zobacz profil salonu",
              ctaUrl: `${appUrl}/b/${business.slug}`,
            })
          : Promise.resolve(),
      ]);
    }
  }

  revalidatePath("/business/reviews");
  return { firstReply: isFirstReply };
}
