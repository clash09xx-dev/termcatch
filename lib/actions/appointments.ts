"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppointmentStatus, NotificationType, Prisma } from "@prisma/client";
import { warsawDateTimeToUtc, warsawTimeString } from "@/lib/timezone";
import {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingRescheduleEmail,
  sendBookingTimeChangedEmail,
  sendNewBookingNotificationEmail,
  sendReviewRequestEmail,
  sendEmployeeAppointmentEmail,
} from "@/lib/email";
import { sendSms, sendWhatsApp } from "@/lib/messaging";
import { sendTransactionalSms, type SmsTemplate } from "@/lib/sms";
import { toLocale } from "@/lib/i18n/config";
import { bookingSmsBody, smsSlotLabel } from "@/lib/i18n/sms-templates";
import { getBusinessNotificationSettings, salonWants, type SalonEventKey } from "@/lib/notification-settings";
import { isPubliclyVisible } from "@/lib/publication";
import { getAppUrl } from "@/lib/app-url";
import { resolveBookingAddons, type AddonSelection } from "@/lib/booking-addons";
import { computeBookingTotals, evaluateCoupon } from "@/lib/booking-pricing";
import { isFutureStart, changeAllowedByPolicy } from "@/lib/appointment-rules";
import { assertCustomerBookableSlot } from "@/lib/availability";

/** SMS/WhatsApp to the salon per its per-event preferences — never throws. */
async function notifySalonChannels(businessId: string, message: string, event: SalonEventKey) {
  try {
    const { settings } = await getBusinessNotificationSettings(businessId);
    const jobs: Promise<boolean>[] = [];
    if (salonWants(settings, event, "sms")) jobs.push(sendSms(settings.smsPhone, message));
    if (settings.whatsappEnabled && settings.whatsappPhone) {
      jobs.push(sendWhatsApp(settings.whatsappPhone, message));
    }
    if (jobs.length) await Promise.allSettled(jobs);
  } catch (err) {
    console.error("[notifySalonChannels]", err);
  }
}

/** Salon email per its per-event preference (previously emailEnabled was never
 *  consulted). `send` builds the actual email. Never throws. */
async function notifySalonEmail(businessId: string, event: SalonEventKey, send: () => Promise<unknown>) {
  try {
    const { settings } = await getBusinessNotificationSettings(businessId);
    if (salonWants(settings, event, "email")) await send();
  } catch (err) {
    console.error("[notifySalonEmail]", err);
  }
}

/** Owner in-app notification per its per-event preference. Never throws. */
async function notifySalonInApp(
  businessId: string,
  event: SalonEventKey,
  params: { userId: string; type: NotificationType; title: string; body: string; data?: Record<string, string> }
) {
  try {
    const { settings } = await getBusinessNotificationSettings(businessId);
    if (salonWants(settings, event, "inApp")) await notify({ ...params, businessId });
  } catch (err) {
    console.error("[notifySalonInApp]", err);
  }
}
import { formatDate } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Serialize slot writes for one business so the "is the slot free? → insert"
 * sequence is atomic across concurrent requests — the guarantee a plain
 * SELECT-then-INSERT lacks under READ COMMITTED (which let two simultaneous
 * bookings take the same slot). Must be the FIRST statement inside the
 * transaction; the Postgres advisory lock auto-releases at transaction end.
 * Scoped per business (bookings are low-frequency, so coarse locking is fine).
 */
