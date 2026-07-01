import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { StaffClient } from "./staff-client";

async function getStaffData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          employees: {
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            include: {
              services: {
                include: { service: true },
              },
            },
          },
          services: {
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });
  return dbUser;
}

export default async function StaffPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getStaffData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  return (
    <StaffClient
      employees={business.employees}
      availableServices={business.services}
    />
  );
}
