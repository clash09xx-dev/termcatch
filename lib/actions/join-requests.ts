"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getServerI18n } from "@/lib/i18n/server";
import { assertCanAddEmployee } from "@/lib/entitlement-guard";
import { PlanLimitError, type PlanLimitInfo } from "@/lib/entitlements";
import { autoPublishIfComplete } from "@/lib/publish";
import {
  notifyApplicantApproved,
  notifyApplicantRejected,
  notifyPlanLimitBlocked,
} from "@/lib/employee/join-notifications";

/**
 * The owner's half of the join flow: approve or reject a specialist who applied
 * with the salon's code.
 *
 * THIS IS WHERE MEMBERSHIP IS CREATED
 * A join code produces a PENDING request and nothing else (see
 * lib/actions/join-code.ts). Approval here is the single write that turns an
 * application into an Employee row — which is what every other surface reads as
 * membership: the salon panel gate, the Client/Salon switch, the public team
 * list, the booking capacity count. One creation point, so there is one place
 * where the plan limit can be enforced and one place a bug could hide.
 *
 * THIS IS ALSO WHERE THE PLAN LIMIT IS ENFORCED
 * Not at application time. An applicant must not be turned away because the
 * salon happened to be full on the day they typed the code — the owner may be
 * about to upgrade, or about to remove someone. The limit is a fact about the
 * moment a seat is actually taken, so it is checked in the same transaction
 * that takes it, under the row lock assertCanAddEmployee acquires.
 *
 * TENANCY
 * Every query is scoped by `ctx.businessId`, resolved from the authenticated
 * session. Passing another salon's request id finds nothing rather than
 * touching it — there is no code path where a request id alone names a salon.
 */

type OwnerCtx = { userId: string; businessId: string; businessName: string };

async function ownerCtx(): Promise<OwnerCtx | null> {
  const user = await getServerUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, ownedBusinesses: { take: 1, select: { id: true, name: true } } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!dbUser || !business) return null;
  return { userId: dbUser.id, businessId: business.id, businessName: business.name };
}

/**
 * Approval outcome. A limit hit is a distinct case, not a generic failure — the
 * caller shows the upgrade dialog for it, an error message for anything else.
 * (Discriminate with `"limit" in result`; a "use server" module may only export
 * async functions, so the type guard lives with the caller.)
 */
export type JoinDecisionResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; limit: PlanLimitInfo };

/**
 * Approve a pending request: create (or adopt) the Employee row, link it to the
 * applicant's real account, and record the decision.
 *
 * ALL OR NOTHING
 * The row, the request status and the role upgrade happen in ONE transaction,
 * so a plan-limit rejection cannot leave a half-built membership behind — no
 * Employee row without an approved request, no approved request without a row.
 *
 * CONCURRENCY
 * Two owners (or two tabs) approving at once are serialized by claiming the
 * request first: the `status: "PENDING"` filter on the update means exactly one
 * caller sees `count === 1` and the other aborts. Two DIFFERENT requests racing
 * for the last seat are serialized by the `FOR UPDATE` lock that
 * assertCanAddEmployee takes on the business row, so they cannot both count the
 * same pre-approval total and both pass.
 */
