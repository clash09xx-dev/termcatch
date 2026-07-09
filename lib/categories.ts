import { ServiceCategory } from "@prisma/client";

// ─── Single source of truth: enum ↔ slug ↔ label ────────────────────────────
// Every category link, filter, and label on the public site goes through
// this module so URLs, the Prisma enum, and Polish labels can never drift.

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
  if (upper in ServiceCategory) return upper as ServiceCategory;
  return SLUG_TO_VALUE[value.toLowerCase()];
}

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}
