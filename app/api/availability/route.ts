import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timeToMinutes, minutesToTime } from "@/lib/utils";
import { AppointmentStatus, DayOfWeek } from "@prisma/client";

const DAY_MAP: Record<number, string> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const employeeId = searchParams.get("employeeId") ?? undefined;

  if (!businessId || !serviceId || !date) {
    return NextResponse.json(
      { error: "businessId, serviceId, and date are required" },
      { status: 400 }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  const parsedDate = new Date(date + "T00:00:00");
  const dayOfWeek = DAY_MAP[parsedDate.getDay()];

  if (!dayOfWeek) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // Fetch working hours for the day
  const workingHours = await prisma.workingHours.findUnique({
    where: {
      businessId_dayOfWeek: {
        businessId,
        dayOfWeek: dayOfWeek as DayOfWeek,
      },
    },
  });

  if (!workingHours || !workingHours.isOpen) {
    return NextResponse.json({ slots: [] });
  }

  // Fetch service duration
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { duration: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Fetch existing appointments for that day (excluding cancelled)
  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd = new Date(date + "T23:59:59.999Z");

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      businessId,
      ...(employeeId ? { employeeId } : {}),
      status: {
        notIn: [
          AppointmentStatus.CANCELLED_CUSTOMER,
          AppointmentStatus.CANCELLED_BUSINESS,
        ],
      },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  // Generate slots from openTime to closeTime - serviceDuration, every 30 min
  const openMinutes = timeToMinutes(workingHours.openTime);
  const closeMinutes = timeToMinutes(workingHours.closeTime);
  const slotDuration = service.duration;

  const slots: string[] = [];

  for (
    let slotStart = openMinutes;
    slotStart + slotDuration <= closeMinutes;
    slotStart += 30
  ) {
    const slotEnd = slotStart + slotDuration;

    // Check if slot overlaps with any existing appointment
    const slotStartDate = new Date(`${date}T${minutesToTime(slotStart)}:00.000Z`);
    const slotEndDate = new Date(`${date}T${minutesToTime(slotEnd)}:00.000Z`);

    const overlaps = existingAppointments.some((appt) => {
      const apptStart = new Date(appt.startTime).getTime();
      const apptEnd = new Date(appt.endTime).getTime();
      const sStart = slotStartDate.getTime();
      const sEnd = slotEndDate.getTime();
      // Overlap check: slot starts before appt ends AND slot ends after appt starts
      return sStart < apptEnd && sEnd > apptStart;
    });

    if (!overlaps) {
      slots.push(minutesToTime(slotStart));
    }
  }

  return NextResponse.json({ slots });
}
