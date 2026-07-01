import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CrmClient } from "./crm-client";
import { formatCurrency } from "@/lib/utils";

export type CustomerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  totalAppointments: number;
  lastVisit: string | null;
  totalSpent: number;
  appointments: {
    id: string;
    startTime: string;
    status: string;
    service: { name: string };
    price: number;
  }[];
};

async function getCrmData(supabaseId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId },
    include: {
      ownedBusinesses: {
        take: 1,
        include: {
          appointments: {
            orderBy: { startTime: "desc" },
            include: {
              customer: true,
              service: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  return dbUser;
}

export default async function CrmPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const dbUser = await getCrmData(user.id);
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");

  // Group appointments by customer
  const customerMap = new Map<string, CustomerSummary>();

  for (const apt of business.appointments) {
    const customerId = apt.customerId;
    const existing = customerMap.get(customerId);

    if (existing) {
      existing.totalAppointments++;
      existing.totalSpent += apt.price;
      existing.appointments.push({
        id: apt.id,
        startTime: apt.startTime.toISOString(),
        status: apt.status,
        service: { name: apt.service.name },
        price: apt.price,
      });
      // Update last visit (appointments are ordered desc, so first found is latest)
    } else {
      customerMap.set(customerId, {
        id: customerId,
        firstName: apt.customer.firstName,
        lastName: apt.customer.lastName,
        email: apt.customer.email,
        phone: apt.customer.phone,
        totalAppointments: 1,
        lastVisit: apt.startTime.toISOString(),
        totalSpent: apt.price,
        appointments: [
          {
            id: apt.id,
            startTime: apt.startTime.toISOString(),
            status: apt.status,
            service: { name: apt.service.name },
            price: apt.price,
          },
        ],
      });
    }
  }

  const customers = Array.from(customerMap.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );

  return <CrmClient customers={customers} />;
}
