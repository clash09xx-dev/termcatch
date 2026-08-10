"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { ServiceCategory, DayOfWeek } from "@prisma/client";
import { redirect } from "next/navigation";
import { SPECIALTY_TAGS } from "@/lib/discovery";
import { autoPublishIfComplete } from "@/lib/publish";

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
      // New salons start non-public. They AUTO-PUBLISH (→ ACTIVE) below the
      // moment onboarding is complete — no manual admin approval. An incomplete
      // profile simply stays PENDING_VERIFICATION (hidden from all discovery).
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

  // Auto-publish immediately if onboarding produced a complete, bookable profile.
  const published = await autoPublishIfComplete(business.id);

  revalidatePath("/business/dashboard");
  revalidatePath("/search");
  return { success: true, published };
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

/**
 * Owner-facing public-profile visibility toggle. Flips Business.isActive — one
 * half of the authoritative public gate (status ACTIVE && isActive) — so
 * disabling instantly removes the salon from search, categories, recommendations
 * and the sitemap, and makes the direct /b/[slug] URL return not-found, WITHOUT
 * deleting the salon, services, appointments or account. Re-enabling restores it
 * (provided the salon is otherwise published/ACTIVE). Owner-scoped: touches only
 * the caller's own business. Does NOT override an admin SUSPENDED state (that
 * also requires status ACTIVE to be public).
 */
export async function setPublicProfileActive(active: boolean): Promise<{ ok: true; active: boolean }> {
  const business = await getOwnedBusiness();
  await prisma.business.update({
    where: { id: business.id },
    data: { isActive: active },
  });
  revalidatePath("/business/settings");
  revalidatePath("/business/dashboard");
  revalidatePath("/search");
  revalidatePath(`/b/${business.slug}`);
  return { ok: true, active };
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

  // Completing contact/address details may make the profile publishable.
  await autoPublishIfComplete(business.id);
  revalidatePath("/business/profile");
  revalidatePath("/search");
}

// ─── Working Hours ─────────────────────────────────────────────
export type WorkingHoursUpdateData = {
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}[];

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const hmToMin = (t: string): number => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export async function updateWorkingHours(data: WorkingHoursUpdateData) {
  const business = await getOwnedBusiness();

  // Server-side guard (never trust the client): every open day must have a valid
  // 24-hour "HH:MM" range that closes strictly after it opens.
  for (const day of data) {
    if (!day.isOpen) continue;
    if (!HHMM.test(day.openTime) || !HHMM.test(day.closeTime)) {
      throw new Error("Nieprawidłowy format godziny. Użyj formatu 24-godzinnego (np. 09:00).");
    }
    if (hmToMin(day.closeTime) <= hmToMin(day.openTime)) {
      throw new Error("Godzina zamknięcia musi być późniejsza niż godzina otwarcia.");
    }
  }

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

  await autoPublishIfComplete(business.id);
  revalidatePath("/business/hours");
  revalidatePath("/search");
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

  // Validate/clamp every field — these feed booking availability + the
  // cancellation policy, so negative/absurd client values must never persist.
  const clampInt = (v: unknown, min: number, max: number): number | undefined => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
  };
  const update: {
    advanceBookingDays?: number;
    minAdvanceHours?: number;
    timeSlotDuration?: number;
    cancellationHours?: number;
    cancellationFeeType?: string | null;
    cancellationFeeValue?: number;
  } = {};

  if (data.advanceBookingDays !== undefined) update.advanceBookingDays = clampInt(data.advanceBookingDays, 1, 365);
  if (data.minAdvanceHours !== undefined) update.minAdvanceHours = clampInt(data.minAdvanceHours, 0, 168);
  if (data.timeSlotDuration !== undefined) update.timeSlotDuration = clampInt(data.timeSlotDuration, 5, 480);
  if (data.cancellationHours !== undefined) update.cancellationHours = clampInt(data.cancellationHours, 0, 336);

  const feeType =
    data.cancellationFeeType === "percentage" || data.cancellationFeeType === "fixed"
      ? data.cancellationFeeType
      : data.cancellationFeeType === "" || data.cancellationFeeType === null
      ? null
      : undefined; // unknown string → ignore
  if (feeType !== undefined) update.cancellationFeeType = feeType;

  if (data.cancellationFeeValue !== undefined) {
    const v = Number(data.cancellationFeeValue);
    if (Number.isFinite(v) && v >= 0) {
      const isPct = (feeType ?? data.cancellationFeeType) === "percentage";
      update.cancellationFeeValue = Math.min(isPct ? 100 : 1_000_000, v);
    }
  }

  await prisma.business.update({ where: { id: business.id }, data: update });
  revalidatePath("/business/settings");
}
