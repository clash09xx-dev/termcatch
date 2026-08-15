import { randomInt } from "crypto";

/**
 * Salon join codes.
 *
 * A code is typed by a human off a phone screen or a printed note, so the
 * alphabet drops every glyph that gets misread: 0/O, 1/I/L, 5/S, 8/B, U/V.
 * What is left is 26 unambiguous characters.
 *
 * Length 8 over a 26-character alphabet is 26^8 ≈ 2.1e11 possibilities. Paired
 * with the per-user attempt limit in lib/actions/join-code.ts, guessing a live
 * code is not a practical attack: an attacker gets a handful of tries per hour
 * against a space of two hundred billion.
 *
 * `crypto.randomInt` is used rather than `Math.random` because these codes are
 * a credential — predictable codes would let anyone enumerate their way into a
 * salon's staff list.
 */
const ALPHABET = "ACDEFGHJKMNPQRTWXY2346789";
const CODE_LENGTH = 8;

/** A fresh code, e.g. "K7QM2XDA". Always uppercase, never sequential. */
export function generateJoinCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/**
 * Normalize whatever the specialist actually typed.
 *
 * People paste codes with spaces, hyphens and mixed case, and on a phone the
 * keyboard often capitalises the first letter only. Rejecting those inputs
 * would be a usability bug dressed up as validation, so the input is folded to
 * the canonical form before it is compared.
 */
export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Shape check only — says nothing about whether the code exists. */
export function isWellFormedJoinCode(input: string): boolean {
  const c = normalizeJoinCode(input);
  return c.length === CODE_LENGTH && [...c].every((ch) => ALPHABET.includes(ch));
}

/** Display form: "K7QM-2XDA" is easier to read aloud and to copy by eye. */
export function formatJoinCode(code: string): string {
  const c = normalizeJoinCode(code);
  return c.length === CODE_LENGTH ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
