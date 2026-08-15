"use server";

import { getServerUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { getServerI18n } from "@/lib/i18n/server";

/**
 * Customer / specialist account deletion.
 *
 * Salon OWNERS already have a deletion path with e-mail OTP confirmation in
 * lib/actions/danger.ts, because deleting an owner means deleting a business
 * and everything hanging off it. This action is for everyone else, and it
 * deliberately refuses to run for an owner rather than duplicating that logic.
 *
 * WHY THIS ANONYMISES RATHER THAN HARD-DELETES THE ROW
 *
 * `Appointment.customer` is a required relation with no onDelete rule, so
 * Prisma defaults to Restrict: deleting a User who has ever booked would throw,
 * and cascading instead would erase appointments out of a salon's books — which
 * the salon is required to keep for accounting. Reviews have the same shape and
 * are content other people rely on.
 *
 * So the account is destroyed in every sense that matters to the person:
 *   - the Supabase auth identity is deleted, so the login no longer exists
 *   - every personal field on the User row is scrubbed
 *   - data that exists only for them (notifications, push tokens, favourites,
 *     AI conversations, memberships) is deleted outright
 *   - Employee links are detached, so no salon keeps them on a roster
 *
 * What survives is a tombstone row carrying no personal data, kept only so the
 * salon's historical bookings still point somewhere. This is the safest correct
 * behaviour the current schema allows, and it is described to the user before
 * they confirm (pages.settings.deleteAccountConfirmBody).
 */

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export async function deleteMyAccount(): Promise<DeleteAccountResult> {
  const { dict } = await getServerI18n();
  const T = dict.pages.settings.accountDeletion;

  const user = await getServerUser();
  if (!user) return { ok: false, error: dict.errors.forbidden };

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      id: true,
      ownedBusinesses: { select: { id: true }, take: 1 },
    },
  });
  if (!dbUser) return { ok: false, error: dict.errors.forbidden };

  // An owner deleting their account also deletes a live salon, other people's
  // bookings and a Stripe subscription. That path exists and is OTP-gated;
  // sending them there is safer than half-doing it here.
  if (dbUser.ownedBusinesses.length > 0) {
    return { ok: false, error: T.ownerBlocked };
  }

  const tombstoneEmail = `deleted+${dbUser.id}@deleted.termcatch.local`;

  try {
    await prisma.$transaction([
      // Personal data with no third-party claim on it.
      prisma.notification.deleteMany({ where: { userId: dbUser.id } }),
      prisma.pushToken.deleteMany({ where: { userId: dbUser.id } }),
      prisma.favouriteBusiness.deleteMany({ where: { userId: dbUser.id } }),
      prisma.aiConversation.deleteMany({ where: { userId: dbUser.id } }),
      prisma.membership.deleteMany({ where: { userId: dbUser.id } }),
      prisma.medicalProfile.deleteMany({ where: { userId: dbUser.id } }),

      // Detach from any salon roster without deleting the salon's record of
      // the shifts that person worked.
      prisma.employee.updateMany({ where: { userId: dbUser.id }, data: { userId: null, isActive: false } }),

      // The tombstone. Unique columns get deterministic placeholders so the
      // constraints still hold and the address can never be re-used to log in.
      prisma.user.update({
        where: { id: dbUser.id },
        data: {
          email: tombstoneEmail,
          phone: null,
          firstName: "—",
          lastName: "",
          avatarUrl: null,
          dateOfBirth: null,
          gender: null,
          isActive: false,
          emailNotifications: false,
          smsNotifications: false,
          whatsappNotifications: false,
          pushNotifications: false,
          marketingEmails: false,
        },
      }),
    ]);

    // Last, because it is the step that cannot be rolled back: once the auth
    // user is gone the session is dead and the caller is signed out.
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id).catch((err) => {
      // The Prisma side already succeeded, so the account is unusable either
      // way. Log loudly: this is the one leftover an operator must clean up.
      console.error("[account] supabase auth delete failed for", dbUser.id, err);
    });

    return { ok: true };
  } catch (err) {
    console.error("[account] delete failed:", err);
    return { ok: false, error: T.failed };
  }
}
