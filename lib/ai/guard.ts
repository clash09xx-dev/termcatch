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

// Refusal copy (spec-mandated).
export const REFUSAL_ASSISTANT =
  "Pomagam tylko w sprawach związanych z TermCatch, rezerwacjami i prowadzeniem Twojego biznesu.";
export const REFUSAL_SEARCH = "Mogę pomóc Ci znaleźć i zarezerwować usługę w TermCatch.";

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
const IN_DOMAIN = [
  "salon", "rezerw", "wizyt", "termin", "kalendarz", "grafik", "klient", "crm", "kampan",
  "marketing", "promocj", "kupon", "sms", "mail", "przychod", "utarg", "oblozen", "no-show",
  "noshow", "anulow", "opini", "recenzj", "ocen", "pracownik", "specjalist", "zespol", "uslug",
  "faktur", "cennik", "godzin", "analiz", "statyst", "popyt", "slot", "booking", "appointment",
  "revenue", "staff", "service", "review", "invoice", "schedule", "availab", "fryzjer", "barber",
  "masaz", "manicure", "pedicure", "paznokc", "kosmetyk", "strzyzen", "spa", "biznes", "firm",
  "obrot", "utrzyman", "retencj", "lojaln", "segment", "raport", "dochod",
];

// Strong markers of OBVIOUSLY unrelated requests. Only used when NO in-domain
// marker is present (so "historia wizyt" is never mistaken for a history essay).
const OUT_DOMAIN = [
  "zadanie domowe", "prace domowe", "praca domowa", "homework", "wypracowanie", "esej", "essay",
  "2+2", "ile to jest", "oblicz", "rownanie", "calk", "pochodn", "silni", "pierwiast", "matematyk",
  "fizyk", "physics", "chemi", "chemistry", "biolog",
  "python", "javascript", "java ", "c++", "napisz kod", "write code", "kod do gry", "algorytm", "leetcode",
  "wiersz", "poem", "opowiadanie", "napisz mi tekst piosenk", "piosenk",
  "stolic", "capital of", "kto wygral", "ile ma lat", "przetlumacz", "translate", "przepis na", "pogoda",
  "gra komputer", "grze", "my game", "history essay", "solve this", "solve the",
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
export function routeAssistant(text: string): AssistantRoute {
  if (classifyDomain(text) === "out") return { action: "refuse", reply: REFUSAL_ASSISTANT };
  return { action: "answer", deep: isDeepAnalysis(text) };
}

/** Decide what to do with a customer-search message. */
export function routeSearch(text: string): { action: "refuse"; reply: string } | { action: "search" } {
  if (classifyDomain(text) === "out") return { action: "refuse", reply: REFUSAL_SEARCH };
  return { action: "search" };
}
