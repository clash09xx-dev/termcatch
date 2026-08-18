"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { autoPublishIfComplete } from "@/lib/publish";
import { assertCanAddEmployee } from "@/lib/entitlement-guard";
import { PlanLimitError, type PlanLimitInfo } from "@/lib/entitlements";
import type { DayOfWeek, Prisma } from "@prisma/client";

/** Discriminated result so the client can show the upgrade dialog on a limit hit. */
export type StaffMutationResult = { ok: true } | { ok: false; limit: PlanLimitInfo };

async function getBusinessId(): Promise<string> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");
  return business.id;
}

export type EmployeeFormData = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  color?: string;
  isActive?: boolean;
  /** Public booking visibility — offered for new online bookings. */
  isAccepting?: boolean;
  serviceIds?: string[];
};

/**
 * WHY THERE IS NO createEmployee HERE ANY MORE
 *
 * Owners used to type a name into a form and get a specialist. That produced
 * rows nobody owned: a "Anna K." on the public profile who had never heard of
 * TermCatch, taking a seat against the plan limit, with an e-mail field the
 * owner had guessed. The person it described could not correct it, could not
 * see their own calendar, and could not leave.
 *
 * A specialist is a real account now, and there is exactly one way to become
 * one: they apply with the salon's join code and the owner approves
 * (lib/actions/join-requests approveJoinRequest). That is the only place an
 * Employee row is created, which is also the only place the plan limit has to
 * be enforced.
 *
 * What owners kept: editing everything salon-side about an approved specialist
 * (below), removing them, and the pre-existing e-mail invitation flow for rows
 * that already exist.
 */

// Only service ids that truly belong to this business (blocks assigning another
// business's service to an employee).
async function ownedServiceIds(
  tx: Prisma.TransactionClient,
  businessId: string,
  serviceIds: string[]
): Promise<string[]> {
  const unique = [...new Set(serviceIds)];
  if (unique.length === 0) return [];
  const rows = await tx.service.findMany({ where: { businessId, id: { in: unique } }, select: { id: true } });
  return rows.map((r) => r.id);
}

/**
 * Edit a specialist's SALON-SIDE record.
 *
 * WHAT AN OWNER MAY CHANGE, AND WHY THE LINE IS HERE
 * Everything this writes belongs to the salon: how the person is presented on
 * the salon's public profile (name shown, title, bio, photo, colour), what they
 * are booked for (services), and whether they are on the team and offered
 * online (isActive / isAccepting). None of it is account data — this action
 * never touches the `users` table, so an owner cannot reach a password, an
 * e-mail login, a phone used for auth, or anything the person does as a
 * CUSTOMER of other salons. Credentials live in Supabase auth and are not
 * writable from the product at all.
 *
 * CONTACT FIELDS ON A LINKED ACCOUNT
 * `email`/`phone` on the Employee row are the salon's copy of how to reach the
 * person. For an unlinked legacy row they are the only contact there is, so the
 * owner owns them. Once the row is linked to a real account they duplicate
 * details the person maintains themselves, and letting the owner overwrite them
 * silently would put wrong contact data under someone else's name — so for a
 * linked specialist they are ignored here and shown read-only in the UI.
 */
export async function updateEmployee(id: string, data: Partial<EmployeeFormData>): Promise<StaffMutationResult> {
  const businessId = await getBusinessId();
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.employee.findFirst({
        where: { id, businessId },
        select: { isActive: true, userId: true },
      });
      if (!current) throw new Error("Nie znaleziono pracownika lub brak uprawnień.");
      // Guard ONLY a genuine reactivation (inactive → active); editing an already
      // active employee is never blocked (downgrade-safe: existing data stays editable).
      if (data.isActive === true && !current.isActive) {
        await assertCanAddEmployee(tx, businessId, id);
      }
      // A linked specialist's own contact details are theirs to maintain.
      const linked = current.userId !== null;
      // ABSENT ≠ CLEARED. This action takes a Partial, and callers use that:
      // the visibility toggle sends `{ isActive }` and nothing else. The
      // nullable fields used to be written unconditionally as
      // `data.title?.trim() || null`, which for an absent key evaluates to
      // null — so hiding a specialist silently wiped their job title, bio and
      // contact details. Each nullable field is now written only when the
      // caller actually sent it; an empty string still clears it, because that
      // is a real edit.
      await tx.employee.updateMany({
        where: { id, businessId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          ...(linked || data.email === undefined ? {} : { email: data.email || null }),
          ...(linked || data.phone === undefined ? {} : { phone: data.phone || null }),
          ...(data.title !== undefined ? { title: data.title.trim() || null } : {}),
          ...(data.bio !== undefined ? { bio: data.bio.trim() || null } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
          color: data.color,
          isActive: data.isActive,
          isAccepting: data.isAccepting,
        },
      });
      if (data.serviceIds !== undefined) {
        await tx.employeeService.deleteMany({ where: { employeeId: id } });
        const ids = await ownedServiceIds(tx, businessId, data.serviceIds);
        if (ids.length > 0) {
          await tx.employeeService.createMany({
            data: ids.map((serviceId) => ({ employeeId: id, serviceId })),
            skipDuplicates: true,
          });
        }
      }
    });
  } catch (e) {
    if (e instanceof PlanLimitError) return { ok: false, limit: e.info };
    throw e;
  }
  await autoPublishIfComplete(businessId);
  revalidatePath("/business/staff");
  revalidatePath("/search");
  return { ok: true };
}

