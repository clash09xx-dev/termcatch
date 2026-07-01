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
