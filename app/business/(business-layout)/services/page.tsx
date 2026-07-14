export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ServicesClient } from "./services-client";
import { AddonsSection, type AddonRow } from "./addons-section";

async function getServicesData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          services: {
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
          },
          serviceAddons: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: { services: { select: { id: true } } },
          },
        },
      },
    },
  });
  return dbUser;
}

export default async function ServicesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getServicesData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  const addons: AddonRow[] = business.serviceAddons.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    priceIncrease: a.priceIncrease,
    durationIncrease: a.durationIncrease,
    isActive: a.isActive,
    hasQuantity: a.hasQuantity,
    minQuantity: a.minQuantity,
    maxQuantity: a.maxQuantity,
    defaultQuantity: a.defaultQuantity,
    serviceIds: a.services.map((s) => s.id),
  }));

  const serviceOptions = business.services.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-8">
      <ServicesClient services={business.services} businessId={business.id} />
      <AddonsSection addons={addons} services={serviceOptions} />
    </div>
  );
}