async function lockBusinessForBooking(tx: Prisma.TransactionClient, businessId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${businessId}, 0))`;
}

/**
 * Throw if the [start,end) slot isn't bookable. A SPECIFIC employee is one chair
 * (blocked by any overlap of theirs). "Dowolny specjalista" (employeeId null) is
 * blocked only when EVERY chair is taken — capacity = active accepting employees
 * (min 1, so a solo salon still books). Call inside the locked transaction so
 * the count + insert are atomic (no double-book / over-capacity race).
 */
async function assertSlotAvailable(
  tx: Prisma.TransactionClient,
  args: { businessId: string; employeeId: string | null; start: Date; end: Date; excludeId?: string }
): Promise<void> {
  const overlap = {
    ...(args.excludeId ? { id: { not: args.excludeId } } : {}),
    businessId: args.businessId,
    status: { notIn: [AppointmentStatus.CANCELLED_CUSTOMER, AppointmentStatus.CANCELLED_BUSINESS] },
    startTime: { lt: args.end },
    endTime: { gt: args.start },
  };
  if (args.employeeId) {
    const conflict = await tx.appointment.findFirst({
      where: { ...overlap, employeeId: args.employeeId },
      select: { id: true },
    });
    if (conflict) throw new Error("Ten termin jest już zajęty. Wybierz inną godzinę.");
    return;
  }
  const capacity = Math.max(
    1,
    await tx.employee.count({ where: { businessId: args.businessId, isActive: true, isAccepting: true } })
  );
  const concurrent = await tx.appointment.count({ where: overlap });
  if (concurrent >= capacity) throw new Error("Ten termin jest już zajęty. Wybierz inną godzinę.");
}

async function getDbUser() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });
  if (!dbUser) throw new Error("Nie znaleziono użytkownika w bazie danych.");
  return dbUser;
}

async function getOwnedBusinessId(): Promise<string> {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) throw new Error("Nie masz przypisanego biznesu.");
  return business.id;
}

async function notify(params: {
  userId: string;
  businessId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  // Soft idempotency: skip an identical in-app notification created in the last
  // 5 minutes so a retried event can't duplicate the row. (A hardened unique
  // dedupeKey column is a future schema addition.)
  const recent = await prisma.notification
    .findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        channel: "IN_APP",
        title: params.title,
        body: params.body,
        createdAt: { gte: new Date(Date.now() - 5 * 60_000) },
      },
      select: { id: true },
    })
    .catch(() => null);
  if (recent) return recent;

  return prisma.notification.create({
    data: {
      userId: params.userId,
      businessId: params.businessId ?? null,
      type: params.type,
      channel: "IN_APP",
      title: params.title,
      body: params.body,
      data: params.data,
      sentAt: new Date(),
    },
  });
}

/**
 * Notify the ASSIGNED employee about THEIR appointment (in-app if they have a
 * linked account, email if they have an address). Scoped to the one assigned
 * employee — "Dowolny specjalista" (no employeeId) is a no-op. Never throws.
 */
async function notifyAssignedEmployee(params: {
  employee: { userId: string | null; email: string | null } | null;
  businessId: string;
  businessName: string;
  serviceName: string;
  slotLabel: string;
  clientName: string;
  appointmentId: string;
  kind: "new" | "changed" | "cancelled";
}) {
  const e = params.employee;
  if (!e) return;
  const type: NotificationType =
    params.kind === "cancelled" ? "APPOINTMENT_CANCELLED"
    : params.kind === "changed" ? "APPOINTMENT_CONFIRMED"
    : "APPOINTMENT_BOOKED";
  const title =
    params.kind === "new" ? "Nowa wizyta w grafiku"
    : params.kind === "changed" ? "Zmiana terminu wizyty"
    : "Odwołana wizyta";
  const body = `${params.clientName} — ${params.serviceName}, ${params.slotLabel}.`;
  await Promise.allSettled([
    e.userId
      ? notify({ userId: e.userId, businessId: params.businessId, type, title, body, data: { appointmentId: params.appointmentId, link: "/employee/dashboard" } })
      : Promise.resolve(),
    e.email
      ? sendEmployeeAppointmentEmail({ to: e.email, businessName: params.businessName, serviceName: params.serviceName, slotLabel: params.slotLabel, clientName: params.clientName, kind: params.kind })
      : Promise.resolve(),
  ]);
}

/** Transactional booking SMS to the CUSTOMER — only with explicit opt-in
 * (User.smsNotifications) + a phone number; feature-gated and deduplicated
 * inside sendTransactionalSms. Never throws. */
function customerBookingSms(args: {
  customer: { phone: string | null; smsNotifications: boolean };
  appointmentId: string;
  template: SmsTemplate;
  body: string;
  dedupeSuffix?: string;
}): Promise<unknown> {
  if (!args.customer.smsNotifications || !args.customer.phone) return Promise.resolve();
  return sendTransactionalSms({
    toPhone: args.customer.phone,
    body: args.body,
    template: args.template,
    dedupeKey: `sms:${args.template}:${args.appointmentId}${args.dedupeSuffix ?? ""}`,
    appointmentId: args.appointmentId,
  }).catch(() => undefined);
}

function describeSlot(start: Date): string {
  return `${formatDate(start, { weekday: "long", day: "numeric", month: "long" })} o ${warsawTimeString(start)}`;
}

// ─── Input Types ──────────────────────────────────────────────

export type CreateAppointmentInput = {
  businessId: string;
  serviceId: string;
  employeeId?: string;
  /** Warsaw-local date "YYYY-MM-DD" */
  date: string;
  /** Warsaw-local time "HH:MM" */
  time: string;
  customerNote?: string;
  /** Optional service add-ons (validated + priced server-side; client values ignored). */
  addons?: AddonSelection[];
  /** Optional coupon code (validated + applied server-side against the subtotal). */
  couponCode?: string;
};

// ─── Customer: Create ─────────────────────────────────────────

export async function createAppointment(data: CreateAppointmentInput) {
  const customer = await getDbUser();

  // Compute the UTC instant from Warsaw-local date + time
  const start = warsawDateTimeToUtc(data.date, data.time);
  if (isNaN(start.getTime())) throw new Error("Nieprawidłowa data wizyty.");
  if (!isFutureStart(start)) throw new Error("Data wizyty musi być w przyszłości.");

  // Validate business is published (authoritative gate — same as public surfaces)
  const business = await prisma.business.findUnique({
    where: { id: data.businessId },
    select: { id: true, status: true, isActive: true, name: true, slug: true, ownerId: true, email: true },
  });
  if (!business) throw new Error("Nie znaleziono salonu.");
  if (!isPubliclyVisible(business))
    throw new Error("Salon jest obecnie niedostępny.");

  // Fetch service — validates it's active and belongs to this business
  const service = await prisma.service.findFirst({
    where: {
      id: data.serviceId,
      businessId: data.businessId,
      isActive: true,
    },
  });
  if (!service) throw new Error("Usługa jest niedostępna lub nie istnieje.");

  // Resolve + validate add-ons server-side (business + service + active + quantity).
  // Client-submitted prices/durations are never trusted — recomputed from the DB.
  const addonLines = await resolveBookingAddons(data.businessId, data.serviceId, data.addons);
  const basePrice = service.discountedPrice ?? service.price;
  const base = computeBookingTotals({ basePrice, baseDuration: service.duration, addonLines });
  const end = new Date(start.getTime() + base.totalDuration * 60_000);

  // Server-authority: the slot must be within the salon's real open hours for
  // that date (weekly + SpecialDay, minus breaks) — not just trusted from the
  // client's slot list.
  await assertCustomerBookableSlot({
    businessId: data.businessId,
    dateYmd: data.date,
    timeHHMM: data.time,
    durationMin: base.totalDuration,
  });

  const couponCode = data.couponCode?.trim();

  // Conflict guard + coupon claim + create in one transaction: shrinks the
  // double-booking race AND makes coupon usage atomic (no over-limit under races).
  const appointment = await prisma.$transaction(async (tx) => {
    await lockBusinessForBooking(tx, data.businessId);
    await assertSlotAvailable(tx, {
      businessId: data.businessId,
      employeeId: data.employeeId ?? null,
      start,
      end,
    });

    let discountAmount = 0;
    const couponData: {
      couponId?: string;
      couponCode?: string;
      couponType?: string;
      couponValue?: number;
      couponDiscount?: number;
    } = {};
    if (couponCode) {
      const c = await tx.coupon.findFirst({ where: { businessId: data.businessId, code: couponCode } });
      if (!c) throw new Error("Nieprawidłowy kod kuponu.");
      const evalr = evaluateCoupon(
        {
          code: c.code,
          type: c.type,
          value: c.value,
          minOrderValue: c.minOrderValue,
          maxUses: c.maxUses,
          usesCount: c.usesCount,
          validFrom: c.validFrom,
          validUntil: c.validUntil,
          isActive: c.isActive,
        },
        base.subtotal,
        new Date()
      );
      if (!evalr.valid) throw new Error(evalr.reason);
      // Atomically claim one use, guarded by maxUses so concurrent bookings
      // cannot push usesCount past the limit. Only increments on real booking.
      const claimed = await tx.coupon.updateMany({
        where: { id: c.id, ...(c.maxUses != null ? { usesCount: { lt: c.maxUses } } : {}) },
        data: { usesCount: { increment: 1 } },
      });
      if (claimed.count === 0) throw new Error("Limit użyć tego kuponu został wyczerpany.");
      discountAmount = evalr.discountAmount;
      couponData.couponId = c.id;
      couponData.couponCode = c.code;
      couponData.couponType = c.type;
      couponData.couponValue = c.value;
      couponData.couponDiscount = discountAmount;
    }

    const totals = computeBookingTotals({ basePrice, baseDuration: service.duration, addonLines, discountAmount });

    return tx.appointment.create({
      data: {
        businessId: data.businessId,
        customerId: customer.id,
        serviceId: data.serviceId,
        employeeId: data.employeeId ?? null,
        startTime: start,
        endTime: end,
        duration: totals.totalDuration,
        // New customer bookings are auto-confirmed — no manual salon approval.
        // The transactional conflict guard above still prevents double-booking.
        status: AppointmentStatus.CONFIRMED,
        price: totals.finalTotal,
        basePrice: totals.basePrice,
        addonsTotal: totals.addonsTotal,
        subtotal: totals.subtotal,
        ...couponData,
        currency: service.currency,
        customerNotes: data.customerNote ?? null,
        addons: {
          create: addonLines.map((l) => ({
            addonId: l.addonId,
            name: l.name,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            totalPrice: l.totalPrice,
            unitDuration: l.unitDuration,
            totalDuration: l.totalDuration,
          })),
        },
      },
      include: { business: true, service: true, employee: true, addons: true },
    });
  });

  const slotLabel = describeSlot(start);

  // Notifications + emails + SMS — genuinely non-blocking now. The booking is
  // already committed above; these external side effects run AFTER the response
  // is sent (next/server `after`), so the customer never waits on Resend/Twilio.
  // Each side effect is independently idempotent/deduped, so running post-response
  // is safe. This is the main booking latency fix.
  after(() => Promise.allSettled([
    notify({
      userId: customer.id,
      businessId: business.id,
      type: "APPOINTMENT_CONFIRMED",
      title: "Wizyta potwierdzona",
      body: `${service.name} w ${business.name}, ${slotLabel}. Twoja wizyta jest potwierdzona.`,
      data: { appointmentId: appointment.id },
    }),
    notifySalonInApp(business.id, "newBooking", {
      userId: business.ownerId,
      type: "APPOINTMENT_BOOKED",
      title: "Nowa rezerwacja",
      body: `${customer.firstName} ${customer.lastName} — ${service.name}, ${slotLabel}.`,
      data: { appointmentId: appointment.id, link: "/business/calendar" },
    }),
    sendBookingConfirmationEmail({
      to: customer.email,
      businessName: business.name,
      serviceName: service.name,
      slotLabel,
      locale: customer.locale,
    }),
    notifySalonEmail(business.id, "newBooking", () =>
      business.email
        ? sendNewBookingNotificationEmail({
            to: business.email,
            businessName: business.name,
            serviceName: service.name,
            slotLabel,
            customerName: `${customer.firstName} ${customer.lastName}`,
          })
        : Promise.resolve()
    ),
    notifySalonChannels(
      business.id,
      `TermCatch: nowa rezerwacja (potwierdzona) — ${service.name}, ${slotLabel}, ${customer.firstName} ${customer.lastName}. Zobacz w panelu: ${getAppUrl()}/business/calendar`,
      "newBooking"
    ),
    customerBookingSms({
      customer,
      appointmentId: appointment.id,
      template: "confirmed",
      body: bookingSmsBody(toLocale(customer.locale), "confirmed", {
        serviceName: service.name,
        businessName: business.name,
        slotLabel: smsSlotLabel(start, toLocale(customer.locale)),
      }),
    }),
    // Notify the assigned specialist about their new appointment (in-app + email).
    notifyAssignedEmployee({
      employee: appointment.employee,
      businessId: business.id,
      businessName: business.name,
      serviceName: service.name,
      slotLabel,
      clientName: `${customer.firstName} ${customer.lastName}`,
      appointmentId: appointment.id,
      kind: "new",
    }),
  ]));

  revalidatePath("/customer/dashboard");
  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");

  return appointment;
}

// ─── Customer: Reschedule ─────────────────────────────────────

export async function rescheduleAppointment(input: {
  appointmentId: string;
  /** Warsaw-local date "YYYY-MM-DD" */
  date: string;
  /** Warsaw-local time "HH:MM" */
  time: string;
}) {
  const customer = await getDbUser();

  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: {
      business: { select: { id: true, name: true, ownerId: true, email: true } },
      service: { select: { name: true, duration: true } },
    },
  });

  if (!appointment) throw new Error("Nie znaleziono rezerwacji.");
  if (appointment.customerId !== customer.id)
    throw new Error("Możesz przełożyć tylko własne wizyty.");

  const reschedulableStatuses: AppointmentStatus[] = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
  ];
  if (!reschedulableStatuses.includes(appointment.status)) {
    throw new Error("Tylko wizyty oczekujące lub potwierdzone można przełożyć.");
  }

  // Uczciwa polityka: przełożenie możliwe do X godzin przed wizytą (ustala salon)
  const policy = await prisma.business.findUnique({
    where: { id: appointment.businessId },
    select: { cancellationHours: true, phone: true },
  });
  const limitHours = policy?.cancellationHours ?? 24;
  if (!changeAllowedByPolicy(appointment.startTime, new Date(), limitHours)) {
    throw new Error(
      `Wizytę można przełożyć najpóźniej ${limitHours} godz. przed terminem.${policy?.phone ? ` W nagłych przypadkach zadzwoń do salonu: ${policy.phone}.` : " W nagłych przypadkach skontaktuj się z salonem."}`
    );
  }

  const newStart = warsawDateTimeToUtc(input.date, input.time);
  if (isNaN(newStart.getTime())) throw new Error("Nieprawidłowa data wizyty.");
  if (!isFutureStart(newStart))
    throw new Error("Nowy termin musi być w przyszłości.");

  const newEnd = new Date(newStart.getTime() + appointment.duration * 60_000);

  // Server-authority: the new slot must be within the salon's real open hours.
  await assertCustomerBookableSlot({
    businessId: appointment.businessId,
    dateYmd: input.date,
    timeHHMM: input.time,
    durationMin: appointment.duration,
  });

  const oldSlotLabel = describeSlot(appointment.startTime);

  // Atomic re-check + write under the per-business booking lock (no double-book race).
  await prisma.$transaction(async (tx) => {
    await lockBusinessForBooking(tx, appointment.businessId);
    await assertSlotAvailable(tx, {
      businessId: appointment.businessId,
      employeeId: appointment.employeeId,
      start: newStart,
      end: newEnd,
      excludeId: appointment.id,
    });
    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        startTime: newStart,
        endTime: newEnd,
        // Salon musi potwierdzić nowy termin
        status: AppointmentStatus.PENDING,
        // New time → the old reminder no longer applies; let the cron re-send for the new slot.
        reminderSentAt: null,
      },
    });
  });

  const newSlotLabel = describeSlot(newStart);

  after(() => Promise.allSettled([
    notifySalonInApp(appointment.business.id, "reschedule", {
      userId: appointment.business.ownerId,
      type: "APPOINTMENT_BOOKED",
      title: "Wizyta przełożona",
      body: `${customer.firstName} ${customer.lastName} przełożył(a) wizytę (${appointment.service.name}) z ${oldSlotLabel} na ${newSlotLabel}. Potwierdź nowy termin.`,
      data: { appointmentId: appointment.id, link: "/business/calendar" },
    }),
    notify({
      userId: customer.id,
      businessId: appointment.business.id,
      type: "APPOINTMENT_BOOKED",
      title: "Wizyta przełożona",
      body: `${appointment.service.name} w ${appointment.business.name} — nowy termin: ${newSlotLabel}. Salon potwierdzi zmianę.`,
      data: { appointmentId: appointment.id },
    }),
    notifySalonEmail(appointment.business.id, "reschedule", () =>
      appointment.business.email
        ? sendBookingRescheduleEmail({
            to: appointment.business.email,
            businessName: appointment.business.name,
            serviceName: appointment.service.name,
            slotLabel: newSlotLabel,
            oldSlotLabel,
            customerName: `${customer.firstName} ${customer.lastName}`,
          })
        : Promise.resolve()
    ),
    notifySalonChannels(
      appointment.business.id,
      `TermCatch: wizyta przełożona — ${appointment.service.name} z ${oldSlotLabel} na ${newSlotLabel}. Potwierdź nowy termin w panelu.`,
      "reschedule"
    ),
    customerBookingSms({
      customer,
      appointmentId: appointment.id,
      template: "rescheduled",
      body: bookingSmsBody(toLocale(customer.locale), "rescheduledByCustomer", {
        serviceName: appointment.service.name,
        businessName: appointment.business.name,
        slotLabel: smsSlotLabel(newStart, toLocale(customer.locale)),
      }),
      dedupeSuffix: `:${newStart.toISOString()}`,
    }),
  ]));

  revalidatePath("/customer/dashboard");
  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
}

// ─── Customer: Cancel ─────────────────────────────────────────

export async function cancelAppointment(appointmentId: string) {
  const customer = await getDbUser();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { select: { id: true, name: true, ownerId: true, email: true } },
      service: { select: { name: true } },
    },
  });

  if (!appointment)
    throw new Error("Nie znaleziono rezerwacji.");
  if (appointment.customerId !== customer.id)
    throw new Error("Nie masz uprawnień do anulowania tej rezerwacji.");

  const cancellableStatuses: AppointmentStatus[] = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
  ];
  if (!cancellableStatuses.includes(appointment.status)) {
    throw new Error(
      "Tylko wizyty oczekujące lub potwierdzone mogą być anulowane."
    );
  }

  // Uczciwa polityka: anulowanie do X godzin przed wizytą (ustala salon).
  // Wizyty jeszcze niepotwierdzone przez salon można anulować zawsze.
  if (appointment.status === AppointmentStatus.CONFIRMED) {
    const policy = await prisma.business.findUnique({
      where: { id: appointment.businessId },
      select: { cancellationHours: true, phone: true },
    });
    const limitHours = policy?.cancellationHours ?? 24;
    if (!changeAllowedByPolicy(appointment.startTime, new Date(), limitHours)) {
      throw new Error(
        `Potwierdzoną wizytę można anulować najpóźniej ${limitHours} godz. przed terminem.${policy?.phone ? ` W nagłych przypadkach zadzwoń do salonu: ${policy.phone}.` : ""}`
      );
    }
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED_CUSTOMER,
      cancelledAt: new Date(),
      cancelledBy: customer.id,
    },
  });

  after(() => Promise.allSettled([
    notifySalonInApp(appointment.business.id, "cancellation", {
      userId: appointment.business.ownerId,
      type: "APPOINTMENT_CANCELLED",
      title: "Rezerwacja anulowana",
      body: `${customer.firstName} ${customer.lastName} anulował(a) wizytę: ${appointment.service.name}, ${describeSlot(appointment.startTime)}.`,
      data: { appointmentId, link: "/business/calendar" },
    }),
    notifySalonEmail(appointment.business.id, "cancellation", () =>
      appointment.business.email
        ? sendBookingCancellationEmail({
            to: appointment.business.email,
            businessName: appointment.business.name,
            serviceName: appointment.service.name,
            slotLabel: describeSlot(appointment.startTime),
            cancelledBy: "customer",
          })
        : Promise.resolve()
    ),
    notifySalonChannels(
      appointment.business.id,
      `TermCatch: klient anulował wizytę — ${appointment.service.name}, ${describeSlot(appointment.startTime)}. Termin jest znów wolny.`,
      "cancellation"
    ),
    customerBookingSms({
      customer,
      appointmentId,
      template: "cancelled",
      body: bookingSmsBody(toLocale(customer.locale), "cancelled", {
        serviceName: appointment.service.name,
        businessName: appointment.business.name,
        slotLabel: smsSlotLabel(appointment.startTime, toLocale(customer.locale)),
      }),
    }),
  ]));

  revalidatePath("/customer/dashboard");
  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
}

// ─── Business: Confirm ────────────────────────────────────────

export async function confirmAppointment(appointmentId: string) {
  const businessId = await getOwnedBusinessId();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { select: { id: true, name: true } },
      service: { select: { name: true } },
      customer: { select: { id: true, email: true, firstName: true, phone: true, smsNotifications: true, locale: true } },
    },
  });

  if (!appointment) throw new Error("Nie znaleziono rezerwacji.");
  if (appointment.businessId !== businessId)
    throw new Error("Nie masz uprawnień do potwierdzenia tej rezerwacji.");
  if (appointment.status !== AppointmentStatus.PENDING)
    throw new Error("Można potwierdzić tylko oczekujące wizyty.");

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CONFIRMED },
  });

  const slotLabel = describeSlot(appointment.startTime);

  await Promise.allSettled([
    notify({
      userId: appointment.customer.id,
      businessId: appointment.business.id,
      type: "APPOINTMENT_CONFIRMED",
      title: "Wizyta potwierdzona",
      body: `${appointment.service.name} w ${appointment.business.name}, ${slotLabel}.`,
      data: { appointmentId },
    }),
    sendBookingConfirmationEmail({
      to: appointment.customer.email,
      businessName: appointment.business.name,
      serviceName: appointment.service.name,
      slotLabel,
      locale: appointment.customer.locale,
    }),
    customerBookingSms({
      customer: appointment.customer,
      appointmentId,
      template: "confirmed",
      body: bookingSmsBody(toLocale(appointment.customer.locale), "confirmed", {
        serviceName: appointment.service.name,
        businessName: appointment.business.name,
        slotLabel: smsSlotLabel(appointment.startTime, toLocale(appointment.customer.locale)),
      }),
    }),
  ]);

  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
  revalidatePath("/customer/dashboard");
}

// ─── Business: Decline / Cancel ───────────────────────────────

export async function declineAppointment(appointmentId: string, reasonRaw: string) {
  const businessId = await getOwnedBusinessId();

  // A salon cancellation ALWAYS requires a reason — it is stored and shown to
  // the customer. Private salon notes are never used for this.
  const reason = (reasonRaw ?? "").trim();
  if (reason.length < 3) throw new Error("Podaj powód odwołania wizyty (min. 3 znaki).");
  if (reason.length > 500) throw new Error("Powód odwołania jest zbyt długi (maks. 500 znaków).");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { select: { id: true, name: true, slug: true, ownerId: true } },
      service: { select: { name: true } },
      customer: { select: { id: true, email: true, firstName: true, phone: true, smsNotifications: true, locale: true } },
    },
  });

  if (!appointment) throw new Error("Nie znaleziono rezerwacji.");
  if (appointment.businessId !== businessId)
    throw new Error("Nie masz uprawnień do tej rezerwacji.");

  const allowedStatuses: AppointmentStatus[] = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
  ];
  if (!allowedStatuses.includes(appointment.status)) {
    throw new Error("Można odwołać tylko oczekujące lub potwierdzone wizyty.");
  }

  // Audit trail: who cancelled (the salon owner), when, and the stored reason.
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED_BUSINESS,
      cancelledAt: new Date(),
      cancelledBy: appointment.business.ownerId,
      cancellationReason: reason,
    },
  });

  const slotLabel = describeSlot(appointment.startTime);
  const rebookLink = `/b/${appointment.business.slug}`;

  await Promise.allSettled([
    notify({
      userId: appointment.customer.id,
      businessId: appointment.business.id,
      type: "APPOINTMENT_CANCELLED",
      title: "Wizyta odwołana przez salon",
      body: `${appointment.service.name} w ${appointment.business.name}, ${slotLabel}. Powód: ${reason}. Możesz zarezerwować inny termin.`,
      data: { appointmentId, reason, rebookLink },
    }),
    sendBookingCancellationEmail({
      to: appointment.customer.email,
      businessName: appointment.business.name,
      serviceName: appointment.service.name,
      slotLabel,
      cancelledBy: "business",
      reason,
      locale: appointment.customer.locale,
    }),
    customerBookingSms({
      customer: appointment.customer,
      appointmentId,
      template: "declined",
      body: bookingSmsBody(toLocale(appointment.customer.locale), "declined", {
        serviceName: appointment.service.name,
        businessName: appointment.business.name,
        slotLabel: smsSlotLabel(appointment.startTime, toLocale(appointment.customer.locale)),
        reason,
      }),
    }),
  ]);

  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/history");
}

// ─── Business: Change time (salon-proposed) ───────────────────
//
// Decision: the domain model has no "proposed / awaiting-customer-acceptance"
// state, so building a two-way acceptance flow would be a large new workflow.
// Per the requirement, we instead apply the salon's change IMMEDIATELY with a
// full audit trail (original time, new time, actor, timestamp) and a clear
// customer notification that shows BOTH times. The customer can always reschedule
// or cancel from their dashboard if the new time doesn't suit them.
export async function businessRescheduleAppointment(input: {
  appointmentId: string;
  /** Warsaw-local date "YYYY-MM-DD" */
  date: string;
  /** Warsaw-local time "HH:MM" */
  time: string;
}) {
  const businessId = await getOwnedBusinessId();

  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: {
      business: { select: { id: true, name: true, ownerId: true } },
      service: { select: { name: true } },
      customer: { select: { id: true, email: true, firstName: true, phone: true, smsNotifications: true, locale: true } },
    },
  });

  if (!appointment) throw new Error("Nie znaleziono rezerwacji.");
  if (appointment.businessId !== businessId)
    throw new Error("Nie masz uprawnień do tej rezerwacji.");

  const allowedStatuses: AppointmentStatus[] = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
  ];
  if (!allowedStatuses.includes(appointment.status)) {
    throw new Error("Termin można zmienić tylko dla oczekujących lub potwierdzonych wizyt.");
  }

  const newStart = warsawDateTimeToUtc(input.date, input.time);
  if (isNaN(newStart.getTime())) throw new Error("Nieprawidłowa data wizyty.");
  if (!isFutureStart(newStart)) throw new Error("Nowy termin musi być w przyszłości.");
  if (newStart.getTime() === appointment.startTime.getTime())
    throw new Error("Wybierz inny termin niż obecny.");

  const newEnd = new Date(newStart.getTime() + appointment.duration * 60_000);

  const originalStart = appointment.startTime;

  // Atomic re-check + write under the per-business booking lock (no double-book race).
  await prisma.$transaction(async (tx) => {
    await lockBusinessForBooking(tx, appointment.businessId);
    await assertSlotAvailable(tx, {
      businessId: appointment.businessId,
      employeeId: appointment.employeeId,
      start: newStart,
      end: newEnd,
      excludeId: appointment.id,
    });
    await tx.appointment.update({
      where: { id: appointment.id },
      // reminderSentAt reset → the reminder cron re-sends for the new time.
      data: { startTime: newStart, endTime: newEnd, reminderSentAt: null },
    });
  });

  const oldSlotLabel = describeSlot(originalStart);
  const newSlotLabel = describeSlot(newStart);

  await Promise.allSettled([
    notify({
      userId: appointment.customer.id,
      businessId: appointment.business.id,
      type: "APPOINTMENT_CONFIRMED",
      title: "Salon zmienił godzinę wizyty",
      body: `${appointment.service.name} w ${appointment.business.name}: nowy termin ${newSlotLabel} (poprzednio ${oldSlotLabel}).`,
      // Audit payload: original + new time + who changed it.
      data: {
        appointmentId: appointment.id,
        actor: "business",
        originalStart: originalStart.toISOString(),
        newStart: newStart.toISOString(),
      },
    }),
    sendBookingTimeChangedEmail({
      to: appointment.customer.email,
      businessName: appointment.business.name,
      serviceName: appointment.service.name,
      slotLabel: newSlotLabel,
      oldSlotLabel,
      locale: appointment.customer.locale,
    }),
    customerBookingSms({
      customer: appointment.customer,
      appointmentId: appointment.id,
      template: "rescheduled",
      body: bookingSmsBody(toLocale(appointment.customer.locale), "rescheduledByBusiness", {
        serviceName: appointment.service.name,
        businessName: appointment.business.name,
        slotLabel: smsSlotLabel(newStart, toLocale(appointment.customer.locale)),
        oldSlotLabel: smsSlotLabel(originalStart, toLocale(appointment.customer.locale)),
      }),
      dedupeSuffix: `:${newStart.toISOString()}`,
    }),
  ]);

  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
  revalidatePath("/customer/dashboard");
}

// ─── Business: Complete ───────────────────────────────────────

export async function completeAppointment(appointmentId: string) {
  const businessId = await getOwnedBusinessId();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { select: { id: true, name: true, slug: true } },
      customer: { select: { id: true, email: true, locale: true } },
      service: { select: { name: true } },
    },
  });

  if (!appointment) throw new Error("Nie znaleziono rezerwacji.");
  if (appointment.businessId !== businessId)
    throw new Error("Nie masz uprawnień do tej rezerwacji.");

  const allowedStatuses: AppointmentStatus[] = [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_PROGRESS,
  ];
  if (!allowedStatuses.includes(appointment.status)) {
    throw new Error("Wizyta musi być potwierdzona lub w trakcie, aby ją zakończyć.");
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.COMPLETED },
  });

  // Ask the customer for a review — in-app + email (email was previously missing).
  const reviewUrl = `${getAppUrl()}/b/${appointment.business.slug}?review=${appointmentId}`;
  await Promise.allSettled([
    notify({
      userId: appointment.customer.id,
      businessId: appointment.business.id,
      type: "REVIEW_REQUEST",
      title: "Jak było?",
      body: `Oceń wizytę: ${appointment.service.name} w ${appointment.business.name}.`,
      data: { appointmentId, businessSlug: appointment.business.slug },
    }),
    appointment.customer.email
      ? sendReviewRequestEmail({
          to: appointment.customer.email,
          businessName: appointment.business.name,
          serviceName: appointment.service.name,
          reviewUrl,
          locale: appointment.customer.locale,
        })
      : Promise.resolve(),
  ]);

  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
  revalidatePath("/customer/dashboard");
}

// ─── Business: No-show ────────────────────────────────────────

export async function markNoShow(appointmentId: string) {
  const businessId = await getOwnedBusinessId();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { businessId: true, status: true },
  });

  if (!appointment) throw new Error("Nie znaleziono rezerwacji.");
  if (appointment.businessId !== businessId)
    throw new Error("Nie masz uprawnień do tej rezerwacji.");

  const allowedStatuses: AppointmentStatus[] = [
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
  ];
  if (!allowedStatuses.includes(appointment.status)) {
    throw new Error("Można oznaczyć nieobecność tylko dla oczekujących lub potwierdzonych wizyt.");
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.NO_SHOW },
  });

  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
}

// ─── Business: Search own clients (for manual booking / ⌘K) ──

export async function searchClients(query: string) {
  const businessId = await getOwnedBusinessId();
  const q = query.trim();
  if (q.length < 2) return [];

  const clients = await prisma.user.findMany({
    where: {
      appointments: { some: { businessId } },
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    take: 8,
    orderBy: { lastName: "asc" },
  });
  return clients;
}

// ─── Business: Create manual appointment (walk-in / phone) ───

export type ManualAppointmentInput = {
  serviceId: string;
  employeeId?: string | null;
  /** Warsaw-local date "YYYY-MM-DD" */
  date: string;
  /** Warsaw-local time "HH:MM" */
  time: string;
  client:
    | { kind: "existing"; userId: string }
    | { kind: "new"; firstName: string; lastName: string; phone?: string; email?: string };
  note?: string;
};

export async function createManualAppointment(input: ManualAppointmentInput) {
  const businessId = await getOwnedBusinessId();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, ownerId: true },
  });
  if (!business) throw new Error("Nie znaleziono salonu.");

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, businessId, isActive: true },
  });
  if (!service) throw new Error("Usługa jest niedostępna lub nie istnieje.");

  if (input.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: input.employeeId, businessId, isActive: true },
      select: { id: true },
    });
    if (!employee) throw new Error("Wybrany pracownik nie istnieje.");
  }

  const start = warsawDateTimeToUtc(input.date, input.time);
  if (isNaN(start.getTime())) throw new Error("Nieprawidłowa data wizyty.");
  // Walk-ins may be logged for "just now" — allow up to 60 min back
  if (start.getTime() < Date.now() - 60 * 60_000)
    throw new Error("Termin wizyty jest w przeszłości.");

  const end = new Date(start.getTime() + service.duration * 60_000);

  // Resolve the customer
  let customerId: string;
  let isPlatformCustomer = true;

  if (input.client.kind === "existing") {
    // Must already be a client of THIS business (same scope as searchClients) —
    // prevents attaching/notifying an arbitrary platform user to this salon.
    const existing = await prisma.user.findFirst({
      where: { id: input.client.userId, appointments: { some: { businessId } } },
      select: { id: true, supabaseId: true },
    });
    if (!existing) throw new Error("Nie znaleziono klienta.");
    customerId = existing.id;
    isPlatformCustomer = !existing.supabaseId.startsWith("walkin:");
  } else {
    const firstName = input.client.firstName.trim();
    const lastName = input.client.lastName.trim();
    if (!firstName || !lastName) throw new Error("Podaj imię i nazwisko klienta.");
    const email = input.client.email?.trim() || null;
    const phone = input.client.phone?.trim() || null;

    // Reuse an existing account when the email/phone already exists
    const matched =
      (email && (await prisma.user.findUnique({ where: { email }, select: { id: true, supabaseId: true } }))) ||
      (phone && (await prisma.user.findFirst({ where: { phone }, select: { id: true, supabaseId: true } }))) ||
      null;

    if (matched) {
      customerId = matched.id;
      isPlatformCustomer = !matched.supabaseId.startsWith("walkin:");
    } else {
      // Walk-in record — clearly namespaced, cannot log in, never blocks a
      // future real registration (synthetic email only when none given)
      const walkinId = `walkin:${crypto.randomUUID()}`;
      const created = await prisma.user.create({
        data: {
          supabaseId: walkinId,
          email: email ?? `${walkinId.replace(":", "+")}@termcatch.local`,
          phone,
          firstName,
          lastName,
          role: "CUSTOMER",
          isVerified: false,
        },
        select: { id: true },
      });
      customerId = created.id;
      isPlatformCustomer = false;
    }
  }

  // Atomic double-booking guard + create under the per-business booking lock.
  const appointment = await prisma.$transaction(async (tx) => {
    await lockBusinessForBooking(tx, businessId);
    await assertSlotAvailable(tx, {
      businessId,
      employeeId: input.employeeId ?? null,
      start,
      end,
    });
    return tx.appointment.create({
      data: {
        businessId,
        customerId,
        serviceId: service.id,
        employeeId: input.employeeId ?? null,
        startTime: start,
        endTime: end,
        duration: service.duration,
        // Owner created it — no approval round-trip needed
        status: AppointmentStatus.CONFIRMED,
        price: service.discountedPrice ?? service.price,
        currency: service.currency,
        businessNotes: input.note?.trim() || null,
      },
      include: { customer: { select: { id: true, email: true, firstName: true, lastName: true, locale: true } } },
    });
  });

  const slotLabel = describeSlot(start);

  // Notify only real platform customers (walk-in records have no inbox)
  if (isPlatformCustomer) {
    await Promise.allSettled([
      notify({
        userId: appointment.customer.id,
        businessId: business.id,
        type: "APPOINTMENT_CONFIRMED",
        title: "Wizyta umówiona",
        body: `${service.name} w ${business.name}, ${slotLabel}.`,
        data: { appointmentId: appointment.id },
      }),
      sendBookingConfirmationEmail({
        to: appointment.customer.email,
        businessName: business.name,
        serviceName: service.name,
        slotLabel,
        locale: appointment.customer.locale,
      }),
    ]);
  }

  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
  revalidatePath("/business/crm");

  return { id: appointment.id };
}

// ─── Customer: Get Appointments ───────────────────────────────

export async function getCustomerAppointments() {
  const customer = await getDbUser();

  const appointments = await prisma.appointment.findMany({
    where: { customerId: customer.id },
    include: {
      business: true,
      service: true,
      employee: true,
      review: { select: { id: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return appointments;
}

// ─── Business: Get Appointments ───────────────────────────────

export async function getBusinessAppointments(startDate: Date, endDate: Date) {
  const businessId = await getOwnedBusinessId();

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatarUrl: true,
        },
      },
      service: true,
      employee: true,
    },
    orderBy: { startTime: "asc" },
  });

  return appointments;
}
