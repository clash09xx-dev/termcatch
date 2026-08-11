"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { VIEW_AS_COOKIE } from "@/lib/employee/context";

/**
 * Owner-only "View-As employee" — a controlled preview context. The owner stays
 * authenticated as the owner (no employee session/credentials are ever used);
 * a signed-scope cookie records which employee is being previewed and every
 * resolve re-validates that the owner owns that employee. Read-only by design.
 */

export async function startViewAs(employeeId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser();
  if (!user) return { ok: false, error: "Brak dostępu." };
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const businessId = dbUser?.ownedBusinesses[0]?.id;
  if (!dbUser || !businessId) return { ok: false, error: "Tylko właściciel może włączyć podgląd." };

  const emp = await prisma.employee.findFirst({
    where: { id: String(employeeId), businessId },
    select: { id: true },
  });
  if (!emp) return { ok: false, error: "Nie znaleziono pracownika w Twoim salonie." };

  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, emp.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 2 * 60 * 60 });
  console.warn(`[view-as:start] owner_user=${dbUser.id} employee=${emp.id} business=${businessId}`);
  redirect("/employee/dashboard");
}

export async function stopViewAs(): Promise<void> {
  const jar = await cookies();
  const employeeId = jar.get(VIEW_AS_COOKIE)?.value;
  const user = await getServerUser();
  jar.delete(VIEW_AS_COOKIE);
  console.warn(`[view-as:stop] user=${user?.id ?? "?"} employee=${employeeId ?? "?"}`);
  redirect("/business/staff");
}
