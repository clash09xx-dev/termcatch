import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LandingNav } from "@/components/layout/landing-nav";
import { BusinessStatus } from "@prisma/client";
import BookingWizard from "./booking-wizard";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { slug } = await params;
  const { serviceId } = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
      employees: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
      workingHours: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  if (!business || business.status !== BusinessStatus.ACTIVE) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LandingNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <BookingWizard
          business={{
            id: business.id,
            name: business.name,
            slug: business.slug,
          }}
          services={business.services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            duration: s.duration,
            price: s.price,
            discountedPrice: s.discountedPrice,
          }))}
          employees={business.employees.map((e) => ({
            id: e.id,
            firstName: e.firstName,
            lastName: e.lastName,
            avatarUrl: e.avatarUrl,
            bio: e.bio,
            color: e.color,
          }))}
          workingHours={business.workingHours.map((wh) => ({
            dayOfWeek: wh.dayOfWeek,
            isOpen: wh.isOpen,
            openTime: wh.openTime,
            closeTime: wh.closeTime,
          }))}
          initialServiceId={serviceId}
        />
      </div>
    </div>
  );
}
