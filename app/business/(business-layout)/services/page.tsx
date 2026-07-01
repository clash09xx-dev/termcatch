export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ServicesClient } from "./services-client";

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

  return <ServicesClient services={business.services} businessId={business.id} />;
}
