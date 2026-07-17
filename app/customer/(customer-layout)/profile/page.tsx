export const dynamic = "force-dynamic";

import { getOrCreateDbUser } from "@/lib/auth-user";
import ProfileForm from "./profile-form";

export default async function CustomerProfilePage() {
  const dbUser = await getOrCreateDbUser();

  return (
    <ProfileForm
      firstName={dbUser.firstName}
      lastName={dbUser.lastName}
      phone={dbUser.phone ?? ""}
      email={dbUser.email}
      smsNotifications={dbUser.smsNotifications}
    />
  );
}
