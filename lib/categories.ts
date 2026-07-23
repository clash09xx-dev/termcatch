import type { ServiceCategory } from "@prisma/client";

// ─── Single source of truth: enum ↔ slug ↔ label ────────────────────────────
// Every category link, filter, and label on the public site goes through
// this module so URLs, the Prisma enum, and Polish labels can never drift.
//
// IMPORTANT: this module is imported by CLIENT components (search filters,
// onboarding, profile). It therefore imports ServiceCategory as a TYPE ONLY —
// pulling the Prisma enum *value* into a client bundle makes Turbopack try to
// resolve `.prisma/client/index-browser` and crashes `/search` in dev. The
// runtime membership check uses SERVICE_CATEGORY_VALUES below instead, which a
// compile-time guard keeps exactly in sync with the Prisma enum.

// Client-safe list of every ServiceCategory enum member (plain string literals,
// no @prisma/client runtime import). Keep in the schema's order.
export const SERVICE_CATEGORY_VALUES = [
  "HAIR_SALON", "BARBER", "NAIL_SALON", "MASSAGE", "SPA", "BEAUTY_CLINIC", "TATTOO",
  "PIERCING", "EYEBROWS_LASHES", "MAKEUP", "TANNING",
  "PHYSIOTHERAPY", "PERSONAL_TRAINER", "YOGA", "PILATES", "NUTRITIONIST",
  "PSYCHOLOGIST", "PSYCHIATRIST", "DIETICIAN",
  "GENERAL_PHYSICIAN", "DENTIST", "DERMATOLOGIST", "GYNECOLOGIST", "OPHTHALMOLOGIST",
  "ORTHOPEDIST", "PEDIATRICIAN", "CARDIOLOGIST", "NEUROLOGIST", "UROLOGIST", "ENT",
  "ENDOCRINOLOGIST", "ALLERGOLOGIST", "RHEUMATOLOGIST", "RADIOLOGIST", "VETERINARIAN",
  "DENTAL_HYGIENIST",
  "CAR_WASH", "CAR_DETAILING", "MECHANIC", "TIRE_SERVICE", "CAR_INSPECTION", "PARKING",
  "TENNIS_COURT", "FOOTBALL_PITCH", "BASKETBALL_COURT", "SWIMMING_POOL", "GYM", "GOLF",
  "SQUASH", "BADMINTON", "CLIMBING_WALL",
  "TUTOR", "LANGUAGE_SCHOOL", "DRIVING_SCHOOL", "MUSIC_SCHOOL", "ART_CLASSES",
  "CLEANING", "PLUMBER", "ELECTRICIAN", "HANDYMAN",
  "PHOTOGRAPHY", "PET_GROOMING", "OTHER",
] as const;

const SERVICE_CATEGORY_SET = new Set<string>(SERVICE_CATEGORY_VALUES);

// Compile-time drift guard (both directions). If the Prisma enum and the list
// above diverge, one of these type aliases resolves to a non-`true` type and
// the build fails — no runtime cost, no client bundle impact.
type AssertTrue<T extends true> = T;
type _NoExtraCategory = AssertTrue<
  [Exclude<(typeof SERVICE_CATEGORY_VALUES)[number], ServiceCategory>] extends [never] ? true : false
>;
type _NoMissingCategory = AssertTrue<
  [Exclude<ServiceCategory, (typeof SERVICE_CATEGORY_VALUES)[number]>] extends [never] ? true : false
>;

export interface CategoryDef {
  value: ServiceCategory;
  slug: string;
  label: string;
}

// User-facing marketplace categories, in menu order.
export const CATEGORIES: CategoryDef[] = [
  { value: "HAIR_SALON", slug: "fryzjer", label: "Fryzjer" },
  { value: "BARBER", slug: "barber", label: "Barber" },
  { value: "NAIL_SALON", slug: "paznokcie", label: "Paznokcie" },
  { value: "MASSAGE", slug: "masaz", label: "Masaż" },
  { value: "SPA", slug: "spa", label: "SPA & Wellness" },
  { value: "BEAUTY_CLINIC", slug: "kosmetyczka", label: "Klinika urody" },
  { value: "EYEBROWS_LASHES", slug: "brwi-rzesy", label: "Brwi & Rzęsy" },
  { value: "MAKEUP", slug: "makijaz", label: "Makijaż" },
  { value: "TATTOO", slug: "tatuaz", label: "Tatuaż" },
  { value: "PIERCING", slug: "piercing", label: "Piercing" },
  { value: "TANNING", slug: "solarium", label: "Solarium" },
  { value: "PHYSIOTHERAPY", slug: "fizjoterapia", label: "Fizjoterapia" },
  { value: "PERSONAL_TRAINER", slug: "trener", label: "Trener personalny" },
  { value: "YOGA", slug: "joga", label: "Joga" },
  { value: "PILATES", slug: "pilates", label: "Pilates" },
  { value: "NUTRITIONIST", slug: "dietetyk", label: "Dietetyk" },
  { value: "PSYCHOLOGIST", slug: "psycholog", label: "Psycholog" },
  { value: "GENERAL_PHYSICIAN", slug: "lekarz", label: "Lekarz ogólny" },
  { value: "DENTIST", slug: "stomatolog", label: "Stomatolog" },
  { value: "DERMATOLOGIST", slug: "dermatolog", label: "Dermatolog" },
];

