/**
 * Lightweight, deterministic domain guard + intent classifier.
 *
 * Runs SERVER-SIDE BEFORE any model routing so obviously off-domain requests
 * (homework, math, essays, unrelated code, trivia) are refused for free — no
 * OpenAI call. Ambiguous requests pass through; the system prompt is the second
 * line of defence and refuses off-domain there too.
 *
 * Pure (no imports, no env, no DB) → safe in the client bundle and easy to test.
 */

import type { Locale } from "@/lib/i18n/config";

// Refusal copy in all four launch languages (kept here so the guard stays
// self-contained + testable; identical wording to the dictionaries).
export const REFUSAL_ASSISTANT_BY_LOCALE: Record<Locale, string> = {
  pl: "Pomagam tylko w sprawach związanych z TermCatch, rezerwacjami i prowadzeniem Twojego biznesu.",
  en: "I can only help with TermCatch, bookings, and running your business.",
  de: "Ich helfe nur bei TermCatch, Terminen und der Führung Ihres Unternehmens.",
  tr: "Yalnızca TermCatch, randevular ve işletmenizi yönetme konularında yardımcı olabilirim.",
};
export const REFUSAL_SEARCH_BY_LOCALE: Record<Locale, string> = {
  pl: "Mogę pomóc Ci znaleźć i zarezerwować usługę w TermCatch.",
  en: "I can help you find and book a service on TermCatch.",
  de: "Ich helfe Ihnen, eine Dienstleistung auf TermCatch zu finden und zu buchen.",
  tr: "TermCatch'te bir hizmet bulmanıza ve randevu almanıza yardımcı olabilirim.",
};
export function refusalAssistant(locale: Locale = "pl"): string {
  return REFUSAL_ASSISTANT_BY_LOCALE[locale] ?? REFUSAL_ASSISTANT_BY_LOCALE.pl;
}
export function refusalSearch(locale: Locale = "pl"): string {
  return REFUSAL_SEARCH_BY_LOCALE[locale] ?? REFUSAL_SEARCH_BY_LOCALE.pl;
}
// Back-compat PL aliases (used where a locale isn't threaded yet).
export const REFUSAL_ASSISTANT = REFUSAL_ASSISTANT_BY_LOCALE.pl;
export const REFUSAL_SEARCH = REFUSAL_SEARCH_BY_LOCALE.pl;

// Where the contextual upgrade CTA points (real billing flow).
export const UPGRADE_HREF = "/business/payments";

