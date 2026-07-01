export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./profile-client";

async function getProfileData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: { take: 1 },
    },
  });
  return dbUser;
}

export default async function ProfilePage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getProfileData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  return <ProfileClient business={business} />;
}
