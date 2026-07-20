// ─── Marketplace text search (normalized Polish, synonym-aware) ──────────────
// Builds the Prisma `where` for /search and category pages. A typed word is
// matched three ways so "fryzjer" finds a HAIR_SALON business even when the
// literal word is absent from its name/services:
//   1. substring on name / description / shortDescription / service name+desc
//   2. synonym → category enum (resolveQueryCategories)
//   3. synonym → specialty slug (SPECIALTY_TAGS) against Business.specialties
// Publication + medical gating is inherited from publicDiscoveryWhere, so no
// draft/pending/suspended/test or hidden-medical business can ever match.

import { Prisma, type ServiceCategory } from "@prisma/client";
import { normalizeText, MAJOR_CITIES, SPECIALTY_TAGS } from "@/lib/discovery";
import {
  parseCategoryParam,
  resolveQueryCategories,
  isMedicalCategory,
  medicalCategoriesEnabled,
} from "@/lib/categories";
import { publicDiscoveryWhere } from "@/lib/publication";

/** Untrusted input hardening: collapse whitespace + hard length cap. */
export const MAX_QUERY_LEN = 100;
export function sanitizeQuery(raw?: string | null): string {
  if (!raw) return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LEN);
}

const CITY_BY_NORM = new Map(MAJOR_CITIES.map((c) => [normalizeText(c), c]));

/**
 * Resolve a user-typed city to the set of spellings to match, diacritic-tolerant.
 * "Krakow" and "Kraków" both resolve to include canonical "Kraków". Unknown
 * cities fall back to the raw input.
 */
export function resolveCitySpellings(city?: string | null): string[] {
  const raw = (city ?? "").trim();
  if (!raw) return [];
  const canonical = CITY_BY_NORM.get(normalizeText(raw));
  const set = new Set<string>([raw]);
  if (canonical) set.add(canonical);
  return [...set];
}

function specialtyMatches(normalizedQuery: string): string[] {
  if (!normalizedQuery) return [];
  const out = new Set<string>();
  for (const tag of SPECIALTY_TAGS) {
    if (tag.keywords.some((k) => normalizedQuery.includes(normalizeText(k)))) out.add(tag.slug);
  }
  return [...out];
}

export type SearchWhereInput = {
  q?: string | null;
  city?: string | null;
  category?: string | null;
};

/**
 * The single Prisma `where` used by public discovery. Combines the publication +
 * medical gate with city and free-text matching. Returns a `where` that yields
 * nothing when an explicit hidden (medical-off) category is requested.
 */
export function buildBusinessSearchWhere(input: SearchWhereInput): Prisma.BusinessWhereInput {
  const q = sanitizeQuery(input.q);
  const and: Prisma.BusinessWhereInput[] = [];

  // Explicit category param (from a category link or the filter dropdown).
  const explicit = parseCategoryParam(input.category ?? undefined);
  let categoryCondition: Prisma.BusinessWhereInput | undefined;
  if (explicit) {
    if (isMedicalCategory(explicit) && !medicalCategoriesEnabled()) {
      // A hidden category was requested directly — return nothing, honestly.
      return { AND: [{ id: "__none__" }] };
    }
    categoryCondition = { category: explicit };
  }

  // City (diacritic-tolerant).
  const cities = resolveCitySpellings(input.city);
  if (cities.length > 0) {
    and.push({
      OR: cities.map((c) => ({ city: { contains: c, mode: Prisma.QueryMode.insensitive } })),
    });
  }

  // Free-text: substring + synonym→category + synonym→specialty.
  if (q) {
    const normalized = normalizeText(q);
    const cats: ServiceCategory[] = resolveQueryCategories(normalized);
    const specialties = specialtyMatches(normalized);
    const or: Prisma.BusinessWhereInput[] = [
      { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
      { shortDescription: { contains: q, mode: Prisma.QueryMode.insensitive } },
      {
        services: {
          some: {
            isActive: true,
            OR: [
              { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
          },
        },
      },
    ];
    if (cats.length > 0) or.push({ category: { in: cats } });
    if (specialties.length > 0) or.push({ specialties: { hasSome: specialties } });
    and.push({ OR: or });
  }

  return publicDiscoveryWhere({
    ...(categoryCondition ?? {}),
    ...(and.length > 0 ? { AND: and } : {}),
  });
}
