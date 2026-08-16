import "server-only";

import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";

/**
 * Server-authoritative business-ownership check. The Client/Salon view switch,
 * and every business route, rely on THIS — never on the presentation cookie.
 * Returns the owned business id (the user's OWN business, resolved from their
 * session), or null.
 *
 * A forged view cookie grants nothing: business routes still call their own
 * ownership checks, and this resolves ownership from the authenticated session,
 * so a non-owner can never enter a business — nor select another one.
 */
export async function currentOwnedBusinessId(): Promise<string | null> {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { ownedBusinesses: { take: 1, select: { id: true } } },
  });
  return dbUser?.ownedBusinesses[0]?.id ?? null;
}

/** Convenience boolean — does the current authenticated user own a business? */
export async function currentUserOwnsBusiness(): Promise<boolean> {
  return (await currentOwnedBusinessId()) !== null;
}

// ─── Business access (ownership OR membership) ───────────────────────────────
//
// Owning a salon and working at one are different relationships that grant
// different powers, and the product needs both. Until now only ownership was
// resolved, so a specialist who joined with a code got an Employee row, an
// EMPLOYEE role — and no way to reach the salon they had just joined. Their
// account looked identical to a plain customer's.
//
// This is the ONE place that answers "what business context may this session
// enter, and where does it lead?". Resolved entirely from the authenticated
// session: no cookie, no client input, no business id from the request. A view
// switch built on it therefore cannot be pointed at someone else's salon.
//
// Ownership wins over membership when both hold (an owner who also works at
// another salon lands in their own business panel), because the owner panel is
// the strictly larger capability.

export type BusinessAccess =
  | { kind: "none" }
  | { kind: "owner"; businessId: string; businessName: string; salonHref: string }
  | {
      kind: "employee";
      businessId: string;
      businessName: string;
      employeeId: string;
      salonHref: string;
    };

/** Where each relationship's "Salon" view lives. Employees never get /business. */
export const OWNER_SALON_HREF = "/business/dashboard";
export const EMPLOYEE_SALON_HREF = "/employee/dashboard";

/**
 * The current session's business relationship.
 *
 * One query for both halves, so adding membership did not add a round trip to
 * every customer page render.
 */
export async function resolveBusinessAccess(): Promise<BusinessAccess> {
  const user = await getServerUser();
  if (!user) return { kind: "none" };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      ownedBusinesses: { take: 1, select: { id: true, name: true } },
      employeeProfiles: {
        // Only an ACTIVE membership grants a salon context: deactivating a
        // specialist has to actually remove their access, not just hide them
        // from the team list.
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { id: true, business: { select: { id: true, name: true } } },
      },
    },
  });
  if (!dbUser) return { kind: "none" };

  const owned = dbUser.ownedBusinesses[0];
  if (owned) {
    return {
      kind: "owner",
      businessId: owned.id,
      businessName: owned.name,
      salonHref: OWNER_SALON_HREF,
    };
  }

  const membership = dbUser.employeeProfiles[0];
  if (membership) {
    return {
      kind: "employee",
      businessId: membership.business.id,
      businessName: membership.business.name,
      employeeId: membership.id,
      salonHref: EMPLOYEE_SALON_HREF,
    };
  }

  return { kind: "none" };
}
