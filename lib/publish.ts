// ─── Auto-publish (no manual admin approval) ─────────────────────────────────
// Promotes a business to public (ACTIVE) as soon as its profile is complete
// enough to be bookable. Called after onboarding and after any profile-completing
// mutation (service/hours/profile/staff). Server-only helper (imports prisma) —
// kept out of lib/publication.ts so that module stays pure/unit-testable.

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { BusinessStatus } from "@prisma/client";
import { validateForPublication } from "@/lib/publication";

/**
 * If the business is PENDING_VERIFICATION and now meets the publication
 * requirements, publish it (→ ACTIVE, isActive true, verifiedAt stamped).
 *
 * SAFETY: only ever promotes from PENDING_VERIFICATION. A SUSPENDED / BANNED /
 * CLOSED business is never touched, so an admin-suspended salon is never
 * silently reactivated by an owner edit. Returns true if it published now.
 * Never throws (best-effort — must not break the calling mutation).
 */
export async function autoPublishIfComplete(businessId: string): Promise<boolean> {
  try {
    const b = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        status: true,
        slug: true,
        name: true,
        category: true,
        city: true,
        address: true,
        phone: true,
        email: true,
        services: { where: { isActive: true }, select: { price: true, duration: true } },
        workingHours: { select: { isOpen: true } },
      },
    });
    if (!b || b.status !== BusinessStatus.PENDING_VERIFICATION) return false;

    const check = validateForPublication({
      name: b.name,
      category: b.category,
      city: b.city,
      address: b.address,
      phone: b.phone,
      email: b.email,
      activeServices: b.services,
      openDays: b.workingHours.filter((w) => w.isOpen).length,
    });
    if (!check.ok) return false;

    // Conditional update: only flips the row that is STILL pending, so a race
    // (e.g. an admin suspending at the same moment) can't be clobbered.
    const res = await prisma.business.updateMany({
      where: { id: businessId, status: BusinessStatus.PENDING_VERIFICATION },
      data: { status: BusinessStatus.ACTIVE, isActive: true, verifiedAt: new Date() },
    });
    if (res.count === 0) return false;

    // Going public changes what EVERY public surface should render, so the
    // refresh belongs here — at the single place the flip happens — rather than
    // being re-listed by each of the six callers (which is how /b/[slug] came
    // to be missed while /search was revalidated).
    for (const path of ["/business/dashboard", "/search", "/categories", `/b/${b.slug}`]) {
      try {
        revalidatePath(path);
      } catch {
        // Outside a request scope (a script, a background job) there is nothing
        // to revalidate — publishing must still succeed.
      }
    }
    return true;
  } catch {
    return false;
  }
}
