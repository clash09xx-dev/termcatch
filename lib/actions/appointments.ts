"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppointmentStatus, NotificationType } from "@prisma/client";
import { warsawDateTimeToUtc, warsawTimeString } from "@/lib/timezone";
import { sendEmail } from "@/lib/email";
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
    sendEmail({
      to: customer.email,
      subject: `Rezerwacja wysłana — ${business.name}`,
      heading: "Twoja rezerwacja została wysłana",
      lines: [
        `<strong>${service.name}</strong> w <strong>${business.name}</strong>`,
        `Termin: <strong>${slotLabel}</strong>`,
        `Cena: <strong>${formatCurrency(appointment.price)}</strong>`,
        "Salon potwierdzi wizytę — poinformujemy Cię o zmianie statusu.",
      ],
      ctaLabel: "Moje rezerwacje",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"}/customer/dashboard`,
    }),
    business.email
      ? sendEmail({
          to: business.email,
          subject: `Nowa rezerwacja — ${service.name}`,
          heading: "Masz nową rezerwację",
          lines: [
            `Klient: <strong>${customer.firstName} ${customer.lastName}</strong>`,
            `Usługa: <strong>${service.name}</strong>`,
            `Termin: <strong>${slotLabel}</strong>`,
          ],
          ctaLabel: "Otwórz kalendarz",
          ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"}/business/calendar`,
        })
      : Promise.resolve(),
  ]);

  revalidatePath("/customer/dashboard");
  revalidatePath("/business/dashboard");
  revalidatePath("/business/calendar");

  return appointment;
}

// ─── Customer: Cancel ─────────────────────────────────────────

export async function cancelAppointment(appointmentId: string) {
  const customer = await getDbUser();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: { select: { id: true, name: true, ownerId: true } },
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
    sendEmail({
      to: appointment.customer.email,
      subject: `Wizyta potwierdzona — ${appointment.business.name}`,
      heading: "Twoja wizyta została potwierdzona",
      lines: [
        `<strong>${appointment.service.name}</strong> w <strong>${appointment.business.name}</strong>`,
        `Termin: <strong>${slotLabel}</strong>`,
        "Do zobaczenia!",
      ],
      ctaLabel: "Moje rezerwacje",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"}/customer/dashboard`,
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
    sendEmail({
      to: appointment.customer.email,
      subject: `Wizyta odwołana — ${appointment.business.name}`,
      heading: "Twoja wizyta została odwołana",
      lines: [
        `<strong>${appointment.service.name}</strong> w <strong>${appointment.business.name}</strong>`,
        `Termin: <strong>${slotLabel}</strong>`,
        "Salon odwołał tę wizytę. Możesz zarezerwować inny termin.",
      ],
      ctaLabel: "Zarezerwuj ponownie",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://termcatch.com"}/customer/dashboard`,
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
