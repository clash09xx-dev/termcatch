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
  /** Requested day: 0 = dzisiaj, 1 = jutro, 2 = pojutrze (Warsaw calendar). */
  dayOffset?: 0 | 1 | 2;
  /** "po 17:00" → 1020 — only slots starting at/after this Warsaw minute. */
  afterMinutes?: number;
};

export const DAY_WORDS: Record<0 | 1 | 2, string> = { 0: "dzisiaj", 1: "jutro", 2: "pojutrze" };

export type DiscoveryResult = {
  slug: string;
  name: string;
  city: string;
  logoUrl: string | null;
  rating: number;
  reviewCount: number;
  priceFrom: number | null;
  reasons: string[];
  /** Matched service (when the query matched one) — used for direct booking links. */
  serviceId: string | null;
  /** Real earliest free slot for the requested day, e.g. "16:30" — never invented. */
  slotLabel: string | null;
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

/** Major Polish cities — merged into interpretation so "w Warszawie" is
 * understood even before any salon exists there (search itself stays honest:
 * an empty DB result produces the no-results message, never fabrications). */
export const MAJOR_CITIES = [
  "Warszawa", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin",
  "Bydgoszcz", "Lublin", "Białystok", "Katowice", "Gdynia", "Częstochowa",
  "Radom", "Toruń", "Sosnowiec", "Rzeszów", "Kielce", "Gliwice", "Olsztyn",
  "Zabrze", "Bielsko-Biała", "Opole", "Zielona Góra",
];

export function timeLabelFromMinutes(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
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

    // Requested day — "pojutrze" first ("pojutrze" contains "jutro").
    if (text.includes("pojutrze")) filters.dayOffset = 2;
    else if (text.includes("jutro")) filters.dayOffset = 1;
    else if (/\bdzis(iaj)?\b/.test(text) || text.includes("na dzis")) filters.dayOffset = 0;

    // Time bound — "po 17", "po 17:30", "od 18:00".
    const after = text.match(/\b(?:po|od)\s+(\d{1,2})(?::(\d{2}))?\b/);
    if (after) {
      const h = parseInt(after[1], 10);
      const m = after[2] ? parseInt(after[2], 10) : 0;
      // Only treat plausible clock times as times (not "po 200 zł" etc.).
      if (h >= 6 && h <= 23 && m < 60) {
        filters.afterMinutes = h * 60 + m;
        if (filters.dayOffset === undefined) filters.dayOffset = 0; // a time implies "today"
      }
    }

    // Service words: generic service nouns worth matching against real names.
    const serviceWords = ["strzyzenie", "farbowanie", "manicure", "pedicure", "masaz", "depilacja", "makijaz", "fryzjer", "peeling", "regulacja"];
    const found = serviceWords.find((s) => text.includes(s));
    if (found) filters.serviceQuery = found;

    return filters;
  }
}

/** The follow-up question for missing info — one at a time, city first. */
export function nextQuestion(f: DiscoveryFilters): string | null {
  if (!f.cityQuery) return "W jakim mieście mam szukać?";
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
  /** Public salon description — scanned for keyword matches. */
  description?: string | null;
  services: {
    id?: string;
    name: string;
    price: number;
    discountedPrice: number | null;
    description?: string | null;
  }[];
  /** Real earliest free slot (Warsaw minutes) for the requested day, computed
   * by the caller from the availability system; null = nothing free. */
  earliestSlotMin?: number | null;
};

