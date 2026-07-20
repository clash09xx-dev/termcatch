// ─── Business publication gate + lifecycle (single source of truth) ──────────
// Public lifecycle (reusing the existing BusinessStatus enum — no migration):
//   PENDING_VERIFICATION  → onboarding incomplete / not yet publishable (NOT public).
//                           NO manual admin approval — the salon AUTO-PUBLISHES
//                           (→ ACTIVE) the moment its profile is complete
//                           (see lib/publish.ts autoPublishIfComplete).
//   ACTIVE                → published (the ONLY publicly discoverable state)
//   SUSPENDED             → hidden by an admin for moderation (NOT public);
//                           never auto-reactivated.
//   BANNED / CLOSED       → not public
//
// Every public surface (search, category, profile, booking, sitemap, structured
// data, customer assistant) MUST gate through PUBLIC_BUSINESS_WHERE so a
// test/draft/pending/suspended salon can never leak. Gating is authoritative
// (status + isActive) — never name-based ("contains 'test'").

import { BusinessStatus } from "@prisma/client";
import { hiddenCategoryValues } from "@/lib/categories";

/** The authoritative "is this business publicly visible" filter. */
export const PUBLIC_BUSINESS_WHERE = {
  status: BusinessStatus.ACTIVE,
  isActive: true,
} as const;

export function isPubliclyVisible(b: { status: BusinessStatus; isActive: boolean }): boolean {
  return b.status === BusinessStatus.ACTIVE && b.isActive === true;
}

/**
 * Public filter for DISCOVERY surfaces (search, category, sitemap, assistant):
 * published-and-active AND not in a currently-hidden category (medical off).
 * Merge extra conditions (city, category, OR clauses) via the argument.
 */
export function publicDiscoveryWhere<T extends Record<string, unknown>>(extra?: T) {
  const hidden = hiddenCategoryValues();
  return {
    ...PUBLIC_BUSINESS_WHERE,
    ...(hidden.length > 0 ? { category: { notIn: hidden } } : {}),
    ...(extra ?? {}),
  };
}

// ─── Pre-publication validation ──────────────────────────────────────────────
// Authoritative completeness check a business must pass before an owner can
// submit for verification / an admin can publish. Presence/validity only — never
// inspects the name text for "test".

export type PublicationCheckInput = {
  name: string | null;
  category: unknown;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  activeServices: { price: number; duration: number }[];
  /** Optional — retained for compatibility; NOT required to publish (a solo
   *  salon books via "dowolny specjalista", so a separate employee record is
   *  not mandatory). */
  activeEmployees?: number;
  openDays: number; // count of WorkingHours rows with isOpen
};

export type PublicationRequirement = { key: string; label: string; ok: boolean };

export function publicationRequirements(input: PublicationCheckInput): PublicationRequirement[] {
  const hasName = !!input.name && input.name.trim().length >= 2;
  const hasCategory = !!input.category;
  const hasCity = !!input.city && input.city.trim().length >= 2;
  const hasAddress = !!input.address && input.address.trim().length >= 3;
  const hasContact = (!!input.phone && input.phone.trim().length >= 6) || (!!input.email && input.email.trim().length >= 5);
  const hasService = input.activeServices.length > 0;
  // Prices must be > 0 (a 0 zł service is treated as incomplete, not "free").
  const pricesValid = hasService && input.activeServices.every((s) => s.price > 0);
  const durationsValid = hasService && input.activeServices.every((s) => s.duration > 0);
  const hasHours = input.openDays > 0;

  // Employee is intentionally NOT a hard requirement — bookings work with
  // "dowolny specjalista" (employeeId null), so solo salons must be able to go live.
  return [
    { key: "name", label: "Nazwa salonu", ok: hasName },
    { key: "category", label: "Kategoria", ok: hasCategory },
    { key: "city", label: "Miasto", ok: hasCity },
    { key: "address", label: "Adres", ok: hasAddress },
    { key: "contact", label: "Telefon lub e-mail kontaktowy", ok: hasContact },
    { key: "service", label: "Co najmniej jedna aktywna usługa", ok: hasService },
    { key: "price", label: "Każda usługa ma cenę większą niż 0 zł", ok: pricesValid },
    { key: "duration", label: "Każda usługa ma prawidłowy czas trwania", ok: durationsValid },
    { key: "hours", label: "Godziny otwarcia (co najmniej jeden dzień)", ok: hasHours },
  ];
}

export function validateForPublication(input: PublicationCheckInput): {
  ok: boolean;
  requirements: PublicationRequirement[];
  missing: PublicationRequirement[];
} {
  const requirements = publicationRequirements(input);
  const missing = requirements.filter((r) => !r.ok);
  return { ok: missing.length === 0, requirements, missing };
}

/** Polish label for a status, for owner/admin UI. */
export const STATUS_LABELS: Record<BusinessStatus, string> = {
  PENDING_VERIFICATION: "Profil w przygotowaniu",
  ACTIVE: "Opublikowany",
  SUSPENDED: "Zawieszony",
  BANNED: "Zablokowany",
  CLOSED: "Zamknięty",
};
