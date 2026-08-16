"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { generateInviteToken, hashInviteToken } from "@/lib/employee/invite-token";
import { inviteExpiry, isAcceptable, effectiveStatus, INVITE_STATUS_LABEL } from "@/lib/employee/invite-status";
import { sendEmployeeInvitationEmail, sendEmployeeInvitationAcceptedEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com";

async function ownerCtx(): Promise<{ userId: string; businessId: string; businessName: string } | null> {
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

export type InviteResult = {
  ok: boolean;
  error?: string;
  /**
   * Whether the invitation e-mail actually left the building.
   *
   * `sendEmail` degrades gracefully to `{ sent: false }` when RESEND_API_KEY is
   * absent, and this action used to discard that and report success anyway. The
   * owner pressed "Invite to <salon>", got a green toast, and nothing ever
   * reached the specialist: the one visible symptom of the button "not doing
   * anything". The caller now knows, and points the owner at the join code,
   * which needs no mail server.
   */
  delivered?: boolean;
};

/** Owner invites (or re-invites) an existing Employee record by email. Owner-only. */
export async function inviteEmployee(employeeId: string): Promise<InviteResult> {
  const ctx = await ownerCtx();
  if (!ctx) return { ok: false, error: "Brak dostępu." };

  const emp = await prisma.employee.findFirst({
    where: { id: String(employeeId), businessId: ctx.businessId },
    select: { id: true, userId: true, email: true, firstName: true, lastName: true },
  });
  if (!emp) return { ok: false, error: "Nie znaleziono pracownika w Twoim salonie." };
  if (emp.userId) return { ok: false, error: "Ten pracownik ma już aktywne konto." };
  if (!emp.email) return { ok: false, error: "Dodaj adres e-mail pracownika, aby wysłać zaproszenie." };

  // One active invite at a time — supersede any pending one (also covers resend).
  await prisma.employeeInvitation.updateMany({
    where: { employeeId: emp.id, status: "pending" },
    data: { status: "revoked" },
  });

  const token = generateInviteToken();
  await prisma.employeeInvitation.create({
    data: {
      businessId: ctx.businessId, employeeId: emp.id, email: emp.email.toLowerCase(),
      tokenHash: hashInviteToken(token), expiresAt: inviteExpiry(), invitedBy: ctx.userId,
    },
  });
  // The invitation row is real either way — the link works the moment someone
  // holds it — so a failed send is reported, not treated as a failed invite.
  const { sent } = await sendEmployeeInvitationEmail({
    to: emp.email, employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
    businessName: ctx.businessName, url: `${APP_URL}/invite/${token}`,
  });
  revalidatePath("/business/staff");
  return { ok: true, delivered: sent };
}

/** Resend = supersede the old pending invite and send a fresh one. Owner-only. */
export async function resendInvitation(employeeId: string): Promise<InviteResult> {
  return inviteEmployee(employeeId);
}

/** Revoke any pending invitation for an employee. Owner-only. */
export async function revokeInvitation(employeeId: string): Promise<InviteResult> {
  const ctx = await ownerCtx();
  if (!ctx) return { ok: false, error: "Brak dostępu." };
  await prisma.employeeInvitation.updateMany({
    where: { employeeId: String(employeeId), businessId: ctx.businessId, status: "pending" },
    data: { status: "revoked" },
  });
  revalidatePath("/business/staff");
  return { ok: true };
}

export type InvitePreview =
  | { ok: true; employeeName: string; businessName: string; email: string }
  | { ok: false; error: string };

/** Public: preview an invitation by raw token (for the activation page). */
export async function getInvitationPreview(token: string): Promise<InvitePreview> {
  const inv = await prisma.employeeInvitation.findUnique({
    where: { tokenHash: hashInviteToken(String(token)) },
    select: { status: true, expiresAt: true, acceptedAt: true, email: true, employeeId: true, businessId: true },
  });
  if (!inv) return { ok: false, error: "Nieprawidłowe zaproszenie." };
  if (!isAcceptable(inv)) return { ok: false, error: INVITE_STATUS_LABEL[effectiveStatus(inv)] };
  const [emp, biz] = await Promise.all([
    prisma.employee.findUnique({ where: { id: inv.employeeId }, select: { firstName: true, lastName: true } }),
    prisma.business.findUnique({ where: { id: inv.businessId }, select: { name: true } }),
  ]);
  return { ok: true, employeeName: emp ? `${emp.firstName} ${emp.lastName}`.trim() : "", businessName: biz?.name ?? "", email: inv.email };
}

/**
 * Public: accept an invitation — creates the employee's own auth account, links
 * Employee.userId (no duplicate record), marks the invite used, signs in, and
 * routes to the employee dashboard. Never grants owner permissions.
 */
export async function acceptInvitation(token: string, password: string): Promise<{ ok: false; error: string }> {
  const raw = String(token);
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "Hasło musi mieć co najmniej 8 znaków." };
  }
  const inv = await prisma.employeeInvitation.findUnique({ where: { tokenHash: hashInviteToken(raw) } });
  if (!inv || !isAcceptable(inv)) return { ok: false, error: "Zaproszenie jest nieprawidłowe, wygasło lub zostało już użyte." };

  const emp = await prisma.employee.findUnique({
    where: { id: inv.employeeId },
    select: { id: true, userId: true, firstName: true, lastName: true },
  });
  if (!emp) return { ok: false, error: "Nie znaleziono pracownika." };
  if (emp.userId) return { ok: false, error: "To konto zostało już aktywowane. Zaloguj się." };

  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email: inv.email,
    password,
    email_confirm: true,
    user_metadata: { role: "EMPLOYEE", firstName: emp.firstName, lastName: emp.lastName },
  });
  if (created.error || !created.data.user) {
    return { ok: false, error: "Nie udało się utworzyć konta — ten e-mail może być już zajęty." };
  }
  const supabaseId = created.data.user.id;

  try {
    const dbUser = await prisma.user.upsert({
      where: { supabaseId },
      create: { supabaseId, email: inv.email, firstName: emp.firstName, lastName: emp.lastName, role: "EMPLOYEE", isVerified: true },
      update: { role: "EMPLOYEE" },
      select: { id: true },
    });
    await prisma.employee.update({ where: { id: emp.id }, data: { userId: dbUser.id } });
    await prisma.employeeInvitation.update({ where: { id: inv.id }, data: { status: "accepted", acceptedAt: new Date() } });
  } catch {
    // Roll back the auth user so a partial link can't strand the account.
    await admin.auth.admin.deleteUser(supabaseId).catch(() => {});
    return { ok: false, error: "Nie udało się połączyć konta z profilem pracownika." };
  }

  const biz = await prisma.business.findUnique({ where: { id: inv.businessId }, select: { name: true } });
  await sendEmployeeInvitationAcceptedEmail({ to: inv.email, employeeName: `${emp.firstName} ${emp.lastName}`.trim(), businessName: biz?.name ?? "" }).catch(() => {});

  // Sign in (sets the session cookie), then route to the employee dashboard.
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: inv.email, password });
  redirect("/employee/dashboard");
}
