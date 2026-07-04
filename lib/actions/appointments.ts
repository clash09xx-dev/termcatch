"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppointmentStatus, NotificationType } from "@prisma/client";
import { warsawDateTimeToUtc, warsawTimeString } from "@/lib/timezone";
import {
  sendBookingRequestEmail,
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  sendBookingRescheduleEmail,
  sendNewBookingNotificationEmail,
} from "@/lib/email";
import { sendSms, sendWhatsApp } from "@/lib/messaging";
import { getBusinessNotificationSettings } from "@/lib/notification-settings";

/** SMS/WhatsApp do salonu zgodnie z jego preferencjami — nigdy nie rzuca. */
async function notifySalonChannels(businessId: string, message: string) {
  try {
    const { settings } = await getBusinessNotificationSettings(businessId);
    const jobs: Promise<boolean>[] = [];
    if (settings.smsEnabled && settings.smsPhone) {
      jobs.push(sendSms(settings.smsPhone, message));
    }
    if (settings.whatsappEnabled && settings.whatsappPhone) {
      jobs.push(sendWhatsApp(settings.whatsappPhone, message));
    }
    if (jobs.length) await Promise.allSettled(jobs);
  } catch (err) {
    console.error("[notifySalonChannels]", err);
  }
}
import { formatDate, formatCurrency } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────

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

function notify(params: {
  userId: string;
  businessId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
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
};

// ─── Customer: Create ─────────────────────────────────────────

export async function createAppointment(data: CreateAppointmentInput) {
  const customer = await getDbUser();

  // Compute the UTC instant from Warsaw-local date + time
  const start = warsawDateTimeToUtc(data.date, data.time);
  if (isNaN(start.getTime())) throw new Error("Nieprawidłowa data wizyty.");
  if (start <= new Date()) throw new Error("Data wizyty musi być w przyszłości.");

  // Validate business is active
  const business = await prisma.business.findUnique({
    where: { id: data.businessId },
    select: { id: true, status: true, name: true, slug: true, ownerId: true, email: true },
  });
  if (!business) throw new Error("Nie znaleziono salonu.");
  if (business.status !== "ACTIVE")
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

  const end = new Date(start.getTime() + service.duration * 60_000);

  // Double-booking guard: reject if the slot overlaps an existing appointment
  const conflict = await prisma.appointment.findFirst({
    where: {
      businessId: data.businessId,
      ...(data.employeeId ? { employeeId: data.employeeId } : {}),
      status: {
        notIn: [
          AppointmentStatus.CANCELLED_CUSTOMER,
          AppointmentStatus.CANCELLED_BUSINESS,
        ],
      },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { id: true },
  });
  if (conflict) {
    throw new Error("Ten termin został właśnie zajęty. Wybierz inną godzinę.");
  }

  const appointment = await prisma.appointment.create({
    data: {
      businessId: data.businessId,
      customerId: customer.id,
      serviceId: data.serviceId,
      employeeId: data.employeeId ?? null,
      startTime: start,
      endTime: end,
      duration: service.duration,
      status: AppointmentStatus.PENDING,
      price: service.discountedPrice ?? service.price,
      currency: service.currency,
      customerNotes: data.customerNote ?? null,
    },
    include: {
      business: true,
      service: true,
      employee: true,
    },
  });

  const slotLabel = describeSlot(start);

  // In-app notifications (customer + salon owner) — non-blocking
  await Promise.allSettled([
    notify({
      userId: customer.id,
      businessId: business.id,
      type: "APPOINTMENT_BOOKED",
      title: "Rezerwacja wysłana",
      body: `${service.name} w ${business.name}, ${slotLabel}. Salon potwierdzi Twoją wizytę.`,
      data: { appointmentId: appointment.id },
    }),
    notify({
      userId: business.ownerId,
      businessId: business.id,
      type: "APPOINTMENT_BOOKED",
      title: "Nowa rezerwacja",
      body: `${customer.firstName} ${customer.lastName} — ${service.name}, ${slotLabel}.`,
      data: { appointmentId: appointment.id },
    }),
    sendBookingRequestEmail({
      to: customer.email,
      businessName: business.name,
      serviceName: service.name,
      slotLabel,
      priceLabel: formatCurrency(appointment.price),
    }),
    business.email
      ? sendNewBookingNotificationEmail({
          to: business.email,
          businessName: business.name,
          serviceName: service.name,
          slotLabel,
          customerName: `${customer.firstName} ${customer.lastName}`,
        })
      : Promise.resolve(),
    notifySalonChannels(
      business.id,
      `Termcatch: nowa rezerwacja — ${service.name}, ${slotLabel}, ${customer.firstName} ${customer.lastName}. Potwierdź w panelu: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"}/business/dashboard`
    ),
  ]);

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
  const hoursLeft = (appointment.startTime.getTime() - Date.now()) / 3_600_000;
  if (hoursLeft < limitHours) {
    throw new Error(
      `Wizytę można przełożyć najpóźniej ${limitHours} godz. przed terminem.${policy?.phone ? ` W nagłych przypadkach zadzwoń do salonu: ${policy.phone}.` : " W nagłych przypadkach skontaktuj się z salonem."}`
    );
  }

  const newStart = warsawDateTimeToUtc(input.date, input.time);
  if (isNaN(newStart.getTime())) throw new Error("Nieprawidłowa data wizyty.");
  if (newStart <= new Date())
    throw new Error("Nowy termin musi być w przyszłości.");

  const newEnd = new Date(newStart.getTime() + appointment.duration * 60_000);

  // Double-booking guard for the new slot
  const conflict = await prisma.appointment.findFirst({
    where: {
      id: { not: appointment.id },
      businessId: appointment.businessId,
      ...(appointment.employeeId ? { employeeId: appointment.employeeId } : {}),
      status: {
        notIn: [
          AppointmentStatus.CANCELLED_CUSTOMER,
          AppointmentStatus.CANCELLED_BUSINESS,
        ],
      },
      startTime: { lt: newEnd },
      endTime: { gt: newStart },
    },
    select: { id: true },
  });
  if (conflict) {
    throw new Error("Ten termin jest już zajęty. Wybierz inną godzinę.");
  }

  const oldSlotLabel = describeSlot(appointment.startTime);

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      startTime: newStart,
      endTime: newEnd,
      // Salon musi potwierdzić nowy termin
      status: AppointmentStatus.PENDING,
    },
  });

  const newSlotLabel = describeSlot(newStart);

  await Promise.allSettled([
    notify({
      userId: appointment.business.ownerId,
      businessId: appointment.business.id,
      type: "APPOINTMENT_BOOKED",
      title: "Wizyta przełożona",
      body: `${customer.firstName} ${customer.lastName} przełożył(a) wizytę (${appointment.service.name}) z ${oldSlotLabel} na ${newSlotLabel}. Potwierdź nowy termin.`,
      data: { appointmentId: appointment.id },
    }),
    notify({
      userId: customer.id,
      businessId: appointment.business.id,
      type: "APPOINTMENT_BOOKED",
      title: "Wizyta przełożona",
      body: `${appointment.service.name} w ${appointment.business.name} — nowy termin: ${newSlotLabel}. Salon potwierdzi zmianę.`,
      data: { appointmentId: appointment.id },
    }),
    appointment.business.email
      ? sendBookingRescheduleEmail({
          to: appointment.business.email,
          businessName: appointment.business.name,
          serviceName: appointment.service.name,
          slotLabel: newSlotLabel,
          oldSlotLabel,
          customerName: `${customer.firstName} ${customer.lastName}`,
        })
      : Promise.resolve(),
    notifySalonChannels(
      appointment.business.id,
      `Termcatch: wizyta przełożona — ${appointment.service.name} z ${oldSlotLabel} na ${newSlotLabel}. Potwierdź nowy termin w panelu.`
    ),
  ]);

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
    const hoursLeft = (appointment.startTime.getTime() - Date.now()) / 3_600_000;
    if (hoursLeft < limitHours) {
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

  await Promise.allSettled([
    notify({
      userId: appointment.business.ownerId,
      businessId: appointment.business.id,
      type: "APPOINTMENT_CANCELLED",
      title: "Rezerwacja anulowana",
      body: `${customer.firstName} ${customer.lastName} anulował(a) wizytę: ${appointment.service.name}, ${describeSlot(appointment.startTime)}.`,
      data: { appointmentId },
    }),
    appointment.business.email
      ? sendBookingCancellationEmail({
          to: appointment.business.email,
          businessName: appointment.business.name,
          serviceName: appointment.service.name,
          slotLabel: describeSlot(appointment.startTime),
          cancelledBy: "customer",
        })
      : Promise.resolve(),
    notifySalonChannels(
      appointment.business.id,
      `Termcatch: klient anulował wizytę — ${appointment.service.name}, ${describeSlot(appointment.startTime)}. Termin jest znów wolny.`
    ),
  ]);

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
      customer: { select: { id: true, email: true, firstName: true } },
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
    }),
  ]);

  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");
  revalidatePath("/customer/dashboard");
}

