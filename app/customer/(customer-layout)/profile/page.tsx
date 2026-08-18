export const dynamic = "force-dynamic";

import { getOrCreateDbUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { resolveBusinessAccess } from "@/lib/ownership";
import { businessPlanLabel } from "@/lib/plan-display";
import { membershipDisplayState } from "@/lib/employee/membership";
import ProfileForm from "./profile-form";

export default async function CustomerProfilePage() {
  const dbUser = await getOrCreateDbUser();

  // A specialist who applied with a code needs to SEE where that got to. A
  // toast is gone on the next render, so the relationship — membership OR a
  // request still waiting on the owner — is stated here, on the settings page
  // they applied from, and resolved server-side like every other business
  // relationship in the product.
  const access = await resolveBusinessAccess();
  const membership =
    access.kind === "employee"
      ? { businessName: access.businessName, salonHref: access.salonHref }
      : null;

  // The most recent thing that happened to an application from this account.
  // Only shown when there is no active membership — an approved specialist's
  // card states the membership, which is the stronger fact.
  const request = membership
    ? null
    : await prisma.employeeJoinRequest.findFirst({
        where: { userId: dbUser.id, status: { in: ["PENDING", "REJECTED"] } },
        orderBy: { updatedAt: "desc" },
        select: {
          status: true,
          blockedAt: true,
          business: { select: { id: true, name: true } },
        },
      });

  // Only look the plan up for the one state that names it: an application the
  // owner cannot approve because the salon is full. Anything else would be
  // telling an applicant about a salon's billing for no reason.
  const planLabel =
    request && request.blockedAt !== null ? await businessPlanLabel(request.business.id) : null;

  return (
    <ProfileForm
      firstName={dbUser.firstName}
      lastName={dbUser.lastName}
      phone={dbUser.phone ?? ""}
      email={dbUser.email}
      smsNotifications={dbUser.smsNotifications}
      membership={membership}
      request={
        request
          ? {
              state: membershipDisplayState({
                activeMembership: false,
                requestStatus: request.status,
                blocked: request.blockedAt !== null,
              }),
              businessName: request.business.name,
              planLabel,
            }
          : null
      }
    />
  );
}
