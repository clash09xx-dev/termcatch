"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { multiLocationEnabled } from "@/lib/multi-location";

const COOKIE = "tc_active_location";

/**
 * The owner's currently-selected location id, or `null`.
 *
 * Returns `null` whenever the multi-location flag is OFF, so every consumer
 * (calendar, staff, services, bookings) that scopes its queries by this value
 * naturally falls back to unscoped, single-location behaviour — the app works
 * exactly as before. When the flag is on, the stored cookie is validated
 * against the owner's own locations before being trusted (no cross-tenant id),
 * defaulting to the primary/active location.
 */
export async function getActiveLocationId(businessId: string): Promise<string | null> {
  if (!multiLocationEnabled()) return null;

  const store = await cookies();
  const requested = store.get(COOKIE)?.value;

  if (requested) {
    const owned = await prisma.location.findFirst({
      where: { id: requested, businessId, isActive: true },
      select: { id: true },
    });
    if (owned) return owned.id;
  }

  // Fall back to the primary (then any active) location.
  const fallback = await prisma.location.findFirst({
    where: { businessId, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
    select: { id: true },
  });
  return fallback?.id ?? null;
}

/** Persist the owner's active-location choice (validated cookie set client-side via action). */
export async function setActiveLocation(locationId: string): Promise<{ ok: boolean }> {
  if (!multiLocationEnabled()) return { ok: false };
  const store = await cookies();
  store.set(COOKIE, locationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { ok: true };
}

/**
 * Query helper: turn an active-location id into a relation filter for models
 * that carry a location join (Employee.locationLinks, Service.locationLinks).
 * Returns `{}` when there is no active location, so it is a safe no-op under
 * single-location / flag-off conditions.
 */
export async function locationScopedEmployeeWhere(locationId: string | null) {
  return locationId ? { locationLinks: { some: { locationId } } } : {};
}

export async function locationScopedServiceWhere(locationId: string | null) {
  return locationId ? { locationLinks: { some: { locationId } } } : {};
}