// ─── Business: Decline / Cancel ───────────────────────────────

export async function declineAppointment(appointmentId: string) {
  const businessId = await getOwnedBusinessId();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { select: { id: true, name: true } },
      service: { select: { name: true } },
      customer: { select: { id: true, email: true, firstName: true } },
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

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED_BUSINESS,
      cancelledAt: new Date(),
    },
  });

  const slotLabel = describeSlot(appointment.startTime);

  await Promise.allSettled([
    notify({
      userId: appointment.customer.id,
      businessId: appointment.business.id,
      type: "APPOINTMENT_CANCELLED",
      title: "Wizyta odwołana przez salon",
      body: `${appointment.service.name} w ${appointment.business.name}, ${slotLabel}. Przepraszamy — zarezerwuj inny termin.`,
      data: { appointmentId },
    }),
    sendBookingCancellationEmail({
      to: appointment.customer.email,
      businessName: appointment.business.name,
      serviceName: appointment.service.name,
      slotLabel,
      cancelledBy: "business",
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
      customer: { select: { id: true } },
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

  // Ask the customer for a review
  await Promise.allSettled([
    notify({
      userId: appointment.customer.id,
      businessId: appointment.business.id,
      type: "REVIEW_REQUEST",
      title: "Jak było?",
      body: `Oceń wizytę: ${appointment.service.name} w ${appointment.business.name}.`,
      data: { appointmentId, businessSlug: appointment.business.slug },
    }),
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
