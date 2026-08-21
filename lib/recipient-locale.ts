import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/lib/i18n/config";

/**
 * THE locale rule for transactional e-mail. One function, so there is one answer.
 *
 * A transactional e-mail is read by ONE person, and it must be in THAT person's
 * language. The language of whoever triggered the send is irrelevant: when a
 * salon owner confirms a booking, the confirmation is read by the customer.
 *
 * So the rule is deterministic and recipient-scoped:
 *
 *   1. the RECIPIENT's persisted `User.locale`
 *   2. failing that (no account, or an unrecognised value), DEFAULT_LOCALE (pl)
 *
 * Explicitly NOT used, in any branch:
 *   - `resolveLocale()` / the request cookie   -> that is the SENDER's language
 *   - the salon's country or the business row  -> not an intended input here
 *   - Accept-Language of the current request   -> belongs to a different person
 *   - any module-level or cached value         -> would leak across requests
 *
 * WHY THIS IS A SEPARATE MODULE
 * The senders in lib/email.ts are pure and take a `locale` argument; they must
 * not reach into the database. Callers used to inline `customer.locale`, which
 * worked for customer mail and quietly produced hardcoded Polish for the salon
 * and specialist templates, because those call sites had no locale to inline.
 *
 * COST
 * One indexed lookup by primary key per recipient. For transactional mail that
 * is irrelevant next to the network call to Resend, and it is far less invasive
 * than widening eight Prisma selects to carry a locale through.
 */
export async function recipientLocale(userId: string | null | undefined): Promise<Locale> {
  if (!userId) return DEFAULT_LOCALE;
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
    return toLocale(u?.locale);
  } catch {
    // Never let a locale lookup stop a transactional e-mail from going out.
    return DEFAULT_LOCALE;
  }
}

/**
 * Same rule, for a recipient identified only by e-mail (legacy rows that have
 * no linked account). Returns the default when nobody matches, which is the
 * honest answer: there is no stored preference to honour.
 */
export async function recipientLocaleByEmail(email: string | null | undefined): Promise<Locale> {
  if (!email) return DEFAULT_LOCALE;
  try {
    const u = await prisma.user.findUnique({ where: { email }, select: { locale: true } });
    return toLocale(u?.locale);
  } catch {
    return DEFAULT_LOCALE;
  }
}