/** Fold Polish diacritics + lowercase for robust matching. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e").replace(/ł/g, "l")
    .replace(/ń/g, "n").replace(/ó/g, "o").replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z");
}

// Stems that clearly indicate a TermCatch / salon / business-ops request.
//
// PRICING AND STRATEGY BELONG HERE. Advising an owner on what to charge, which
// service is underpriced, or what to bundle is core business help — the assistant
// exists to answer exactly that. The stems below are deliberately broad because
// an in-domain hit always wins (see classifyDomain): the cost of a false "in" is
// one model call that the system prompt handles, while the cost of a false "out"
// is refusing a legitimate business question, which is the bug this guards against.
const IN_DOMAIN = [
  "salon", "rezerw", "wizyt", "termin", "kalendarz", "grafik", "klient", "crm", "kampan",
  "marketing", "promocj", "kupon", "sms", "mail", "przychod", "utarg", "oblozen", "no-show",
  "noshow", "anulow", "opini", "recenzj", "ocen", "pracownik", "specjalist", "zespol", "uslug",
  "faktur", "cennik", "godzin", "analiz", "statyst", "popyt", "slot", "booking", "appointment",
  "revenue", "staff", "service", "review", "invoice", "schedule", "availab", "fryzjer", "barber",
  "masaz", "manicure", "pedicure", "paznokc", "kosmetyk", "strzyzen", "spa", "biznes", "firm",
  "obrot", "utrzyman", "retencj", "lojaln", "segment", "raport", "dochod",
  // Pricing / packaging / margin — the category that was being refused.
  "cen", "wycen", "stawk", "pakiet", "zestaw", "rabat", "znizk", "marz", "podwyzk", "oplac",
  "price", "pricing", "charge", "package", "bundle", "discount", "margin", "upsell",
  "strateg", "growth", "retention", "loyalty",
  // German
  "friseur", "termine", "kunden", "umsatz", "mitarbeiter", "dienstleist", "buchung", "geschaft", "gutschein", "bewertung",
  "preis", "paket", "rabatt", "marge",
  // Turkish
  "kuafor", "randevu", "musteri", "hizmet", "isletme", "gelir", "personel", "salonu", "berber", "kampanya",
  "fiyat", "indirim", "paketi",
];

// Strong markers of OBVIOUSLY unrelated requests. Only used when NO in-domain
// marker is present (so "historia wizyt" is never mistaken for a history essay).
const OUT_DOMAIN = [
  // "domow" rather than each inflection of "zadanie domowe" / "pracę domową":
  // Polish case endings meant the literal phrases missed the most natural way
  // of asking. Safe to keep broad — a salon phrase like "wizyty domowe" carries
  // an in-domain stem ("wizyt"), and an in-domain hit always wins.
  "domow", "odrobic", "ile wazy", "ile waza",
  "zadanie domowe", "prace domowe", "praca domowa", "homework", "wypracowanie", "esej", "essay",
  "2+2", "ile to jest", "oblicz", "rownanie", "calk", "pochodn", "silni", "pierwiast", "matematyk",
  "fizyk", "physics", "chemi", "chemistry", "biolog",
  "python", "javascript", "java ", "c++", "napisz kod", "write code", "kod do gry", "algorytm", "leetcode",
  "wiersz", "poem", "opowiadanie", "napisz mi tekst piosenk", "piosenk",
  "stolic", "capital of", "kto wygral", "ile ma lat", "przetlumacz", "translate", "przepis na", "pogoda",
  "gra komputer", "grze", "my game", "history essay", "solve this", "solve the",
  // German off-domain
  "hausaufgabe", "aufsatz", "gedicht", "matheaufgabe", "loese die gleichung", "schreibe code",
  // Turkish off-domain
  "odev", "matematik problem", "siir yaz", "kod yaz", "denklemi coz", "fizik problem",
];

/** Classify whether a message is in TermCatch's domain. Bias toward "in". */
export function classifyDomain(text: string): "in" | "out" {
  const t = fold(text || "");
  const hasIn = IN_DOMAIN.some((k) => t.includes(k));
  if (hasIn) return "in"; // an in-domain signal always wins
  const hasOut = OUT_DOMAIN.some((k) => t.includes(fold(k)));
  if (hasOut) return "out"; // clear off-domain and no in-domain → refuse for free
  return "in"; // ambiguous → let the model handle it (it refuses off-domain per system prompt)
}

// Markers of a "deep analysis" (multi-dataset / strategy) → SMART model + Prof cap.
const DEEP = [
  "pelna analiza", "pelnej analizy", "analiza biznesu", "analiza calego", "analize calego",
  "kondycja biznesu", "kondycji biznesu", "strategi", "jak rozwinac", "rozwoj biznesu",
  "plan rozwoju", "kompleksow", "doglebn", "wielowymiarow", "przeanalizuj caly", "growth",
  "deep analysis", "szczegolowa analiza", "analiza wszystkich", "jak zwiekszyc przychod",
  "jak poprawic wyniki", "audyt biznesu", "pełny obraz",
];

/** Is this a heavy, multi-dataset analysis (routes to SMART, capped on Professional)? */
export function isDeepAnalysis(text: string): boolean {
  const t = fold(text || "");
  return DEEP.some((k) => t.includes(fold(k)));
}

export type AssistantRoute =
  | { action: "refuse"; reply: string }
  | { action: "answer"; deep: boolean };

/** Decide what to do with an assistant message BEFORE any model call. */
export function routeAssistant(text: string, locale: Locale = "pl"): AssistantRoute {
  if (classifyDomain(text) === "out") return { action: "refuse", reply: refusalAssistant(locale) };
  return { action: "answer", deep: isDeepAnalysis(text) };
}

/** Decide what to do with a customer-search message. */
export function routeSearch(text: string, locale: Locale = "pl"): { action: "refuse"; reply: string } | { action: "search" } {
  if (classifyDomain(text) === "out") return { action: "refuse", reply: refusalSearch(locale) };
  return { action: "search" };
}
