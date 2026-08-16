export const dynamic = "force-dynamic";

import { getOrCreateDbUser } from "@/lib/auth-user";
import { resolveBusinessAccess } from "@/lib/ownership";
import ProfileForm from "./profile-form";

export default async function CustomerProfilePage() {
  const dbUser = await getOrCreateDbUser();

  // A specialist who joined with a code needs to SEE that it worked. A toast is
  // gone on the next render, so the membership is stated here, on the settings
  // page they joined from, and resolved server-side like every other business
  // relationship in the product.
  const access = await resolveBusinessAccess();
  const membership =
    access.kind === "employee"
      ? { businessName: access.businessName, salonHref: access.salonHref }
      : null;

  return (
    <ProfileForm
      firstName={dbUser.firstName}
      lastName={dbUser.lastName}
      phone={dbUser.phone ?? ""}
      email={dbUser.email}
      smsNotifications={dbUser.smsNotifications}
      membership={membership}
    />
  );
}