// Full enum → label map (covers categories not exposed in the picker,
// so cards can always render a Polish label).
export const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])),
  PSYCHIATRIST: "Psychiatra",
  DIETICIAN: "Dietetyk",
  GYNECOLOGIST: "Ginekolog",
  OPHTHALMOLOGIST: "Okulista",
  ORTHOPEDIST: "Ortopeda",
  PEDIATRICIAN: "Pediatra",
  CARDIOLOGIST: "Kardiolog",
  NEUROLOGIST: "Neurolog",
  UROLOGIST: "Urolog",
  ENT: "Laryngolog",
  ENDOCRINOLOGIST: "Endokrynolog",
  ALLERGOLOGIST: "Alergolog",
  RHEUMATOLOGIST: "Reumatolog",
  RADIOLOGIST: "Radiolog",
  VETERINARIAN: "Weterynarz",
  DENTAL_HYGIENIST: "Higienistka stomatologiczna",
  PET_GROOMING: "Grooming",
  PHOTOGRAPHY: "Fotografia",
};

// Legacy slugs that shipped in old links (homepage pills, /categories page).
// Kept so those URLs keep working instead of silently not filtering.
const LEGACY_ALIASES: Record<string, ServiceCategory> = {
  hair_salon: "HAIR_SALON",
  barbershop: "BARBER",
  barber: "BARBER",
  massage: "MASSAGE",
  nail_salon: "NAIL_SALON",
  beauty_salon: "BEAUTY_CLINIC",
  beauty_clinic: "BEAUTY_CLINIC",
  tattoo: "TATTOO",
  spa: "SPA",
  makeup: "MAKEUP",
  brows_lashes: "EYEBROWS_LASHES",
  eyebrows_lashes: "EYEBROWS_LASHES",
  physiotherapy: "PHYSIOTHERAPY",
  podology: "PHYSIOTHERAPY",
  dietician: "NUTRITIONIST",
  personal_trainer: "PERSONAL_TRAINER",
  tanning: "TANNING",
  yoga: "YOGA",
  pilates: "PILATES",
  piercing: "PIERCING",
  psychologist: "PSYCHOLOGIST",
  general_physician: "GENERAL_PHYSICIAN",
  dentist: "DENTIST",
  dermatologist: "DERMATOLOGIST",
};

const SLUG_TO_VALUE: Record<string, ServiceCategory> = {
  ...LEGACY_ALIASES,
  ...Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.value])),
};

// Accepts an enum name (any case), a canonical slug, or a legacy slug.
// Returns undefined for unknown values — caller treats that as "no filter".
export function parseCategoryParam(value?: string): ServiceCategory | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  // Client-safe membership check (no Prisma enum value at runtime).
  if (SERVICE_CATEGORY_SET.has(upper)) return upper as ServiceCategory;
  return SLUG_TO_VALUE[value.toLowerCase()];
}

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

// ─── Medical categories — hidden from public discovery until launch-ready ─────
// These require professional verification and are not part of the initial public
// launch. The enum values stay in the schema (existing records are untouched);
// they are simply not discoverable while the flag is off. Physiotherapy stays
// visible (initial scope). Toggle with NEXT_PUBLIC_ENABLE_MEDICAL_CATEGORIES=true.
export const MEDICAL_CATEGORY_VALUES: ServiceCategory[] = [
  "GENERAL_PHYSICIAN", "DENTIST", "DERMATOLOGIST", "GYNECOLOGIST", "OPHTHALMOLOGIST",
  "ORTHOPEDIST", "PEDIATRICIAN", "CARDIOLOGIST", "NEUROLOGIST", "UROLOGIST", "ENT",
  "ENDOCRINOLOGIST", "ALLERGOLOGIST", "RHEUMATOLOGIST", "RADIOLOGIST",
  "DENTAL_HYGIENIST", "PSYCHOLOGIST", "PSYCHIATRIST",
];

