"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  // Notify the salon owner
  await prisma.notification
    .create({
      data: {
        userId: appointment.business.ownerId,
        businessId: appointment.businessId,
        type: "REVIEW_RECEIVED",
        channel: "IN_APP",
        title: "Nowa opinia",
        body: `${customer.firstName} ${customer.lastName} wystawił(a) ocenę ${rating}/5.`,
        sentAt: new Date(),
      },
    })
    .catch(() => {});

  revalidatePath(`/b/${appointment.business.slug}`);
  revalidatePath("/customer/dashboard");
  revalidatePath("/business/reviews");
}

export async function replyToReview(reviewId: string, replyText: string) {
  const businessId = await getBusinessId();

  await prisma.review.updateMany({
    where: { id: reviewId, businessId },
    data: {
      replyText,
      repliedAt: new Date(),
    },
  });

  revalidatePath("/business/reviews");
}
