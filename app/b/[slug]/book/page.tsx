export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LandingNav } from "@/components/layout/landing-nav";
import { isPubliclyVisible } from "@/lib/publication";
import { getServerUser } from "@/lib/supabase/server";
import BookingWizard from "./booking-wizard";

// Ambient chrome mesh — same recipe as the marketing hero
const BG = [
  "radial-gradient(ellipse 70% 55% at 8% 0%, rgba(255,255,255,0.92) 0%, transparent 60%)",
  "radial-gradient(ellipse 90% 70% at 92% 8%, rgba(186,203,224,0.42) 0%, transparent 58%)",
  "radial-gradient(ellipse 60% 50% at 40% 100%, rgba(203,213,225,0.30) 0%, transparent 62%)",
  "linear-gradient(172deg, #EDF2F9 0%, #F5F8FC 46%, #E7EEF7 100%)",
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

  // Drives login-first-then-book at the confirmation step (preserves the whole
  // selection across the OAuth round-trip instead of losing it).
  const user = await getServerUser();
  const isAuthenticated = Boolean(user);

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
      employees: {
        // Only staff opted-in to online booking are selectable publicly.
        where: { isActive: true, isAccepting: true },
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

  if (!business || !isPubliclyVisible(business)) {
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
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
}
