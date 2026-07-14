"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CouponType, Prisma } from "@prisma/client";

async function getOwnedBusinessId(): Promise<string> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const biz = dbUser?.ownedBusinesses[0];
  if (!biz) throw new Error("Nie masz przypisanego salonu.");
  return biz.id;
}

export type CouponInput = {
  code: string;
  name: string;
  type: CouponType;
  value: number;
  minOrderValue?: number | null;
  maxUses?: number | null;
  validFrom: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  isActive: boolean;
};

function normalize(input: CouponInput) {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "");
  if (!code) throw new Error("Podaj kod kuponu.");
  if (!input.name.trim()) throw new Error("Podaj nazwę kuponu.");
  if (!(input.value > 0)) throw new Error("Wartość rabatu musi być większa niż 0.");
  if (input.type === "PERCENTAGE" && input.value > 100) throw new Error("Rabat procentowy nie może przekraczać 100%.");
  const validFrom = new Date(`${input.validFrom}T00:00:00`);
  const validUntil = new Date(`${input.validUntil}T23:59:59`);
  if (isNaN(validFrom.getTime()) || isNaN(validUntil.getTime())) throw new Error("Nieprawidłowe daty ważności.");
  if (validUntil < validFrom) throw new Error("Data końca musi być po dacie startu.");
  return {
    code, name: input.name.trim(), type: input.type, value: input.value,
    minOrderValue: input.minOrderValue ?? null,
    maxUses: input.maxUses ?? null,
    validFrom, validUntil, isActive: input.isActive,
  };
}

export async function createCoupon(input: CouponInput) {
  const businessId = await getOwnedBusinessId();
  const data = normalize(input);
  try {
    await prisma.coupon.create({ data: { businessId, ...data } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Kupon o tym kodzie już istnieje.");
    }
    throw e;
  }
  revalidatePath("/business/coupons");
}

export async function updateCoupon(id: string, input: CouponInput) {
  const businessId = await getOwnedBusinessId();
  const existing = await prisma.coupon.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!existing) throw new Error("Nie znaleziono kuponu.");
  const data = normalize(input);
  try {
    await prisma.coupon.update({ where: { id }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Kupon o tym kodzie już istnieje.");
    }
    throw e;
  }
  revalidatePath("/business/coupons");
}

export async function toggleCoupon(id: string) {
  const businessId = await getOwnedBusinessId();
  const c = await prisma.coupon.findFirst({ where: { id, businessId }, select: { isActive: true } });
  if (!c) throw new Error("Nie znaleziono kuponu.");
  await prisma.coupon.update({ where: { id }, data: { isActive: !c.isActive } });
  revalidatePath("/business/coupons");
}

export async function deleteCoupon(id: string) {
  const businessId = await getOwnedBusinessId();
  const c = await prisma.coupon.findFirst({ where: { id, businessId }, select: { id: true } });
  if (!c) throw new Error("Nie znaleziono kuponu.");
  await prisma.coupon.delete({ where: { id } });
  revalidatePath("/business/coupons");
}
