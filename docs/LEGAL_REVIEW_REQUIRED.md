# Legal review required before public launch / accepting real payments

This file lists items that need **owner-provided information** and/or **review by a
Polish lawyer** before TermCatch can lawfully operate at scale (real payments,
processing personal data as a controller, and especially any medical services).

I (the engineer) did **not** invent any company identity, legal claims, or
processor details. Placeholders were removed rather than fabricated. Nothing here
is legal advice.

## 1. Legal entity / data controller identity (REQUIRED — owner must provide)
The privacy policy currently names the controller only as "TermCatch z siedzibą w
Krakowie" with `hello@termcatch.com`. Before launch the owner must supply and a
lawyer must confirm:
- Registered legal form and company name (np. sp. z o.o. / działalność gospodarcza)
- Registered address (siedziba)
- NIP, REGON, and KRS (if applicable)
- The named **data controller (administrator danych)** and a contact for data requests
- Whether a **Data Protection Officer (IOD)** is required and, if so, contact details

Files to update once provided: `app/privacy/page.tsx` (sec. 1 & 6), `app/terms/page.tsx`.

## 2. Processor / subprocessor list (owner + lawyer to confirm)
Code shows these third parties actually receive data. The privacy policy was
updated to disclose them, but the list must be verified and DPAs (umowy
powierzenia) signed:
- **Supabase** — database + authentication (passwords/identity)
- **Stripe** — payments
- **Twilio** — SMS (and WhatsApp if enabled)
- **Resend** — transactional/marketing e-mail
- **Hosting** — Railway / Vercel (confirm which is production) + Supabase storage
Confirm data-residency (EU vs US) and Standard Contractual Clauses where relevant.

## 3. Payments & commission model (owner decision + lawyer)
There is an **inconsistency in the code itself** that only the owner can resolve:
- Public pricing (canonical) states: **20% fee only from the first appointment of a
  new customer acquired through TermCatch**, plus monthly plan fees.
- The code charges a Stripe Connect application fee of **`PLATFORM_FEE_PERCENT = 2.5`**
  on every online payment (`lib/stripe.ts`), and the business Payments dashboard
  shows "2,5% od każdej płatności".
These are two different fee models. Decide the real commercial terms, then align
`lib/stripe.ts`, the payments dashboard copy, the pricing page, and `app/terms`.
The Regulamin must describe the actual fee taken.

## 4. Terms of Service (Regulamin) — lawyer review
`app/terms/page.tsx` is generic. A lawyer should review: consumer-withdrawal
rules for booked services, cancellation/no-show fees (the app stores a
cancellation-fee policy but does **not** auto-charge it — confirm this is stated
correctly), platform-vs-salon liability, and the payment/commission clause (see §3).

## 5. Medical services (blocked until verified)
Medical categories (Lekarz, Stomatolog, Dermatolog, Psycholog, etc.) are currently
**hidden from public discovery** behind `NEXT_PUBLIC_ENABLE_MEDICAL_CATEGORIES`
(default off). Before enabling them, obtain legal review of: medical professional
verification/licensing, processing of health data (special-category data under
RODO art. 9), and any medical-advertising restrictions.

## 6. Marketing consent (lawyer to confirm)
SMS/e-mail marketing relies on opt-in flags. Confirm the consent wording and
records satisfy RODO + Prawo telekomunikacyjne / ustawa o świadczeniu usług drogą
elektroniczną for commercial messages.

---
_Prepared during the production-trust hardening pass. Public documents were made
truthful (removed the fabricated "bcrypt" + "regularne audyty bezpieczeństwa"
claims, disclosed the real processors) but intentionally contain **no invented**
entity data — those gaps are listed above for the owner + lawyer to fill._
