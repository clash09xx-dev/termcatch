export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./profile-form";

export default async function CustomerProfilePage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { firstName: true, lastName: true, phone: true, email: true },
  });
  if (!dbUser) redirect("/login");

  return (
    <ProfileForm
      firstName={dbUser.firstName}
      lastName={dbUser.lastName}
      phone={dbUser.phone ?? ""}
      email={dbUser.email}
    />
  );
}
