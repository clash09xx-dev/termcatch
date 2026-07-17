// ─── Discovery assistant — deterministic core (pure, testable) ───────────────
// No LLM is connected yet, so this module converts a customer's natural
// question into STRUCTURED filters via keyword matching against controlled
// vocabularies, and ranks REAL salons. It never fabricates data. The provider
// interface below lets a real language model replace `interpret` later
// without touching the UI or the search pipeline.

export type DiscoveryFilters = {
  cityQuery?: string; // normalized stem matched against real DB cities
  specialty?: string; // slug from SPECIALTY_TAGS
  serviceQuery?: string; // free text matched against real service names
  maxPrice?: number;
};

export type DiscoveryResult = {
  slug: string;
  name: string;
  city: string;
  logoUrl: string | null;
  rating: number;
  reviewCount: number;
  priceFrom: number | null;
  reasons: string[];
  /** Reserved for a future clearly-labelled paid placement. Always false today —
   * organic relevance is never replaced by payment. */
  sponsored: boolean;
};

export type AssistantReply =
  | { kind: "question"; text: string }
  | { kind: "results"; intro: string; results: DiscoveryResult[] }
  | { kind: "empty"; text: string };

/** Provider seam: swap DeterministicInterpreter for an LLM-backed one later. */
export interface DiscoveryInterpreter {
  /** Merge the whole conversation into structured filters. */
  interpret(userMessages: string[]): DiscoveryFilters;
}

// ── Controlled specialty tags (owner-picked, searchable) ──────
export const SPECIALTY_TAGS: { slug: string; label: string; keywords: string[] }[] = [
  { slug: "krecone-wlosy", label: "Kręcone włosy", keywords: ["krecon", "loki", "lokow", "curly", "afro"] },
  { slug: "koloryzacja", label: "Koloryzacja", keywords: ["koloryzacj", "farbowan", "balayage", "baleyage", "sombre", "ombre", "refleksy"] },
  { slug: "strzyzenie-meskie", label: "Strzyżenie męskie", keywords: ["meskie", "barber", "broda", "brody"] },
  { slug: "przedluzanie-wlosow", label: "Przedłużanie włosów", keywords: ["przedluzan", "doczepy"] },
  { slug: "stylizacja-slubna", label: "Stylizacja ślubna", keywords: ["slub", "wesel", "panna mloda"] },
  { slug: "manicure-hybrydowy", label: "Manicure hybrydowy", keywords: ["hybryd", "manicure", "paznokc"] },
  { slug: "przedluzanie-paznokci", label: "Przedłużanie paznokci", keywords: ["zelowe", "tips", "przedluzanie paznokci"] },
  { slug: "stylizacja-brwi", label: "Brwi i rzęsy", keywords: ["brwi", "rzes", "laminacj", "henna"] },
  { slug: "masaz-leczniczy", label: "Masaż leczniczy", keywords: ["leczniczy", "kregoslup", "rehabilitac"] },
  { slug: "masaz-relaksacyjny", label: "Masaż relaksacyjny", keywords: ["relaks", "aromater"] },
  { slug: "pielegnacja-twarzy", label: "Pielęgnacja twarzy", keywords: ["twarz", "oczyszczan", "peeling", "mezoterapi"] },
  { slug: "depilacja", label: "Depilacja", keywords: ["depilacj", "wosk", "laser"] },
];

export function specialtyLabel(slug: string): string {
  return SPECIALTY_TAGS.find((t) => t.slug === slug)?.label ?? slug;
}

// ── Text normalization (diacritic- and case-insensitive) ──────
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Match a token from the user's text (possibly inflected: "Warszawie",
 * "Krakowa") against a real city name from the DB ("Warszawa", "Kraków").
 * Deterministic stem comparison — a city matches only when one normalized
 * form is a prefix of the other with at least 4 shared characters.
 */
export function cityMatches(dbCity: string, userToken: string): boolean {
  const a = normalizeText(dbCity);
  const b = normalizeText(userToken);
  if (a.length < 3 || b.length < 3) return false;
  const stem = Math.min(a.length, b.length, Math.max(4, a.length - 3));
  if (stem < 3) return false;
  return a.slice(0, stem) === b.slice(0, stem);
}

