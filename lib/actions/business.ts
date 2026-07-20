"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { ServiceCategory, DayOfWeek } from "@prisma/client";
import { redirect } from "next/navigation";
import { SPECIALTY_TAGS } from "@/lib/discovery";

const DAY_OF_WEEK_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.MONDAY,
  1: DayOfWeek.TUESDAY,
  2: DayOfWeek.WEDNESDAY,
  3: DayOfWeek.THURSDAY,
  4: DayOfWeek.FRIDAY,
  5: DayOfWeek.SATURDAY,
  6: DayOfWeek.SUNDAY,
};

export interface WorkingHourInput {
  dayOfWeek: number; // 0=Mon … 6=Sun
  isOpen: boolean;
  openTime: string;  // "09:00"
  closeTime: string; // "18:00"
}

export interface OnboardingInput {
  category: ServiceCategory;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  workingHours: WorkingHourInput[];
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  /** Create an Employee record for the owner so the salon isn't staff-less */
  addSelfAsStaff?: boolean;
  /** Optional role title, e.g. "Barber" */
  staffTitle?: string;
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 40);
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}

export async function createBusiness(data: OnboardingInput) {
  const authUser = await getServerUser();
  if (!authUser) throw new Error("Unauthorized");

  // A named service must have a real price — 0 zł services were going public
  if (data.serviceName.trim() && (!data.servicePrice || data.servicePrice <= 0)) {
    throw new Error("Podaj cenę usługi większą niż 0 zł.");
  }

  const slug = generateSlug(data.name);

  // Upsert user record in DB
  const dbUser = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: { role: "BUSINESS_OWNER" },
    create: {
      supabaseId: authUser.id,
      email: authUser.email!,
      firstName: (authUser.user_metadata?.first_name as string) || "Właściciel",
      lastName: (authUser.user_metadata?.last_name as string) || "",
      role: "BUSINESS_OWNER",
    },
  });

  // Create business + working hours in one transaction
  const business = await prisma.business.create({
    data: {
      ownerId: dbUser.id,
      name: data.name,
      slug,
      category: data.category,
      description: data.description || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      // New salons are NOT public until reviewed. Owner completes the profile and
      // submits for verification; an admin publishes (→ ACTIVE). This is what
      // keeps unfinished/test salons out of search & discovery.
      status: "PENDING_VERIFICATION",
      workingHours: {
        create: data.workingHours.map((wh) => ({
          dayOfWeek: DAY_OF_WEEK_MAP[wh.dayOfWeek],
          isOpen: wh.isOpen,
          openTime: wh.isOpen ? wh.openTime : "09:00",
          closeTime: wh.isOpen ? wh.closeTime : "18:00",
        })),
      },
    },
  });

  // Create first service if provided
  if (data.serviceName.trim()) {
    await prisma.service.create({
      data: {
        businessId: business.id,
        name: data.serviceName.trim(),
        duration: data.serviceDuration,
        price: data.servicePrice,
        currency: "PLN",
        isActive: true,
        displayOrder: 0,
      },
    });
  }

  // Owner as first staff member — otherwise every new salon silently has
  // zero bookable specialists
  if (data.addSelfAsStaff) {
    await prisma.employee.create({
      data: {
        businessId: business.id,
        userId: dbUser.id,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        title: data.staffTitle?.trim() || null,
        color: "#64748B",
        isActive: true,
        isAccepting: true,
        displayOrder: 0,
      },
    });
  }

  revalidatePath("/business/dashboard");
  return { success: true };
}

// ─── Helper ───────────────────────────────────────────────────
async function getOwnedBusiness() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { ownedBusinesses: { take: 1 } },
  });
  const business = dbUser?.ownedBusinesses[0];
  if (!business) redirect("/business/onboarding");
  return business;
}

// ─── Profile ──────────────────────────────────────────────────
export type BusinessProfileData = {
  name?: string;
  description?: string;
  shortDescription?: string;
  subcategory?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  /** Controlled specialty slugs (validated server-side against SPECIALTY_TAGS). */
  specialties?: string[];
};

export async function updateBusinessProfile(data: BusinessProfileData) {
  const business = await getOwnedBusiness();

  await prisma.business.update({
    where: { id: business.id },
    data: {
      name: data.name,
      description: data.description,
      shortDescription: data.shortDescription,
      subcategory: data.subcategory,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      logoUrl: data.logoUrl,
      coverImageUrl: data.coverImageUrl,
      instagramUrl: data.instagramUrl,
      facebookUrl: data.facebookUrl,
      ...(data.specialties
        ? { specialties: data.specialties.filter((s) => SPECIALTY_TAGS.some((t) => t.slug === s)).slice(0, 6) }
        : {}),
    },
  });

  revalidatePath("/business/profile");
}

// ─── Working Hours ─────────────────────────────────────────────
export type WorkingHoursUpdateData = {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}[];

export async function updateWorkingHours(data: WorkingHoursUpdateData) {
  const business = await getOwnedBusiness();

  await Promise.all(
    data.map((day) =>
      prisma.workingHours.upsert({
        where: {
          businessId_dayOfWeek: {
            businessId: business.id,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {
          isOpen: day.isOpen,
          openTime: day.openTime,
          closeTime: day.closeTime,
        },
        create: {
          businessId: business.id,
          dayOfWeek: day.dayOfWeek,
          isOpen: day.isOpen,
          openTime: day.openTime,
          closeTime: day.closeTime,
        },
      })
    )
  );

  revalidatePath("/business/hours");
}

// ─── Settings ─────────────────────────────────────────────────
export type BusinessSettingsData = {
  advanceBookingDays?: number;
  minAdvanceHours?: number;
  timeSlotDuration?: number;
  cancellationHours?: number;
  cancellationFeeType?: string;
  cancellationFeeValue?: number;
};

export async function updateBusinessSettings(data: BusinessSettingsData) {
  const business = await getOwnedBusiness();

  await prisma.business.update({
    where: { id: business.id },
    data: {
      advanceBookingDays: data.advanceBookingDays,
      minAdvanceHours: data.minAdvanceHours,
      timeSlotDuration: data.timeSlotDuration,
      cancellationHours: data.cancellationHours,
      cancellationFeeType: data.cancellationFeeType,
      cancellationFeeValue: data.cancellationFeeValue,
    },
  });

  revalidatePath("/business/settings");
}
