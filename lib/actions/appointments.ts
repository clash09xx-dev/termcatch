"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@prisma/client";

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

// ─── Input Types ──────────────────────────────────────────────

export type CreateAppointmentInput = {
  businessId: string;
  serviceId: string;
  employeeId?: string;
  startTime: string; // ISO string
  customerNote?: string;
};

// ─── Customer: Create ─────────────────────────────────────────

export async function createAppointment(data: CreateAppointmentInput) {
  const customer = await getDbUser();

  // Validate startTime is in the future
  const start = new Date(data.startTime);
  if (isNaN(start.getTime())) throw new Error("Nieprawidłowa data wizyty.");
  if (start <= new Date()) throw new Error("Data wizyty musi być w przyszłości.");

  // Validate business is active
  const business = await prisma.business.findUnique({
    where: { id: data.businessId },
    select: { status: true },
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

  // Calculate endTime
  const end = new Date(start.getTime() + service.duration * 60_000);

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

  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/bookings");

  return appointment;
}

// ─── Customer: Cancel ─────────────────────────────────────────

export async function cancelAppointment(appointmentId: string) {
  const customer = await getDbUser();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { customerId: true, status: true },
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

  revalidatePath("/customer/dashboard");
  revalidatePath("/customer/bookings");
}

// ─── Business: Confirm ────────────────────────────────────────

export async function confirmAppointment(appointmentId: string) {
  const businessId = await getOwnedBusinessId();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { businessId: true, status: true },
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

  revalidatePath("/business/dashboard");
  revalidatePath("/business/appointments");
}

// ─── Business: Complete ───────────────────────────────────────

export async function completeAppointment(appointmentId: string) {
  const businessId = await getOwnedBusinessId();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { businessId: true, status: true },
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

  revalidatePath("/business/dashboard");
  revalidatePath("/business/appointments");
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
  revalidatePath("/business/appointments");
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