const MEDICAL_SET = new Set<string>(MEDICAL_CATEGORY_VALUES);

// ─── Explicit category policy ────────────────────────────────────────────────
// Medical categories (doctors, dentists, dermatologists, psychologists, …) are
// ALWAYS hidden from the current product — there is no broad switch that can
// un-hide them (the former NEXT_PUBLIC_ENABLE_MEDICAL_CATEGORIES is intentionally
// gone, so aesthetic services stay available while medical stays disabled).
// The ONLY aesthetic / aesthetic-medicine category kept public is BEAUTY_CLINIC
// ("Klinika urody"), which is deliberately NOT in MEDICAL_CATEGORY_VALUES.
// Enum values + DB records are preserved; to re-enable a specific category in
// future, remove it from MEDICAL_CATEGORY_VALUES.

export function isMedicalCategory(value: string): boolean {
  return MEDICAL_SET.has(value);
}

/** Category values that must NOT appear in public discovery. */
export function hiddenCategoryValues(): ServiceCategory[] {
  return MEDICAL_CATEGORY_VALUES;
}

/** The category picker, with medical entries removed (aesthetic kept). */
export function visibleCategories(): CategoryDef[] {
  return CATEGORIES.filter((c) => !MEDICAL_SET.has(c.value));
}

// ─── Text → category synonyms (centralized; shared by search + assistant) ─────
// Diacritic-insensitive stems (see normalizeSearchText). A typed word like
// "fryzjer" resolves to HAIR_SALON so ordinary search finds a hair salon even
// when the literal word is absent from its name/services.
const CATEGORY_SYNONYMS: { stems: string[]; category: ServiceCategory }[] = [
  { stems: ["fryzjer", "wlos", "strzyzenie", "koloryzacj", "farbowan", "loki", "krecone", "curly", "baleyage", "balayage", "ombre"], category: "HAIR_SALON" },
  { stems: ["barber", "barbershop", "broda", "brody", "zarost", "meskie strzyzenie", "golenie"], category: "BARBER" },
  { stems: ["paznokc", "manicure", "pedicure", "hybryd", "zelowe", "tips"], category: "NAIL_SALON" },
  { stems: ["masaz", "masazyst", "relaksacyjny", "sportowy", "leczniczy", "kregoslup"], category: "MASSAGE" },
  { stems: ["spa", "wellness", "sauna"], category: "SPA" },
  { stems: ["kosmetyczk", "salon urody", "uroda", "twarz", "oczyszczanie", "peeling", "mezoterapi"], category: "BEAUTY_CLINIC" },
  { stems: ["brwi", "rzes", "laminacj", "henna", "lash", "brow"], category: "EYEBROWS_LASHES" },
  { stems: ["makijaz", "makeup", "wizaz"], category: "MAKEUP" },
  { stems: ["tatuaz", "tattoo", "dziara"], category: "TATTOO" },
  { stems: ["piercing", "kolczyk"], category: "PIERCING" },
  { stems: ["solarium", "opalanie", "tanning"], category: "TANNING" },
  { stems: ["fizjoterapi", "fizjoterapeut", "rehabilitacj"], category: "PHYSIOTHERAPY" },
  { stems: ["trener", "trening", "personalny"], category: "PERSONAL_TRAINER" },
  { stems: ["joga", "yoga"], category: "YOGA" },
  { stems: ["pilates"], category: "PILATES" },
  { stems: ["dietetyk", "dieta", "zywienie"], category: "NUTRITIONIST" },
  { stems: ["psycholog", "psychoterapi", "terapeut"], category: "PSYCHOLOGIST" },
  { stems: ["dentyst", "stomatolog", "zeby", "zab"], category: "DENTIST" },
  { stems: ["dermatolog", "skora"], category: "DERMATOLOGIST" },
  { stems: ["lekarz", "internist"], category: "GENERAL_PHYSICIAN" },
];

/**
 * Resolve free text to matching category enum values via the synonym dictionary,
 * dropping any that are currently hidden (medical off). Never throws; returns []
 * when nothing matches. Input should be pre-normalized with normalizeSearchText.
 */
export function resolveQueryCategories(normalizedQuery: string): ServiceCategory[] {
  if (!normalizedQuery) return [];
  const hidden = new Set<string>(hiddenCategoryValues());
  const out = new Set<ServiceCategory>();
  for (const { stems, category } of CATEGORY_SYNONYMS) {
    if (hidden.has(category)) continue;
    if (stems.some((s) => normalizedQuery.includes(s))) out.add(category);
  }
  return [...out];
}