export async function deleteEmployee(id: string) {
  const businessId = await getBusinessId();

  await prisma.employee.deleteMany({
    where: { id, businessId },
  });

  revalidatePath("/business/staff");
}

export async function toggleEmployeeActive(id: string): Promise<StaffMutationResult> {
  const businessId = await getBusinessId();
  try {
    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findFirst({ where: { id, businessId }, select: { isActive: true } });
      if (!employee) throw new Error("Nie znaleziono pracownika lub brak uprawnień.");
      // Reactivating (inactive → active) must respect the plan limit.
      if (!employee.isActive) await assertCanAddEmployee(tx, businessId, id);
      await tx.employee.update({ where: { id }, data: { isActive: !employee.isActive } });
    });
  } catch (e) {
    if (e instanceof PlanLimitError) return { ok: false, limit: e.info };
    throw e;
  }
  await autoPublishIfComplete(businessId);
  revalidatePath("/business/staff");
  revalidatePath("/search");
  return { ok: true };
}

// ── Per-specialist schedule ──────────────────────────────────────────────────

export type EmployeeDayInput = {
  dayOfWeek: DayOfWeek;
  isWorking: boolean;
  startTime: string;
  endTime: string;
};

const DAY_VALUES: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Replace a specialist's weekly schedule.
 *
 * WHY THIS EXISTS
 * `EmployeeWorkingHours` has been read by the availability engine all along —
 * a specialist's own hours narrow the bookable window inside the salon's
 * opening hours — but nothing in the product ever WROTE it. Every specialist
 * therefore fell back to full salon hours, and the employee profile page said
 * "your profile data is changed by the owner in the team panel" about a screen
 * that had no such control. This is that control.
 *
 * SEMANTICS THE ENGINE ALREADY IMPLEMENTS (lib/availability):
 *   - no rows at all      → the specialist follows salon opening hours
 *   - a row, isWorking    → the window is the INTERSECTION with salon hours
 *   - a row, not working  → no slots that day
 * So "clear the schedule" is expressed by writing no rows, not by writing seven
 * closed days — the two mean opposite things and the difference is easy to get
 * backwards.
 *
 * Validation is server-side because the client can be bypassed: a malformed
 * "25:99" or an end before its start would silently produce a day that can
 * never be booked.
 */
export async function updateEmployeeWorkingHours(
  employeeId: string,
  days: EmployeeDayInput[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const businessId = await getBusinessId();

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, businessId },
    select: { id: true },
  });
  if (!employee) return { ok: false, error: "Nie znaleziono pracownika lub brak uprawnień." };

  const seen = new Set<DayOfWeek>();
  const clean: EmployeeDayInput[] = [];
  for (const d of days ?? []) {
    if (!d || !DAY_VALUES.includes(d.dayOfWeek)) continue;
    if (seen.has(d.dayOfWeek)) continue;
    seen.add(d.dayOfWeek);
    if (!d.isWorking) {
      clean.push({ dayOfWeek: d.dayOfWeek, isWorking: false, startTime: "09:00", endTime: "17:00" });
      continue;
    }
    if (!HHMM.test(d.startTime) || !HHMM.test(d.endTime)) {
      return { ok: false, error: "Nieprawidłowa godzina." };
    }
    if (toMinutes(d.endTime) <= toMinutes(d.startTime)) {
      return { ok: false, error: "Koniec pracy musi być po jej rozpoczęciu." };
    }
    clean.push({ ...d, isWorking: true });
  }

  await prisma.$transaction(async (tx) => {
    // Replace wholesale: the form always submits the full week, so a day the
    // owner switched off must disappear rather than linger from a prior save.
    await tx.employeeWorkingHours.deleteMany({ where: { employeeId } });
    if (clean.length > 0) {
      await tx.employeeWorkingHours.createMany({
        data: clean.map((d) => ({
          employeeId,
          dayOfWeek: d.dayOfWeek,
          isWorking: d.isWorking,
          startTime: d.startTime,
          endTime: d.endTime,
        })),
      });
    }
  });

  revalidatePath("/business/staff");
  revalidatePath("/business/calendar");
  revalidatePath("/employee/profile");
  return { ok: true };
}
