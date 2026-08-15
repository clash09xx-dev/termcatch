import "server-only";

import { prisma } from "@/lib/prisma";
import { createEvent, deleteEvent, updateEvent } from "./google-client";
import { googleCalendarConfigured } from "./google-config";

/**
 * TermCatch → Google Calendar mirroring.
 *
 * Runs from the `after()` block that already carries every other post-booking
 * side effect (emails, SMS, notifications), so it is outside the transaction
 * and off the response path. Two consequences follow, both intentional:
 *
 *   - a slow Google never delays a booking confirmation
 *   - a failing Google never rolls back a valid appointment
 *
 * A failure is recorded on the link row (syncState "failed" plus a short code)
 * and on the connection ("Action required" in the UI), so the salon can see it
 * and a retry can pick it up. Nothing here ever throws into the caller.
 *
 * IDEMPOTENCY. Every write goes through the unique (appointmentId,
 * connectionId) row: if a link already exists we PATCH that event, otherwise we
 * create one and store the id. A retried or duplicated call therefore updates
 * the same Google event instead of creating a second copy.
 */

/** What the mirrored event says. Deliberately minimal — see privacy note. */
export type MirrorPayload = {
  appointmentId: string;
  businessId: string;
  employeeId: string | null;
  startIso: string;
  endIso: string;
  timeZone: string;
  /** e.g. "Strzyżenie — TermCatch". */
  summary: string;
  /** Optional short line; never the client's contact details. */
  description?: string;
};

type TargetConnection = { id: string; calendarId: string };

/**
 * Which calendars this appointment should be written to.
 *
 * The assigned specialist's calendar when there is one, otherwise the
 * salon-wide connection. Never both for the same appointment: writing an
 * appointment into two calendars would make it occupy two units of capacity on
 * the way back in.
 */
async function targetsFor(businessId: string, employeeId: string | null): Promise<TargetConnection[]> {
  const rows = await prisma.calendarConnection.findMany({
    where: {
      businessId,
      provider: "google",
      status: "connected",
      writeEvents: true,
      calendarId: { not: null },
      ...(employeeId ? { employeeId } : { employeeId: null }),
    },
    select: { id: true, calendarId: true },
  });

  const usable = rows.filter((r): r is typeof r & { calendarId: string } => Boolean(r.calendarId));
  if (usable.length > 0 || !employeeId) {
    return usable.map((r) => ({ id: r.id, calendarId: r.calendarId }));
  }

  // The specialist has no connection of their own — fall back to the
  // salon-wide calendar so the appointment is still visible somewhere.
  const salonWide = await prisma.calendarConnection.findFirst({
    where: {
      businessId,
      provider: "google",
      employeeId: null,
      status: "connected",
      writeEvents: true,
      calendarId: { not: null },
    },
    select: { id: true, calendarId: true },
  });
  return salonWide?.calendarId ? [{ id: salonWide.id, calendarId: salonWide.calendarId }] : [];
}

async function recordFailure(appointmentId: string, connectionId: string, code: string): Promise<void> {
  await prisma.appointmentCalendarEvent
    .updateMany({
      where: { appointmentId, connectionId },
      data: { syncState: "failed", lastError: code },
    })
    .catch(() => {});
}

/**
 * Create or update the mirror for an appointment.
 *
 * Safe to call repeatedly — that is the point. Used for a new booking and for
 * every reschedule; a reschedule patches the existing event rather than
 * creating a second one at the new time.
 */
