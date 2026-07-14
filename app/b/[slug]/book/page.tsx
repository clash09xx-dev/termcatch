export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LandingNav } from "@/components/layout/landing-nav";
import { BusinessStatus } from "@prisma/client";
import BookingWizard from "./booking-wizard";

// Ambient chrome mesh — same recipe as the marketing hero
const BG = [
  "radial-gradient(ellipse 120% 80% at 85% -20%, rgba(203,213,225,0.70) 0%, transparent 50%)",
  "radial-gradient(ellipse 80% 70% at -8% 90%, rgba(148,163,184,0.28) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(226,232,240,0.65) 0%, transparent 65%)",
  "linear-gradient(168deg, #E8EFF8 0%, #F1F6FB 40%, #E5EEF9 100%)",
].join(", ");

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
      serviceAddons: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { services: { select: { id: true } } },
      },
    },
  });

  if (!business || business.status !== BusinessStatus.ACTIVE) {
    notFound();
  }

  // Group active add-ons by the service(s) they're assigned to.
  const addonsByService = new Map<string, { id: string; name: string; description: string | null; priceIncrease: number; durationIncrease: number; hasQuantity: boolean; minQuantity: number; maxQuantity: number; defaultQuantity: number }[]>();
  for (const a of business.serviceAddons) {
    const view = {
      id: a.id,
      name: a.name,
      description: a.description,
      priceIncrease: a.priceIncrease,
      durationIncrease: a.durationIncrease,
      hasQuantity: a.hasQuantity,
      minQuantity: a.minQuantity,
      maxQuantity: a.maxQuantity,
      defaultQuantity: a.defaultQuantity,
    };
    for (const s of a.services) {
      const list = addonsByService.get(s.id) ?? [];
      list.push(view);
      addonsByService.set(s.id, list);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <LandingNav />

      {/* Chrome dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(203,213,225,0.35) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          maskImage: "radial-gradient(ellipse 85% 75% at 50% 40%, black 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 75% at 50% 40%, black 30%, transparent 100%)",
        }}
      />

      <div className="relative max-w-xl mx-auto px-4 sm:px-6 pt-28 md:pt-32 pb-20">
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
            addons: addonsByService.get(s.id) ?? [],
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
