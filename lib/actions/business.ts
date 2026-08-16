"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/supabase/server";
import { ServiceCategory, DayOfWeek } from "@prisma/client";
import { redirect } from "next/navigation";
import { SPECIALTY_TAGS } from "@/lib/discovery";
import { isSelectableCategory } from "@/lib/categories";
import { autoPublishIfComplete } from "@/lib/publish";
import { isValidPolishPostalCode, normalizePolishPostalCode } from "@/lib/postal-code";

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

  // A named service must have a real price AND a sane duration — 0 zł or
  // 0/absurd-minute services were going public and breaking the slot grid.
  if (data.serviceName.trim()) {
    if (!data.servicePrice || data.servicePrice <= 0) {
      throw new Error("Podaj cenę usługi większą niż 0 zł.");
    }
    if (!data.serviceDuration || data.serviceDuration < 5 || data.serviceDuration > 480) {
      throw new Error("Czas trwania usługi musi wynosić od 5 do 480 minut.");
    }
  }

  // Postal code must be a valid Polish "NN-NNN" (normalized server-side too, so a
  // frontend bypass can't persist a malformed code).
  const postalCode = normalizePolishPostalCode(data.postalCode);
  if (!isValidPolishPostalCode(postalCode)) {
    throw new Error("Podaj kod pocztowy w formacie NN-NNN (np. 30-001).");
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
      postalCode,
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
  revalidatePath("/categories");
  revalidatePath(`/b/${business.slug}`);
  return { ok: true, active };
}

// ─── Profile ──────────────────────────────────────────────────
export type BusinessProfileData = {
  name?: string;
  description?: string;
  shortDescription?: string;
  /**
   * Main category. Editable, and restricted server-side to the SELECTABLE set.
   *
   * It used to be write-once at onboarding, shown as a disabled input reading
   * "cannot be changed, contact support". Category decides search eligibility,
   * so a salon that mis-picked one during registration — or picked one that has
   * since been withdrawn from discovery — was permanently unfindable with no
   * self-service way out. Letting the owner correct it is the fix; the
   * allow-list is what keeps it safe (see below).
   */
  category?: string;
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

  // Validate before persisting — these render on the PUBLIC profile, so URLs
  // (logo/cover/socials rendered as <img>/links) must be real http(s) URLs and
  // free text must be length-bounded.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isHttpUrl = (s: string) => /^https?:\/\//i.test(s) && s.length <= 2048;
  // string field: undefined → skip; else trim + clamp
  const s = (v: string | undefined, max: number) => (v === undefined ? undefined : v.trim().slice(0, max));
  // url field: undefined → skip; "" → clear (null); non-empty → must be http(s)
  const url = (v: string | undefined, label: string): string | null | undefined => {
    if (v === undefined) return undefined;
    const t = v.trim();
    if (!t) return null;
    if (!isHttpUrl(t)) throw new Error(`Nieprawidłowy adres ${label} (użyj http/https).`);
    return t.slice(0, 2048);
  };
  if (data.email && data.email.trim() && !EMAIL_RE.test(data.email.trim())) {
    throw new Error("Nieprawidłowy adres e-mail.");
  }
  // Category: undefined → skip; otherwise it must be one the picker actually
  // offers. Validating against SELECTABLE_CATEGORY_VALUES (visible + "Other")
  // rather than the raw enum means an owner can move OUT of a withdrawn
  // category but never INTO one by posting a crafted value — medical categories
  // require verification the product does not yet do.
  const category = ((): ServiceCategory | undefined => {
    if (data.category === undefined) return undefined;
    const v = String(data.category).trim();
    if (!isSelectableCategory(v)) throw new Error("Nieprawidłowa kategoria.");
    return v as ServiceCategory;
  })();

  // postal field: undefined → skip; else normalize + validate NN-NNN
  const postal = (v: string | undefined): string | undefined => {
    if (v === undefined) return undefined;
    const n = normalizePolishPostalCode(v);
    if (n && !isValidPolishPostalCode(n)) {
      throw new Error("Podaj kod pocztowy w formacie NN-NNN (np. 30-001).");
    }
    return n;
  };

  await prisma.business.update({
    where: { id: business.id },
    data: {
      name: s(data.name, 120),
      description: s(data.description, 2000),
      shortDescription: s(data.shortDescription, 300),
      category,
      subcategory: s(data.subcategory, 80),
      phone: s(data.phone, 32),
      email: data.email === undefined ? undefined : data.email.trim().slice(0, 200) || null,
      website: url(data.website, "strony WWW"),
      address: s(data.address, 200),
      city: s(data.city, 100),
      postalCode: postal(data.postalCode),
      logoUrl: url(data.logoUrl, "logo"),
      coverImageUrl: url(data.coverImageUrl, "zdjęcia w tle"),
      instagramUrl: url(data.instagramUrl, "Instagram"),
      facebookUrl: url(data.facebookUrl, "Facebook"),
      ...(data.specialties
        ? { specialties: data.specialties.filter((sp) => SPECIALTY_TAGS.some((t) => t.slug === sp)).slice(0, 6) }
        : {}),
    },
  });

  // Completing contact/address details may make the profile publishable.
  await autoPublishIfComplete(business.id);
  revalidatePath("/business/profile");
  revalidatePath("/search");
  // A category change moves the salon in and out of discovery, so the surfaces
  // that list by category have to be refreshed too, not just search.
  revalidatePath("/categories");
  revalidatePath("/business/dashboard");
  revalidatePath(`/b/${business.slug}`);
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
