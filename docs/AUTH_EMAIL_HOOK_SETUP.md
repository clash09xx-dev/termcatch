# Supabase "Send Email" Auth Hook — deployment & operations

This replaces Supabase's own auth‑email sending with our Edge Function
(`supabase/functions/send-email`), which renders the message and sends it through
**Resend from `TermCatch <hello@termcatch.com>`, code‑only, with no links**. It is
the permanent fix for Gmail silently discarding the previous `no-reply@` +
link‑bearing verification email.

Once the hook is enabled, Supabase calls this function for **every** auth email
(signup verification code, and password‑recovery). Supabase's built‑in mailer,
custom SMTP settings, and the "Confirm signup" **email template are no longer
used** for those messages — the function is fully in control.

The application code (registration → 6‑digit screen → `verifyOtp` → auto session
→ role redirect → resend + cooldown → Polish errors) is **unchanged**; only the
delivery mechanism moves into the function.

---

## 1. Prerequisites (in Resend)
- Domain `termcatch.com` verified (SPF/DKIM/DMARC green).
- A **Resend API key** (`re_…`) with send permission — this is `RESEND_API_KEY`.
- `hello@termcatch.com` is a valid sender on the verified domain.

## 2. Link the project & deploy (CLI)
```bash
# From the repo root. Requires the Supabase CLI (https://supabase.com/docs/guides/cli).
supabase login
supabase link --project-ref stzjnrhfthbiilkffbdx

# Deploy WITHOUT JWT verification — authenticity is the webhook signature, not a JWT.
# (supabase/config.toml already sets verify_jwt = false; the flag makes it explicit.)
supabase functions deploy send-email --no-verify-jwt
```
Function URL after deploy:
```
https://stzjnrhfthbiilkffbdx.supabase.co/functions/v1/send-email
```

## 3. Create the hook in the Dashboard (this generates the signing secret)
Supabase Dashboard → **Authentication → Hooks** → **Send Email hook** → **Enable**:
- Type: **HTTPS**
- URL: `https://stzjnrhfthbiilkffbdx.supabase.co/functions/v1/send-email`
- Save. Supabase now shows a **signing secret** — copy it (see the note in §5 about
  its `v1,whsec_…` format).

## 4. Configure the function secrets (CLI)
```bash
supabase secrets set \
  RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxx" \
  SEND_EMAIL_HOOK_SECRET="v1,whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXX" \
  AUTH_EMAIL_FROM="TermCatch <hello@termcatch.com>" \
  AUTH_EMAIL_REPLY_TO="hello@termcatch.com"
```
Then **redeploy** so the function picks up the secrets (if you set them after the
first deploy):
```bash
supabase functions deploy send-email --no-verify-jwt
```

### Exact secrets required
| Secret | Value | Notes |
|---|---|---|
| `RESEND_API_KEY` | `re_…` | Resend key with send permission (verify it's valid/current). |
| `SEND_EMAIL_HOOK_SECRET` | `v1,whsec_…` | The Send Email hook signing secret from §3. |
| `AUTH_EMAIL_FROM` | `TermCatch <hello@termcatch.com>` | Never `no-reply@`. Must be a verified Resend sender. |
| `AUTH_EMAIL_REPLY_TO` | `hello@termcatch.com` | Reply‑To. |

## 5. About the `v1,whsec_…` secret format (important)
When you enable the hook, Supabase presents the signing secret in the
**Standard Webhooks** form, e.g. `v1,whsec_<base64>`. The base64 tail is the real
HMAC key; `v1,` is the signature‑version tag and `whsec_` is a display prefix.

You can store the value **exactly as Supabase shows it** — the function's
`normalizeSecret()` strips a leading `v1,` and/or `whsec_` before decoding the
base64 key. So all of these are accepted and equivalent:
```
v1,whsec_<base64>
whsec_<base64>
<base64>
```
Do **not** re‑encode or "clean up" the value beyond copy‑paste; just paste what
Supabase gives you.

## 6. What the function guarantees
- Verifies the Standard Webhooks signature over the raw body (id.timestamp.body)
  with a 5‑minute replay window; unsigned/mis‑signed/stale → **401**, no send.
- Signup / code flows → **code‑only** Polish email, subject
  **„Twój kod weryfikacyjny TermCatch"**, prominent 6‑digit `email_data.token`,
  **no button, no verification/redirect link, no URL**, with a plain‑text part.
- Recovery → a Polish reset email whose only link points to the **same domain**
  we send from (`https://termcatch.com/auth/confirm?...`), so password reset keeps
  working and there is no cross‑domain link signal.
- Resend failure → non‑2xx (**502**); network failure → **502**. Logs contain
  **only** a status — never the OTP, the secret, the Resend key, or the body.

## 7. End‑to‑end production test (one procedure)
1. Ensure §2–§4 are done and the function is deployed with the secrets set.
2. In an incognito window, go to `https://termcatch.com/register`, choose **Klient**,
   and register with a **real Gmail address you control** (new/unique).
3. In **Resend → Emails/Logs**, confirm a **new** event to that address, from
   `hello@termcatch.com`, subject „Twój kod weryfikacyjny TermCatch".
4. In the **Gmail inbox**, confirm the message is present (not spam) and shows a
   **6‑digit code, no button/link**. *(Delivery to Gmail is only "verified" when
   this email is visibly in a real Gmail inbox — an API "Delivered" is not proof.)*
5. Type/paste the code → the app auto‑verifies, creates the session, and redirects
   (customer → dashboard / intended page; business signup → onboarding).
6. Trigger **„Wyślij kod ponownie"** after the 60‑second cooldown → a second Resend
   event appears; the new code verifies.
7. Enter a wrong code → Polish "Nieprawidłowy kod…"; let one expire → "Kod wygasł…".
8. (Optional) Password reset from `/reset-password` → a reset email arrives from
   `hello@termcatch.com` with a `termcatch.com` link that lands on
   `/auth/update-password`.

## 8. Rollback
- **Fastest (dashboard):** Authentication → Hooks → **disable** the Send Email hook.
  Supabase immediately resumes its own auth‑email path (built‑in/custom SMTP). No
  code change or redeploy needed.
- **Remove the function:** `supabase functions delete send-email`.
- **Repo:** `git revert <commit>` (or `git reset --hard AUTH_EMAIL_HOOK_BEFORE`) to
  drop the function/config/tests. No schema or data is involved.
