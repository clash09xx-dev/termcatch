export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { multiLocationEnabled } from "@/lib/multi-location";
import { LocationsClient } from "./locations-client";

export default async function LocationsPage() {
  // Hard gate: the whole feature is inert until the flag is enabled. When off,
  // the route does not exist — no query ever touches `prisma.location`.
  if (!multiLocationEnabled()) notFound();

  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const locations = await prisma.location.findMany({
    where: { businessId: business.id },
    orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      addressLine: true,
      city: true,
      postalCode: true,
      phone: true,
      isPrimary: true,
      isActive: true,
      _count: { select: { employees: true, services: true } },
    },
  });

  return <LocationsClient locations={locations} />;
}
