import "server-only";

import { prisma } from "@/lib/prisma";
import type { AiTool } from "./registry";
import { int } from "./registry";

const DAY_MS = 24 * 60 * 60 * 1000;

export const employeeTools: AiTool[] = [
  {
    name: "employee_performance",
    kind: "read",
    roles: ["owner"],
    description:
      "Wyniki zespołu w oknie N dni (domyślnie 30): liczba rezerwacji, wizyt ukończonych, przychód i no-show na specjalistę. Do pytań typu 'kto ma najmniej rezerwacji' czy porównań obłożenia.",
    parameters: {
      properties: { days: { type: "integer", description: "Okno w dniach (domyślnie 30)" } },
    },
    async run(args, { actor }) {
      const days = Math.max(1, int(args, "days") ?? 30);
      const gte = new Date(Date.now() - days * DAY_MS);
      const employees = await prisma.employee.findMany({
        where: { businessId: actor.businessId, isActive: true },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { displayOrder: "asc" },
      });
      const rows = await Promise.all(
        employees.map(async (e) => {
          const [bookings, completed, noShow, rev] = await Promise.all([
            prisma.appointment.count({
              where: { businessId: actor.businessId, employeeId: e.id, startTime: { gte }, status: { notIn: ["CANCELLED_CUSTOMER", "CANCELLED_BUSINESS"] } },
            }),
            prisma.appointment.count({ where: { businessId: actor.businessId, employeeId: e.id, status: "COMPLETED", startTime: { gte } } }),
            prisma.appointment.count({ where: { businessId: actor.businessId, employeeId: e.id, status: "NO_SHOW", startTime: { gte } } }),
            prisma.appointment.aggregate({ where: { businessId: actor.businessId, employeeId: e.id, status: "COMPLETED", startTime: { gte } }, _sum: { price: true } }),
          ]);
          return {
            id: e.id,
            name: `${e.firstName} ${e.lastName}`.trim(),
            bookings,
            completed,
            noShow,
            revenue: Math.round((rev._sum.price ?? 0) * 100) / 100,
          };
        })
      );
      rows.sort((a, b) => b.bookings - a.bookings);
      const avgBookings = rows.length ? Math.round((rows.reduce((s, r) => s + r.bookings, 0) / rows.length) * 10) / 10 : 0;
      return { windowDays: days, teamSize: rows.length, avgBookingsPerEmployee: avgBookings, employees: rows };
    },
  },
];
