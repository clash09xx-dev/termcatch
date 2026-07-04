import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Liczba nieprzeczytanych powiadomień zalogowanego użytkownika. */
export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ count: 0 });

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    });
    if (!dbUser) return NextResponse.json({ count: 0 });

    const count = await prisma.notification.count({
      where: { userId: dbUser.id, channel: "IN_APP", isRead: false },
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
