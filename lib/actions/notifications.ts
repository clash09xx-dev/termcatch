"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";

async function getDbUserId(): Promise<string> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) redirect("/login");
  return dbUser.id;
}

export async function getMyNotifications() {
  const userId = await getDbUserId();
  return prisma.notification.findMany({
    where: { userId, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markAllNotificationsRead() {
  const userId = await getDbUserId();
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/customer/notifications");
  revalidatePath("/customer", "layout");
}

export async function markNotificationRead(notificationId: string) {
  const userId = await getDbUserId();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/customer/notifications");
}
