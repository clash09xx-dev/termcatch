export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { googleCalendarConfigured } from "@/lib/calendar/google-config";
import { isPlatformAdmin } from "@/lib/is-admin";
import { CalendarSyncClient } from "./calendar-sync-client";

/**
 * Calendar synchronization settings.
 *
 * Owner-scoped: the page lists every connection in the salon, including one row
 * per specialist. It shows STATUS only — never a colleague's event contents,
 * which the server never fetches for this view in the first place.
 */

export type ConnectionView = {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  accountEmail: string | null;
  calendarId: string | null;
  calendarSummary: string | null;
  status: string;
  readBusy: boolean;
  writeEvents: boolean;
  lastSyncedAt: string | null;
};

export type EmployeeView = {
  id: string;
  name: string;
  connection: ConnectionView | null;
};

export default async function CalendarSyncPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      ownedBusinesses: {
        take: 1,
        select: {
          id: true,
          employees: {
            where: { isActive: true },
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  // Tokens are deliberately NOT selected: this view never needs them, so they
  // never enter the render tree and cannot leak into serialized props.
  const connections = await prisma.calendarConnection.findMany({
    where: { businessId: business.id, provider: "google" },
    select: {
      id: true,
      employeeId: true,
      accountEmail: true,
      calendarId: true,
      calendarSummary: true,
      status: true,
      readBusy: true,
      writeEvents: true,
      lastSyncedAt: true,
    },
  });

  const byEmployee = new Map(connections.filter((c) => c.employeeId).map((c) => [c.employeeId!, c]));
  const salonWide = connections.find((c) => c.employeeId === null) ?? null;

  const toView = (c: (typeof connections)[number], employeeName: string | null): ConnectionView => ({
    id: c.id,
    employeeId: c.employeeId,
    employeeName,
    accountEmail: c.accountEmail,
    calendarId: c.calendarId,
    calendarSummary: c.calendarSummary,
    status: c.status,
    readBusy: c.readBusy,
    writeEvents: c.writeEvents,
    lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
  });

  const employees: EmployeeView[] = business.employees.map((e) => {
    const name = `${e.firstName} ${e.lastName}`.trim();
    const conn = byEmployee.get(e.id);
    return { id: e.id, name, connection: conn ? toView(conn, name) : null };
  });

  return (
    <CalendarSyncClient
      configured={googleCalendarConfigured()}
      // Which env vars are missing is useful to whoever can fix it and noise to
      // a salon owner, so the technical line is admin-only. Names of variables,
      // never values: the page must stay safe to screenshot.
      showSetupDetail={await isPlatformAdmin()}
      salonWide={salonWide ? toView(salonWide, null) : null}
      employees={employees}
    />
  );
}