export function rankSalons(salons: RankableSalon[], f: DiscoveryFilters, limit = 5): DiscoveryResult[] {
  const requiresMatch = Boolean(f.specialty || f.serviceQuery);
  const requiresSlot = f.dayOffset !== undefined;
  const dayWord = f.dayOffset !== undefined ? DAY_WORDS[f.dayOffset] : null;

  // Needles for text matching: the matched tag's keyword stems + the raw
  // service query — scanned against service names/descriptions and the salon
  // description (all normalized, diacritic-insensitive).
  const tag = f.specialty ? SPECIALTY_TAGS.find((t) => t.slug === f.specialty) : undefined;
  const needles = [
    ...(tag ? tag.keywords.map(normalizeText) : []),
    ...(f.serviceQuery ? [normalizeText(f.serviceQuery)] : []),
  ];
  const hasNeedle = (text: string | null | undefined) =>
    !!text && needles.some((n) => normalizeText(text).includes(n));

  const scored = salons.map((s) => {
    const reasons: string[] = [];
    let score = 0;
    let matched = false;
    let serviceId: string | null = null;

    // 1) Structured specialty tag — strongest signal.
    if (f.specialty && s.specialties.includes(f.specialty)) {
      score += 100;
      matched = true;
      reasons.push(`Pasuje do zapytania: ${specialtyLabel(f.specialty)}`);
    }

    let priceFrom: number | null = null;
    const activePrices = s.services.map((sv) => sv.discountedPrice ?? sv.price);
    if (activePrices.length) priceFrom = Math.min(...activePrices);

    // 2) A concrete service whose name/description matches.
    const svcMatch = s.services.find(
      (sv) => hasNeedle(sv.name) || hasNeedle(sv.description)
    );
    if (svcMatch && needles.length > 0) {
      score += 60;
      matched = true;
      serviceId = svcMatch.id ?? null;
      reasons.push(`usługa: ${svcMatch.name}`);
    }

    // 3) Keyword found in the salon's own description (weaker evidence).
    if (!matched && needles.length > 0 && hasNeedle(s.description)) {
      score += 30;
      matched = true;
      reasons.push(`Pasuje do zapytania: ${tag ? specialtyLabel(tag.slug) : f.serviceQuery}`);
    }

    if (f.maxPrice != null && priceFrom != null && priceFrom <= f.maxPrice) {
      score += 20;
      reasons.push(`ceny od ${Math.round(priceFrom)} zł`);
    }

    // 4) Real availability on the requested day (computed by the caller from
    //    the actual availability system — never invented here).
    const slotMin = s.earliestSlotMin ?? null;
    if (requiresSlot && slotMin != null && dayWord) {
      score += 40;
      reasons.push(`wolny termin ${dayWord} o ${timeLabelFromMinutes(slotMin)}`);
    }

    // 5) Rating confidence: rating weighted by review volume (log damped).
    if (s.totalReviews > 0) {
      score += s.averageRating * Math.min(Math.log10(s.totalReviews + 1), 1.5) * 8;
      reasons.push(`ocena ${s.averageRating.toFixed(1).replace(".", ",")} (${s.totalReviews} opinii)`);
    }

    reasons.push(s.city);
    return { s, score, reasons, priceFrom, matched, serviceId, slotMin };
  });

  // Honesty rules: a requested specialty/service must actually be offered
  // (rating alone never fabricates a match), and a requested day must have a
  // REAL free slot — salons without one are not shown as available.
  return scored
    .filter((x) => (requiresMatch ? x.matched : true))
    .filter((x) => (requiresSlot ? x.slotMin != null : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s, reasons, priceFrom, serviceId, slotMin }) => ({
      slug: s.slug,
      name: s.name,
      city: s.city,
      logoUrl: s.logoUrl,
      rating: s.averageRating,
      reviewCount: s.totalReviews,
      priceFrom,
      reasons: reasons.slice(0, 4),
      serviceId,
      slotLabel: slotMin != null ? timeLabelFromMinutes(slotMin) : null,
      sponsored: false,
    }));
}

// ── Provider boundary for a future external AI model ─────────
// The chat UI and the search/scoring pipeline depend only on these types.
// Swapping the deterministic interpreter for an LLM-backed provider later
// means implementing CustomerAssistantProvider server-side — nothing else
// changes. No paid provider is referenced or required today.
export type CustomerAssistantProvider = DiscoveryInterpreter;
export const LocalRecommendationProvider = DeterministicInterpreter;
