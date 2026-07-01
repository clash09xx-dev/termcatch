export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ReviewsClient } from "./reviews-client";
import type { Review, User } from "@prisma/client";

type ReviewWithCustomer = Review & { customer: User };

async function getReviewsData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          reviews: {
            orderBy: { createdAt: "desc" },
            where: { status: "PUBLISHED" },
            include: { customer: true },
          },
        },
      },
    },
  });
  return dbUser;
}

export default async function ReviewsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getReviewsData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const reviews = business.reviews as ReviewWithCustomer[];

  // Stats
  const totalCount = reviews.length;
  const avgRating =
    totalCount > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalCount
      : 0;

  const starDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct:
      totalCount > 0
        ? (reviews.filter((r) => r.rating === star).length / totalCount) * 100
        : 0,
  }));

  return (
    <ReviewsClient
      reviews={reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        replyText: r.replyText,
        repliedAt: r.repliedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        customerName: `${r.customer.firstName} ${r.customer.lastName}`,
      }))}
      avgRating={avgRating}
      totalCount={totalCount}
      starDistribution={starDistribution}
    />
  );
}
