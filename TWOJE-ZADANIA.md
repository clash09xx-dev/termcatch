# Termcatch — Twoja checklista (stan: 2 lipca 2026)

Wszystko poniżej to rzeczy, których **nie mogę zrobić za Ciebie** (wymagają Twoich kont / terminala).
Kolejność ma znaczenie.

---

## 1. Zbuduj i przetestuj lokalnie (5 min)

```bash
cd ~/Desktop/termcatch
pnpm build
pnpm dev
```

Sprawdź w przeglądarce (http://localhost:3000):
- rezerwacja wizyty jako klient (profil salonu → Zarezerwuj → wybór terminu)
- panel salonu → oczekująca rezerwacja → Potwierdź / Odwołaj
- powiadomienia klienta (`/customer/notifications`)
- serduszko (ulubione) na profilu salonu
- widok mobilny (DevTools → tryb responsywny) — dolna nawigacja w obu panelach

## 2. Push do GitHub → deploy na Railway (2 min)

```bash
cd ~/Desktop/termcatch
git add .
git commit -m "feat: booking flow, favourites, notifications, reviews, mobile nav, TZ fix, proxy migration"
git push
```

Railway zbuduje automatycznie. Po deployu sprawdź `https://termcatch.com`.

## 3. E-maile transakcyjne — Resend (15 min)

Potwierdzenia rezerwacji wysyłają się e-mailem, ale tylko gdy ustawisz klucz:

1. Konto na https://resend.com → **Domains** → dodaj `termcatch.com`.
2. Dodaj rekordy DNS (SPF + DKIM), które pokaże Resend, u swojego rejestratora domeny.
3. **API Keys** → utwórz klucz.
4. W Railway → Variables dodaj:
   ```
   RESEND_API_KEY=re_xxxxxxxx
   EMAIL_FROM=Termcatch <powiadomienia@termcatch.com>
   ```
Bez klucza wszystko działa — e-maile są po prostu pomijane (log w konsoli).

## 4. Google OAuth (15 min)

1. https://console.cloud.google.com → projekt → **APIs & Services → Credentials → Create OAuth client ID** (Web application).
2. Authorized redirect URI:
   ```
   https://<TWOJ-PROJEKT>.supabase.co/auth/v1/callback
   ```
   (dokładny URL znajdziesz w Supabase → Authentication → Providers → Google)
3. Skopiuj **Client ID** i **Client Secret** do Supabase → Authentication → Providers → Google → Enable.
4. W Supabase → Authentication → URL Configuration:
   - Site URL: `https://termcatch.com`
   - Redirect URLs: `https://termcatch.com/auth/callback`

## 5. Apple Sign In (30 min, wymaga Apple Developer Account — 99 USD/rok)

1. https://developer.apple.com → **Certificates, Identifiers & Profiles**:
   - **Identifiers** → App ID (np. `com.termcatch.app`) z włączonym "Sign In with Apple"
   - **Identifiers** → Services ID (np. `com.termcatch.web`) → Configure → domena `termcatch.com` + return URL:
     ```
     https://<TWOJ-PROJEKT>.supabase.co/auth/v1/callback
     ```
   - **Keys** → nowy klucz z "Sign In with Apple" → pobierz plik `.p8` (tylko raz!)
2. Supabase → Authentication → Providers → Apple → Enable, wpisz:
   - Services ID, Team ID (prawy górny róg w Apple Dev), Key ID, zawartość pliku `.p8`

## 6. Supabase — produkcyjne ustawienia (10 min)

- Authentication → Rate Limits: zwiększ limit rejestracji (testy Cię blokowały)
- Authentication → Email Templates: przetłumacz na polski (opcjonalnie)
- Database → sprawdź czy jest włączony connection pooling (Prisma używa `DATABASE_URL` z poolerem i `DIRECT_URL` bez)

## 7. Railway — zmienne (sprawdź czy są wszystkie)

```
DATABASE_URL, DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=https://termcatch.com
RESEND_API_KEY, EMAIL_FROM        ← nowe (krok 3)
```

## 8. Po deployu — szybki smoke test produkcji

- [ ] rejestracja konta klienta (prawdziwy e-mail) + potwierdzenie
- [ ] rejestracja konta salonu → onboarding → dodanie usług i godzin
- [ ] rezerwacja end-to-end + potwierdzenie przez salon
- [ ] e-mail o rezerwacji dotarł (jeśli krok 3 zrobiony)
- [ ] `https://termcatch.com/sitemap.xml` i `/robots.txt` działają
- [ ] Google Search Console → dodaj domenę i wyślij sitemap

---

## Co zostało zrobione w tej sesji (dla kontekstu)

**Nowe funkcje:** ulubione salony (serduszko + strona), powiadomienia in-app (realne, z badge),
opinie klientów (modal z gwiazdkami po zakończonej wizycie, przelicza ocenę salonu),
potwierdzanie/odwoływanie/kończenie wizyt przez salon (dashboard + kalendarz),
e-maile transakcyjne (Resend, graceful fallback), edycja profilu klienta,
ochrona przed podwójną rezerwacją tego samego terminu.

**Naprawy krytyczne:** strefa czasowa Europe/Warsaw wszędzie (serwer Railway działa w UTC —
godziny wizyt i dostępność terminów były przesunięte o 2h), notatki klienta przy rezerwacji
nie zapisywały się, sloty z przeszłości były pokazywane, `middleware.ts` → `proxy.ts` (Next 16),
`?redirect=` po logowaniu działa, błąd typów w `/search`.

**Design/UX:** usunięty cały fiolet (paleta brand → grafit, kolory pracowników, kalendarz),
mobilna dolna nawigacja w panelu klienta i salonu, sticky CTA „Zarezerwuj" na mobile,
usunięte fake dane (badge „12"), sitemap.xml, robots.txt, OG image, manifest.json.
