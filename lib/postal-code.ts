// ─── Polish postal code (kod pocztowy) — NN-NNN ─────────────────────────────
// Shared by the onboarding form (frontend) and the server actions (backend), so
// validation can never diverge.

/** Accepts only the canonical "NN-NNN" shape (e.g. 30-001, 31-234). */
export function isValidPolishPostalCode(value: string): boolean {
  return /^\d{2}-\d{3}$/.test((value ?? "").trim());
}

/**
 * Best-effort normalization of a pasted/typed value into "NN-NNN":
 * - trims and drops spaces ("30 001" → "30001"),
 * - inserts the hyphen for 5 bare digits ("30001" → "30-001"),
 * - leaves an already-correct value untouched.
 * Returns the (possibly still-invalid) cleaned string — callers validate after.
 */
export function normalizePolishPostalCode(value: string): string {
  const cleaned = (value ?? "").trim().replace(/\s+/g, "");
  const digits = cleaned.replace(/-/g, "");
  if (/^\d{5}$/.test(digits)) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return cleaned;
}