export async function syncAppointmentToCalendars(payload: MirrorPayload): Promise<void> {
  if (!googleCalendarConfigured()) return;

  let targets: TargetConnection[];
  try {
    targets = await targetsFor(payload.businessId, payload.employeeId);
  } catch {
    return;
  }
  if (targets.length === 0) return;

  await Promise.allSettled(
    targets.map(async (target) => {
      const existing = await prisma.appointmentCalendarEvent.findUnique({
        where: {
          appointmentId_connectionId: { appointmentId: payload.appointmentId, connectionId: target.id },
        },
        select: { id: true, externalEventId: true },
      });

      const input = {
        appointmentId: payload.appointmentId,
        summary: payload.summary,
        description: payload.description,
        startIso: payload.startIso,
        endIso: payload.endIso,
        timeZone: payload.timeZone,
      };

      if (existing) {
        const res = await updateEvent(target.id, target.calendarId, existing.externalEventId, input);
        if (res === "ok") {
          await prisma.appointmentCalendarEvent.update({
            where: { id: existing.id },
            data: { syncState: "synced", lastError: null, syncedAt: new Date() },
          });
          return;
        }
        if (res === "failed") {
          await recordFailure(payload.appointmentId, target.id, "update_failed");
          return;
        }
        // "gone": the user deleted our event by hand. Drop the stale link and
        // fall through to create a fresh one, rather than retrying forever.
        await prisma.appointmentCalendarEvent.delete({ where: { id: existing.id } }).catch(() => {});
      }

      const eventId = await createEvent(target.id, target.calendarId, input);
      if (!eventId) {
        // Upsert the failure so a retry job can find it even on first attempt.
        await prisma.appointmentCalendarEvent
          .upsert({
            where: {
              appointmentId_connectionId: {
                appointmentId: payload.appointmentId,
                connectionId: target.id,
              },
            },
            create: {
              appointmentId: payload.appointmentId,
              connectionId: target.id,
              externalEventId: "",
              externalCalendarId: target.calendarId,
              syncState: "failed",
              lastError: "create_failed",
            },
            update: { syncState: "failed", lastError: "create_failed" },
          })
          .catch(() => {});
        return;
      }

      await prisma.appointmentCalendarEvent
        .upsert({
          where: {
            appointmentId_connectionId: {
              appointmentId: payload.appointmentId,
              connectionId: target.id,
            },
          },
          create: {
            appointmentId: payload.appointmentId,
            connectionId: target.id,
            externalEventId: eventId,
            externalCalendarId: target.calendarId,
            syncState: "synced",
            syncedAt: new Date(),
          },
          update: {
            externalEventId: eventId,
            externalCalendarId: target.calendarId,
            syncState: "synced",
            lastError: null,
            syncedAt: new Date(),
          },
        })
        .catch(() => {});
    }),
  );
}

/**
 * Remove the mirror when an appointment is cancelled.
 *
 * Deleting rather than marking cancelled: a cancelled TermCatch appointment
 * must stop occupying the specialist's time, and an event left behind would go
 * on blocking that slot on the next busy read. The link row is kept with state
 * "deleted" when Google refuses, so the leftover is visible instead of lost.
 */
export async function removeAppointmentFromCalendars(appointmentId: string): Promise<void> {
  if (!googleCalendarConfigured()) return;

  let links: { id: string; connectionId: string; externalEventId: string; externalCalendarId: string | null }[];
  try {
    links = await prisma.appointmentCalendarEvent.findMany({
      where: { appointmentId, syncState: { not: "deleted" } },
      select: { id: true, connectionId: true, externalEventId: true, externalCalendarId: true },
    });
  } catch {
    return;
  }
  if (links.length === 0) return;

  await Promise.allSettled(
    links.map(async (link) => {
      if (!link.externalEventId || !link.externalCalendarId) {
        // Nothing was ever created (a failed create). Just drop the link.
        await prisma.appointmentCalendarEvent.delete({ where: { id: link.id } }).catch(() => {});
        return;
      }

      const ok = await deleteEvent(link.connectionId, link.externalCalendarId, link.externalEventId);
      if (ok) {
        await prisma.appointmentCalendarEvent.delete({ where: { id: link.id } }).catch(() => {});
      } else {
        await prisma.appointmentCalendarEvent
          .update({ where: { id: link.id }, data: { syncState: "failed", lastError: "delete_failed" } })
          .catch(() => {});
      }
    }),
  );
}
