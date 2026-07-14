export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CouponsClient, type CouponRow } from "./coupons-client";

export default async function CouponsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const coupons = await prisma.coupon.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });

  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    value: c.value,
    minOrderValue: c.minOrderValue,
    maxUses: c.maxUses,
    usesCount: c.usesCount,
    validFrom: c.validFrom.toISOString(),
    validUntil: c.validUntil.toISOString(),
    isActive: c.isActive,
  }));

  return <CouponsClient coupons={rows} />;
}
