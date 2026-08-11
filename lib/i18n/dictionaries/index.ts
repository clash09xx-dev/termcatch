import { pl, type Dictionary } from "./pl";
import { en } from "./en";
import { de } from "./de";
import { tr } from "./tr";
import { FALLBACK_LOCALE, type Locale } from "../config";

const DICTS: Record<Locale, Dictionary> = { pl, en, de, tr };

/** The dictionary for a locale. Unknown/undefined → the fallback (Polish). */
export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale] ?? DICTS[FALLBACK_LOCALE];
}

/** Interpolate {var} placeholders. Unknown placeholders are left intact. */
export function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export type { Dictionary } from "./pl";
