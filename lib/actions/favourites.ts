"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { isPubliclyVisible } from "@/lib/publication";

async function getDbUserId(): Promise<string | null> {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  return dbUser?.id ?? null;
}

/** Toggle a salon in the current user's favourites. Returns the new state. */
export async function toggleFavourite(businessId: string): Promise<{ isFavourite: boolean; requiresLogin?: boolean }> {
  const userId = await getDbUserId();
  if (!userId) return { isFavourite: false, requiresLogin: true };

  const existing = await prisma.favouriteBusiness.findUnique({
    where: { userId_businessId: { userId, businessId } },
  });

  if (existing) {
    await prisma.favouriteBusiness.delete({
      where: { userId_businessId: { userId, businessId } },
    });
  } else {
    // Only favourite a real, publicly-visible salon — avoids an unhandled FK
    // error on a bad id and favouriting hidden/suspended businesses.
    const biz = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, status: true, isActive: true },
    });
    if (!biz || !isPubliclyVisible(biz)) return { isFavourite: false };
    await prisma.favouriteBusiness.create({
      data: { userId, businessId },
    });
  }

  revalidatePath("/customer/favourites");

  return { isFavourite: !existing };
}

/** Is a salon in the current user's favourites? */
export async function isFavourite(businessId: string): Promise<boolean> {
  const userId = await getDbUserId();
  if (!userId) return false;
  const existing = await prisma.favouriteBusiness.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { userId: true },
  });
  return !!existing;
}

/** Current user's favourite salons. */
export async function getMyFavourites() {
  const userId = await getDbUserId();
  if (!userId) return [];
  return prisma.favouriteBusiness.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          category: true,
          logoUrl: true,
          coverImageUrl: true,
          averageRating: true,
          totalReviews: true,
          shortDescription: true,
        },
      },
    },
  });
}