export async function approveJoinRequest(requestId: string): Promise<JoinDecisionResult> {
  const { dict } = await getServerI18n();
  const ctx = await ownerCtx();
  if (!ctx) return { ok: false, error: dict.errors.forbidden };

  const request = await prisma.employeeJoinRequest.findFirst({
    where: { id: String(requestId), businessId: ctx.businessId, status: "PENDING" },
    select: {
      id: true,
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
    },
  });
  if (!request) return { ok: false, error: dict.pages.staff.requestGone };

  const applicant = request.user;
  const applicantName = `${applicant.firstName} ${applicant.lastName}`.trim();

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the request. A second caller finds count === 0 and stops here,
      // before any employee row is created.
      const claimed = await tx.employeeJoinRequest.updateMany({
        where: { id: request.id, businessId: ctx.businessId, status: "PENDING" },
        data: { status: "APPROVED", decidedAt: new Date(), decidedBy: ctx.userId, blockedAt: null },
      });
      if (claimed.count === 0) throw new Error("request_gone");

      // Reuse, never duplicate. Three cases, in order of how specific they are:
      //   1. a row already linked to this account (deactivated earlier, say)
      //   2. an unlinked row the owner created by e-mail before this flow
      //      existed — adopt it so the person's history stays theirs
      //   3. nothing yet — create it
      const linked = await tx.employee.findFirst({
        where: { businessId: ctx.businessId, userId: applicant.id },
        select: { id: true, isActive: true },
      });
      const adoptable = linked
        ? null
        : applicant.email
          ? await tx.employee.findFirst({
              where: { businessId: ctx.businessId, userId: null, email: applicant.email },
              select: { id: true, isActive: true },
            })
          : null;

      // Row lock + active-specialist count. Throws PlanLimitError, which rolls
      // the whole transaction back including the claim above.
      //
      // `excludeId` matters for the row this approval is about to (re)activate:
      // without it, an already-active row would be counted once as an existing
      // specialist and once as the one being added, so the last seat on a plan
      // would look taken when it is not.
      const reusing = linked ?? adoptable;
      await assertCanAddEmployee(tx, ctx.businessId, reusing?.id);

      let employeeId: string;
      if (linked) {
        await tx.employee.update({ where: { id: linked.id }, data: { isActive: true } });
        employeeId = linked.id;
      } else if (adoptable) {
        await tx.employee.update({
          where: { id: adoptable.id },
          data: { userId: applicant.id, isActive: true },
        });
        employeeId = adoptable.id;
      } else {
        const created = await tx.employee.create({
          data: {
            businessId: ctx.businessId,
            userId: applicant.id,
            firstName: applicant.firstName,
            lastName: applicant.lastName,
            email: applicant.email,
            phone: applicant.phone,
            // On the team immediately, but not yet offered for online booking:
            // the owner assigns services and hours first, then flips this on.
            isActive: true,
            isAccepting: false,
          },
        });
        employeeId = created.id;
      }

      await tx.employeeJoinRequest.update({
        where: { id: request.id },
        data: { employeeId },
      });

      // Only ever an upgrade from plain customer. Never a demotion, never owner.
      // The role is a coarse label; the Employee row is the actual membership.
      if (applicant.role === "CUSTOMER") {
        await tx.user.update({ where: { id: applicant.id }, data: { role: "EMPLOYEE" } });
      }
    });
  } catch (e) {
    if (e instanceof PlanLimitError) {
      // The transaction rolled back, so the request is still PENDING and no
      // Employee row was created. Record the attempt and tell BOTH sides why —
      // outside the rolled-back transaction, or the note would vanish with it.
      await prisma.employeeJoinRequest
        .updateMany({
          where: { id: request.id, businessId: ctx.businessId, status: "PENDING" },
          data: { blockedAt: new Date() },
        })
        .catch(() => null);
      await notifyPlanLimitBlocked({
        applicantUserId: applicant.id,
        applicantName,
        ownerUserId: ctx.userId,
        businessId: ctx.businessId,
        businessName: ctx.businessName,
        planLabel: e.info.planLabel,
        limit: e.info.limit,
      });
      revalidatePath("/business/staff");
      revalidatePath("/customer/profile");
      return { ok: false, limit: e.info };
    }
    if (e instanceof Error && e.message === "request_gone") {
      return { ok: false, error: dict.pages.staff.requestGone };
    }
    throw e;
  }

  await notifyApplicantApproved({
    applicantUserId: applicant.id,
    businessId: ctx.businessId,
    businessName: ctx.businessName,
  });

  // A new active specialist can complete the salon's profile requirements.
  await autoPublishIfComplete(ctx.businessId);

  // The specialist's SHELL changes, not just a page: the Client/Salon switch
  // lives in the customer and employee layouts, and /employee only became
  // reachable a moment ago. Revalidating pages alone would leave the cached
  // layouts showing the pre-approval state — the exact failure the join flow
  // had before, where membership existed and nothing on screen knew it.
  revalidatePath("/business/staff");
  revalidatePath("/search");
  revalidatePath("/customer", "layout");
  revalidatePath("/employee", "layout");
  return { ok: true };
}

/**
 * Decline a pending request.
 *
 * Not a ban: the row stays so the owner's queue does not re-fill with the same
 * application on the applicant's next page load, but the person can apply again
 * (lib/employee/membership canReapply) if the owner changes their mind or the
 * click was a mistake.
 */
export async function rejectJoinRequest(requestId: string): Promise<JoinDecisionResult> {
  const { dict } = await getServerI18n();
  const ctx = await ownerCtx();
  if (!ctx) return { ok: false, error: dict.errors.forbidden };

  const request = await prisma.employeeJoinRequest.findFirst({
    where: { id: String(requestId), businessId: ctx.businessId, status: "PENDING" },
    select: { id: true, userId: true },
  });
  if (!request) return { ok: false, error: dict.pages.staff.requestGone };

  const rejected = await prisma.employeeJoinRequest.updateMany({
    where: { id: request.id, businessId: ctx.businessId, status: "PENDING" },
    data: { status: "REJECTED", decidedAt: new Date(), decidedBy: ctx.userId, blockedAt: null },
  });
  if (rejected.count === 0) return { ok: false, error: dict.pages.staff.requestGone };

  await notifyApplicantRejected({
    applicantUserId: request.userId,
    businessId: ctx.businessId,
    businessName: ctx.businessName,
  });

  revalidatePath("/business/staff");
  revalidatePath("/customer/profile");
  return { ok: true };
}
