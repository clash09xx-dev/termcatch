"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/is-admin";

/**
 * Close a report.
 *
 * Authorization goes through isPlatformAdmin, which reads the DB role and
 * ADMIN_EMAILS — never user_metadata, which any user can write to themselves.
 */
export async function resolveReport(
  reportId: string,
  status: "resolved" | "dismissed",
): Promise<{ ok: boolean }> {
  if (!(await isPlatformAdmin())) return { ok: false };
  if (status !== "resolved" && status !== "dismissed") return { ok: false };

  const admin = await getServerUser();
  await prisma.report.update({
    where: { id: String(reportId) },
    data: { status, handledAt: new Date(), handledBy: admin?.id ?? null },
  });

  revalidatePath("/admin/reports");
  return { ok: true };
}
