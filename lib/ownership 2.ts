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