// ── Deterministic interpreter ─────────────────────────────────
export class DeterministicInterpreter implements DiscoveryInterpreter {
  constructor(private knownCities: string[]) {}

  interpret(userMessages: string[]): DiscoveryFilters {
    const text = normalizeText(userMessages.join(" \n "));
    const filters: DiscoveryFilters = {};

    // City: try every known real city against every word of the text.
    const words = text.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    for (const city of this.knownCities) {
      if (words.some((w) => cityMatches(city, w))) {
        filters.cityQuery = city;
        break;
      }
    }

    // Specialty: first tag with any keyword present.
    for (const tag of SPECIALTY_TAGS) {
      if (tag.keywords.some((k) => text.includes(normalizeText(k)))) {
        filters.specialty = tag.slug;
        break;
      }
    }

    // Budget: "do 200 zł", "max 150", "budżet 300".
    const budget = text.match(/(?:do|max|maks|budzet(?:u|em)?)\s*(\d{2,5})\s*(?:zl|pln)?/);
    if (budget) filters.maxPrice = parseInt(budget[1], 10);

    // Service words: generic service nouns worth matching against real names.
    const serviceWords = ["strzyzenie", "farbowanie", "manicure", "pedicure", "masaz", "depilacja", "makijaz", "fryzjer", "peeling", "regulacja"];
    const found = serviceWords.find((s) => text.includes(s));
    if (found) filters.serviceQuery = found;

    return filters;
  }
}

/** The follow-up question for missing info — one at a time, city first. */
export function nextQuestion(f: DiscoveryFilters): string | null {
  if (!f.cityQuery) return "W jakim mieście szukasz salonu?";
  if (!f.specialty && !f.serviceQuery) return "Jakiej usługi lub specjalizacji szukasz? Np. koloryzacja, kręcone włosy, manicure…";
  return null;
}

// ── Ranking (pure) ────────────────────────────────────────────
export type RankableSalon = {
  slug: string;
  name: string;
  city: string;
  logoUrl: string | null;
  averageRating: number;
  totalReviews: number;
  specialties: string[];
  services: { name: string; price: number; discountedPrice: number | null }[];
};

export function rankSalons(salons: RankableSalon[], f: DiscoveryFilters, limit = 5): DiscoveryResult[] {
  const requiresMatch = Boolean(f.specialty || f.serviceQuery);
  const scored = salons.map((s) => {
    const reasons: string[] = [];
    let score = 0;
    let matched = false;

    if (f.specialty && s.specialties.includes(f.specialty)) {
      score += 100;
      matched = true;
      reasons.push(`specjalizacja: ${specialtyLabel(f.specialty)}`);
    }

    let priceFrom: number | null = null;
    const activePrices = s.services.map((sv) => sv.discountedPrice ?? sv.price);
    if (activePrices.length) priceFrom = Math.min(...activePrices);

    if (f.serviceQuery) {
      const match = s.services.find((sv) => normalizeText(sv.name).includes(normalizeText(f.serviceQuery!)));
      if (match) {
        score += 60;
        matched = true;
        reasons.push(`usługa: ${match.name}`);
      }
    }

    if (f.maxPrice != null && priceFrom != null && priceFrom <= f.maxPrice) {
      score += 20;
      reasons.push(`ceny od ${Math.round(priceFrom)} zł`);
    }

    // Rating confidence: rating weighted by review volume (log damped).
    if (s.totalReviews > 0) {
      score += s.averageRating * Math.min(Math.log10(s.totalReviews + 1), 1.5) * 8;
      reasons.push(`ocena ${s.averageRating.toFixed(1)} (${s.totalReviews} opinii)`);
    }

    reasons.push(s.city);
    return { s, score, reasons, priceFrom, matched };
  });

  // Honesty rule: when the customer asked for a concrete specialty/service,
  // only salons that actually offer it may appear — a high rating alone never
  // fabricates a match.
  return scored
    .filter((x) => (requiresMatch ? x.matched : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s, reasons, priceFrom }) => ({
      slug: s.slug,
      name: s.name,
      city: s.city,
      logoUrl: s.logoUrl,
      rating: s.averageRating,
      reviewCount: s.totalReviews,
      priceFrom,
      reasons: reasons.slice(0, 3),
      sponsored: false,
    }));
}
