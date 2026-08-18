import "server-only";

import { prisma } from "@/lib/prisma";
import { getDictionary, interpolate } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";

/**
 * In-app notifications for the join-request flow.
 *
 * Reuses the ONE notification model the product already has (Notification with
 * channel = IN_APP, surfaced by lib/actions/notifications.ts and the bell) —
 * there is deliberately no second delivery system for this feature.
 *
 * LANGUAGE
 * A notification row stores rendered text, so it has to be written in the
 * language of whoever will READ it, not of whoever triggered it. An owner
 * running the panel in Polish approving a specialist whose account is in
 * Turkish must produce a Turkish notification. Every function here therefore
 * resolves the recipient's own `User.locale` and renders from that dictionary.
 *
 * NEVER THROWS
 * Notification delivery is a side effect of a membership decision, never a
 * precondition for it. If writing the row fails, the approval still stands and
 * the UI still says so — swallowing here is what keeps a mail/db hiccup from
 * rolling back a correct decision.
 */

type Recipient = { userId: string; locale: Locale };

async function recipient(userId: string): Promise<Recipient | null> {
  const u = await prisma.user
    .findUnique({ where: { id: userId }, select: { id: true, locale: true } })
    .catch(() => null);
  if (!u) return null;
  return { userId: u.id, locale: isLocale(u.locale) ? u.locale : "pl" };
}

async function send(params: {
  userId: string;
  businessId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        businessId: params.businessId,
        // SYSTEM is the existing catch-all type for account/product events; the
        // enum is not extended, so no migration rides on a notification.
        type: "SYSTEM",
        channel: "IN_APP",
        title: params.title,
        body: params.body,
        data: params.data,
        sentAt: new Date(),
      },
    });
  } catch {
    /* see NEVER THROWS above */
  }
}

/** The owner has a new application waiting. */
export async function notifyOwnerNewRequest(params: {
  ownerUserId: string;
  businessId: string;
  businessName: string;
  applicantName: string;
}): Promise<void> {
  const to = await recipient(params.ownerUserId);
  if (!to) return;
  const T = getDictionary(to.locale).joinNotifications;
  await send({
    userId: to.userId,
    businessId: params.businessId,
    title: T.ownerNewTitle,
    body: interpolate(T.ownerNewBody, { name: params.applicantName, salon: params.businessName }),
    data: { kind: "join_request", businessId: params.businessId },
  });
}

/** The applicant is on the team. */
export async function notifyApplicantApproved(params: {
  applicantUserId: string;
  businessId: string;
  businessName: string;
}): Promise<void> {
  const to = await recipient(params.applicantUserId);
  if (!to) return;
  const T = getDictionary(to.locale).joinNotifications;
  await send({
    userId: to.userId,
    businessId: params.businessId,
    title: interpolate(T.applicantApprovedTitle, { salon: params.businessName }),
    body: interpolate(T.applicantApprovedBody, { salon: params.businessName }),
    data: { kind: "join_approved", businessId: params.businessId },
  });
}

/** The owner declined. Says so plainly, without inventing a reason. */
export async function notifyApplicantRejected(params: {
  applicantUserId: string;
  businessId: string;
  businessName: string;
}): Promise<void> {
  const to = await recipient(params.applicantUserId);
  if (!to) return;
  const T = getDictionary(to.locale).joinNotifications;
  await send({
    userId: to.userId,
    businessId: params.businessId,
    title: T.applicantRejectedTitle,
    body: interpolate(T.applicantRejectedBody, { salon: params.businessName }),
    data: { kind: "join_rejected", businessId: params.businessId },
  });
}

/**
 * Approval was refused because the salon's plan is full.
 *
 * BOTH sides are told, because neither can act on the other's half: the
 * applicant would otherwise sit in a queue that silently cannot move, and the
 * owner would be the only one who knows why. The salon's REAL plan name is
 * passed in from the entitlement check — never a hardcoded tier — so the
 * message can be acted on ("upgrade from Professional") rather than just read.
 */
export async function notifyPlanLimitBlocked(params: {
  applicantUserId: string;
  applicantName: string;
  ownerUserId: string;
  businessId: string;
  businessName: string;
  planLabel: string;
  limit: number;
}): Promise<void> {
  const applicant = await recipient(params.applicantUserId);
  if (applicant) {
    const T = getDictionary(applicant.locale).joinNotifications;
    await send({
      userId: applicant.userId,
      businessId: params.businessId,
      title: T.limitApplicantTitle,
      body: interpolate(T.limitApplicantBody, { salon: params.businessName, plan: params.planLabel }),
      data: { kind: "join_limit", businessId: params.businessId },
    });
  }

  const owner = await recipient(params.ownerUserId);
  if (owner) {
    const T = getDictionary(owner.locale).joinNotifications;
    await send({
      userId: owner.userId,
      businessId: params.businessId,
      title: T.limitOwnerTitle,
      body: interpolate(T.limitOwnerBody, {
        name: params.applicantName,
        plan: params.planLabel,
        limit: params.limit,
      }),
      data: { kind: "join_limit_owner", businessId: params.businessId },
    });
  }
}
