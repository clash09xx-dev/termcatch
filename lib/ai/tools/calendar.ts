import "server-only";

import { prisma } from "@/lib/prisma";
import { getBusinessDaySlots } from "@/lib/availability";
import { warsawDateString, warsawTimeString, warsawDayStartUtc } from "@/lib/timezone";
import { warsawYmdPlusDays } from "@/lib/availability";
import type { AiTool, ActionProposal } from "./registry";
import { str, int, money } from "./registry";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function resolveDate(args: Record<string, unknown>): string {
  const d = str(args, "date");
  if (d && YMD.test(d)) return d;
  const offset = int(args, "inDays") ?? 0;
  return warsawYmdPlusDays(warsawDateString(new Date()), Math.max(0, Math.min(365, offset)));
}

async function findAppointmentForBusiness(businessId: string, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    select: {
      id: true, status: true, startTime: true, price: true, currency: true,
      customer: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
  });
}

export const calendarTools: AiTool[] = [
  {
    name: "find_free_slots",
    kind: "read",
    roles: ["owner", "employee"],
    description:
      "Znajdź wolne terminy w kalendarzu salonu na dany dzień. Podaj datę (YYYY-MM-DD) lub liczbę dni od dziś (inDays: 0=dziś, 1=jutro). Opcjonalnie nazwa usługi (dobiera czas trwania) i imię specjalisty.",
    parameters: {
      properties: {
        date: { type: "string", description: "Data w formacie YYYY-MM-DD" },
        inDays: { type: "integer", description: "Liczba dni od dziś (alternatywa dla date)" },
        serviceName: { type: "string", description: "Nazwa usługi (dobiera czas trwania)" },
        employeeName: { type: "string", description: "Imię/nazwisko specjalisty" },
      },
    },
    async run(args, { actor }) {
      const dateYmd = resolveDate(args);
      const services = await prisma.service.findMany({
        where: { businessId: actor.businessId, isActive: true },
        select: { id: true, name: true, duration: true },
      });
      const wantService = str(args, "serviceName")?.toLowerCase();
      const svc = wantService ? services.find((s) => s.name.toLowerCase().includes(wantService)) : undefined;
      const duration = svc?.duration ?? Math.min(...services.map((s) => s.duration).concat([30]));

      let employeeId: string | undefined;
      if (actor.role === "employee" && actor.employeeId) {
        // Employees only see their own free slots — ignore any employeeName arg.
        employeeId = actor.employeeId;
      } else {
        const wantEmp = str(args, "employeeName")?.toLowerCase();
        if (wantEmp) {
          const list = await prisma.employee.findMany({
            where: { businessId: actor.businessId, isActive: true },
            select: { id: true, firstName: true, lastName: true },
          });
          employeeId = list.find((e) => `${e.firstName} ${e.lastName}`.toLowerCase().includes(wantEmp))?.id;
        }
      }

      const { open, slots } = await getBusinessDaySlots({
        businessId: actor.businessId,
        serviceDurationMin: duration,
        dateYmd,
        employeeId,
      });
      return {
        date: dateYmd,
        open,
        serviceUsed: svc?.name ?? `domyślnie ${duration} min`,
        slotCount: slots.length,
        slots: slots.slice(0, 40),
      };
    },
  },

  {
    name: "list_appointments",
    kind: "read",
    roles: ["owner", "employee"],
    description:
      "Lista wizyt salonu w zakresie dat (fromDate/toDate w YYYY-MM-DD). Użyj do pytań o tydzień/dzień, obłożenie, kto ma wizyty. Zwraca maks. 100 wizyt.",
    parameters: {
      properties: {
        fromDate: { type: "string", description: "Początek zakresu YYYY-MM-DD" },
        toDate: { type: "string", description: "Koniec zakresu YYYY-MM-DD (włącznie)" },
        status: {
          type: "string",
          description: "Filtr statusu (opcjonalnie): PENDING, CONFIRMED, COMPLETED, NO_SHOW",
        },
      },
      required: ["fromDate", "toDate"],
    },
    async run(args, { actor }) {
      const from = str(args, "fromDate");
      const to = str(args, "toDate");
      if (!from || !YMD.test(from) || !to || !YMD.test(to)) {
        return { error: "Podaj fromDate i toDate w formacie YYYY-MM-DD." };
      }
      const gte = warsawDayStartUtc(from);
      const lt = warsawDayStartUtc(warsawYmdPlusDays(to, 1));
      const status = str(args, "status");
      const appts = await prisma.appointment.findMany({
        where: {
          businessId: actor.businessId,
          startTime: { gte, lt },
          ...(status ? { status: status as never } : {}),
          // Employees (and owner view-as) only ever see their OWN appointments.
          ...(actor.role === "employee" && actor.employeeId ? { employeeId: actor.employeeId } : {}),
        },
        orderBy: { startTime: "asc" },
        take: 100,
        select: {
          id: true, status: true, startTime: true, price: true, currency: true,
          customer: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      });
      return {
        range: { from, to },
        count: appts.length,
        appointments: appts.map((a) => ({
          id: a.id,
          date: warsawDateString(a.startTime),
          time: warsawTimeString(a.startTime),
          status: a.status,
          client: `${a.customer.firstName} ${a.customer.lastName}`.trim(),
          service: a.service.name,
          employee: a.employee ? `${a.employee.firstName} ${a.employee.lastName}`.trim() : null,
          price: a.price,
        })),
      };
    },
  },

  {
    name: "propose_confirm_appointment",
    kind: "write",
    roles: ["owner"],
    description: "Przygotuj potwierdzenie oczekującej wizyty (do zatwierdzenia przez właściciela).",
    parameters: {
      properties: { appointmentId: { type: "string" } },
      required: ["appointmentId"],
    },
    async run(args, { actor }): Promise<ActionProposal | { error: string }> {
      const id = str(args, "appointmentId");
      if (!id) return { error: "Brak appointmentId." };
      const a = await findAppointmentForBusiness(actor.businessId, id);
      if (!a) return { error: "Nie znaleziono wizyty w tym salonie." };
      if (a.status !== "PENDING") return { error: `Wizyta ma status ${a.status} — nie wymaga potwierdzenia.` };
      const client = `${a.customer.firstName} ${a.customer.lastName}`.trim();
      return {
        kind: "proposal",
        actionType: "confirm_appointment",
        title: "Potwierdź wizytę",
        summary: `Potwierdzić wizytę: ${client}, ${a.service.name}`,
        details: [
          { label: "Klient", value: client },
          { label: "Usługa", value: a.service.name },
          { label: "Termin", value: `${warsawDateString(a.startTime)} ${warsawTimeString(a.startTime)}` },
        ],
        params: { appointmentId: a.id },
        confirmLabel: "Potwierdź wizytę",
      };
    },
  },

  {
    name: "propose_cancel_appointment",
    kind: "write",
    roles: ["owner"],
    description:
      "Przygotuj odwołanie wizyty przez salon (wymaga powodu 3–500 znaków). Do zatwierdzenia przez właściciela.",
    parameters: {
      properties: {
        appointmentId: { type: "string" },
        reason: { type: "string", description: "Powód odwołania (3–500 znaków)" },
      },
      required: ["appointmentId", "reason"],
    },
    async run(args, { actor }): Promise<ActionProposal | { error: string }> {
      const id = str(args, "appointmentId");
      const reason = str(args, "reason");
      if (!id) return { error: "Brak appointmentId." };
      if (!reason || reason.length < 3) return { error: "Podaj powód odwołania (min. 3 znaki)." };
      const a = await findAppointmentForBusiness(actor.businessId, id);
      if (!a) return { error: "Nie znaleziono wizyty w tym salonie." };
      const client = `${a.customer.firstName} ${a.customer.lastName}`.trim();
      return {
        kind: "proposal",
        actionType: "decline_appointment",
        title: "Odwołaj wizytę",
        summary: `Odwołać wizytę: ${client}, ${a.service.name}`,
        details: [
          { label: "Klient", value: client },
          { label: "Termin", value: `${warsawDateString(a.startTime)} ${warsawTimeString(a.startTime)}` },
          { label: "Powód", value: reason.slice(0, 500) },
        ],
        params: { appointmentId: a.id, reason: reason.slice(0, 500) },
        confirmLabel: "Odwołaj wizytę",
        danger: true,
      };
    },
  },
];
