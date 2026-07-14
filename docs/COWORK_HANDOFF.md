# TermCatch — Experience Redesign · Cowork Handoff

---

## 🚀 LAUNCH FEATURES (post-redesign work — IN PROGRESS)

> Making the visible launch features genuinely functional/secure/honest.
> **Rollback checkpoint: tag `LAUNCH_FEATURES_BEFORE` → `16ab378`** (state right
> after the redesign + QA, before any launch-feature work). Full rollback:
> `git reset --hard LAUNCH_FEATURES_BEFORE`.
>
> **Test runner:** `pnpm test` (Node's built-in `node:test` via `tsx` — zero new
> deps). **Schema changes applied via `pnpm db:push`** (no migrations dir).

**Implementation order & status:**
1. **Service add-ons + booking-duration integration — ✅ DONE** (commit below)
2. Coupon redemption — ⏳ next
3. "Caught one." success moment — pending
4. Marketing persistence — pending
5. DB hardening + logged-out auth QA — pending
6. AI Assistant architecture — pending
7. Invoices (safe prep; ask legal Qs) — pending
8. Cancellation fees (safe prep; ask Qs) — pending
9. Final QA — pending

### Area 1 — Service Add-ons ✅
- **Schema (db push applied):** new `ServiceAddon` (business-scoped, m-n to
  `Service`), `AppointmentAddon` (immutable per-booking snapshot). New nullable
  `Appointment` columns: `basePrice, addonsTotal, subtotal, couponCode, couponType,
  couponValue` (+ existing `couponId/couponDiscount`). `price` now = FINAL total
  (base + add-ons − discount); breakdown in snapshot cols. Additive/non-destructive.
- **Server (authoritative):** `lib/booking-pricing.ts` (pure math), `lib/booking-addons.ts`
  (resolve+validate against DB), `lib/actions/addons.ts` (owner-scoped CRUD +
  reorder + service assignment). `createAppointment` extended: validates add-ons
  (business/service/active/quantity), ignores client price/duration, computes
  duration = base + Σ add-ons, writes snapshot rows, wrapped in `$transaction`.
  Availability API reserves base + add-on duration (`?addons=id:qty`).
- **UI:** add-ons sub-section inside Usługi (`services/addons-section.tsx`, no new
  nav item); booking wizard shows add-ons in step 1 (after service, before
  date/time) with qty steppers + live subtotal/duration; confirm + success +
  customer ticket show add-on line items + final duration.
- **Tests:** `tests/booking-pricing.test.ts` — 21 pass (add-on validation, qty
  range, price/duration manipulation ignored, coupon math, clamps, totals).
- **Displays still TODO** (add-on line items): business calendar detail modal,
  business dashboard detail, CRM visit history, customer history list, e-mail
  confirmation. (Customer ticket + booking confirm/success DONE.)
- `createManualAppointment` (walk-in) intentionally add-on-free for now.

---

> **STATUS: ALL FIVE WAVES COMPLETE AND COMMITTED.** The experience redesign is
> finished. Production build green (19/19), `tsc --noEmit` clean, all 20 business
> + customer routes return HTTP 200, and the materially changed screens were
> visually verified live (owner session, real DB). Rollback tag
> `EXPERIENCE_REDESIGN_BEFORE` → `2b17878` still points at the pre-redesign baseline.
>
> **Wave 5 commits (this session):** `9a4eaa2` partial checkpoint (AI/Faktury/
> Płatności/Kupony/Analityka) · `c8aa1c0` Marketing · `9378ec2` Ustawienia +
> Salon Profile · `7eb3a5a` Customer Panel.
>
> Remaining is optional polish + one item that needs manual eyes (see "Final QA
> Pass"): the logged-out **register/login** pages could not be re-inspected while
> authenticated (the auth guard redirects them to the dashboard, and re-login is
> blocked by the password policy). Login was confirmed rendering at session start.

---

## Final QA Pass (visual + functional)

A full visual + functional QA pass was run across **four viewports — 1440×900,
1280×800, 1024×768, 390×844** — on the live dev server (authenticated owner
"Admin", real Supabase DB).

**Result: NO visual or functional regressions found. No code changes made**
(per "fix only concrete problems / no speculative changes").

Verified across the viewports:
- **Zero horizontal overflow** on every screen at every viewport (measured
  `scrollWidth` vs `innerWidth`, not eyeballed).
- **Route-health: 24/24 routes HTTP 200** (business + customer + public
  `/`, `/search`, `/b/[slug]`, `/b/[slug]/book`).
- **No console errors** on any page.
- **Populated customer ticket VERIFIED** — a future PENDING appointment was
  temporarily inserted (then deleted): big date "16 LIP", relative "pojutrze",
  salon+service, Google-Maps address action, Przełóż/Anuluj/♥ actions, "Oczekuje"
  status, 24 h policy. Renders correctly at mobile + desktop.
- **Calendar mobile (390):** clean single-day view, empty + populated states,
  detail modal opens as a bottom sheet.
- **Settings + embedded Salon Profile:** decision cards + dirty-state sticky bar;
  Profil publiczny embeds the editor with its save intact; `/business/profile`
  still renders standalone.
- **Honesty (all confirmed):** Marketing implies no unsupported tracking; Kupony
  is management-only; Faktury = "historia sprzedaży" with the "Wystaw fakturę"
  button truly `disabled` + honest footer; AI = "nie jest to prognoza AI" /
  "nie udajemy, że to już działa"; cancellation fee = "system nie pobiera jej
  automatycznie". Salon `/b/[slug]` renders (old P0 crash gone).

Non-issues (documented, deliberately NOT fixed):
1. **Transient dashboard DB error** — the Supabase pooler drops the first
   connection after idle → a one-off `PrismaClientKnownRequestError` overlay that
   recovers on reload. Environmental/infra, not a redesign regression; every data
   page depends on the same connection.
2. **TanStack Query Devtools button** (`z-index 100000`) overlaps the mobile
   modal/CTA — **dev-only**, absent from production builds.
3. **"od 0 zł"** service on the test salon in search — pre-existing seed-data
   artifact (a 0-zł service), not a redesign issue.

Manual eyes still wanted: logged-out **register** page (auth redirect + password
policy prevented inspection this pass); a native ≥1024px screenshot (the in-app
preview pane downscales captures to 800px wide, though overflow was measured
directly at each true viewport).

---

## Original Objective

Deliver the **approved complete TermCatch Experience Redesign** — not a reskin.
Redesign every business (and customer) screen as a genuine _experience_ (new
information architecture, layout, hierarchy, one focal point per screen), on the
**"Machined Silver"** design language (white / graphite / frosted "liquid glass",
polished-aluminium depth; calm, minimal, precise; references: Apple, Linear,
Raycast, Stripe, Arc, Notion Calendar). Keep ALL functionality and business
logic; change how each screen _thinks and guides the user_. Executed in five
controlled waves; a dedicated commit per wave; no approval needed between waves
unless a change would remove functionality, need an undefined business rule, or
be a destructive DB change.

---

## Final Navigation (four groups — DO NOT CHANGE)

Single source of truth already implemented: `components/layout/business-nav.tsx`
(`NAV_GROUPS` + `PAGE_META`). Routes are unchanged; only labels/grouping are new.

- **PRACA** — Dziś (`/business/dashboard`) · Kalendarz (`/business/calendar`) · Klienci (`/business/crm`)
- **OFERTA** — Usługi (`/business/services`) · Zespół (`/business/staff`) · Godziny (`/business/hours`)
- **NARZĘDZIA** — AI Asystent (`/business/ai`) · Marketing (`/business/marketing`) · Kupony (`/business/coupons`) · Faktury (`/business/invoices`)
- **FIRMA** — Analityka (`/business/analytics`) · Opinie (`/business/reviews`) · Płatności (`/business/payments`) · Ustawienia (`/business/settings`)

Naming rules (hard):
- Usługi stays **Usługi** (NOT "Cennik").
- Analityka stays **Analityka** (NOT "Puls").
- AI Asystent, Marketing, Kupony, Faktury stay **visible first-class** nav items — NOT hidden, NOT labelled "Coming soon".
- Salon Profile (`/business/profile`) route stays live; it is to become a **section inside Ustawienia** (merge NOT yet done — see Wave 5).

---

## Non-Negotiable Constraints

- **Preserve** backend logic, DB models & data, APIs, all server actions, auth, booking rules, Stripe behaviour, customer actions, direct URLs, working CRUD.
- **No destructive DB migrations.** No schema changes were made and none are required for remaining work (Coupon/Invoice/AiInsight models already exist).
- **No fake anything:** no fabricated data, no fake AI insights/predictions, no misleading stats, no fake reviews/testimonials/transactions, no fake sends/audience counts. Rule-based observations must be labelled as such (never "AI prediction").
- Use only data that already exists, or a **small frontend-derived value honestly computed** from existing data (e.g. visit cadence, weekly load).
- Do not silently drop a feature because it's hard; do not replace working screens with placeholders.
- Machined-silver system is centralised — build from the shared primitives, don't hand-roll per page. One ink/graphite primary; silver for surfaces/secondary; amber only for stars; semantic tints separate from accent; `tabular-nums` on all numbers; focus-visible; modal focus traps; `prefers-reduced-motion`; avoid heavy stacked backdrop-blur in long lists (use the no-blur `ROW`/solid rows).

---

## Wave Status

| Wave | Scope | Status | Commit |
|---|---|---|---|
| 1 | Application frame | **COMPLETE** | `be586c7` |
| 2 | Dziś + Kalendarz | **COMPLETE** | `d0dee01` |
| 3 | Klienci + Opinie | **COMPLETE** | `596bd98` |
| 4 | Usługi + Zespół + Godziny | **COMPLETE** | `9622d7b` |
| 5 | Tools/Company/Customer | **COMPLETE** | `9a4eaa2`·`c8aa1c0`·`9378ec2`·`7eb3a5a` |

### Wave 1 — COMPLETE (`be586c7`)
Four-group nav config (`business-nav.tsx`), redesigned sidebar (identity anchor,
group overlines, ink active pill, spring collapse), contextual topbar (per-route
title + one primary action via `PAGE_META`, ⌘K), mobile nav (3 daily items +
central ink "Wizyta" + grouped More sheet), command-palette labels aligned.
**Shared design-system extensions** (the vocabulary later waves compose):
`Segmented` (`components/ui/segmented.tsx`), SVG **chart kit**
(`components/ui/chart.tsx`: `AreaChart`, `BarColumns`, `Sparkline`),
and in `components/ui/glass/index.tsx`: `Skeleton`, `FormField`, `Timeline` +
`TimelineRow`, `SplitShell`, `DetailEmpty`, `DangerButton`; `drawerSlide` in
`lib/motion.ts`; `.tc-skeleton` + keyframe in `app/globals.css`.

### Wave 2 — COMPLETE (`d0dee01`)
**Dziś** = morning briefing: spoken-sentence greeting (count · next · planned
takings); focal **gap-aware day timeline** (appointments on a time spine, free
gaps surfaced as actionable "wolne Xh — dodaj wizytę" links that prefill the
calendar); decision queue (pending inline confirm/decline + unanswered reviews);
weekly-revenue sparkline; setup checklist for new salons.
**Kalendarz** = reception workspace: **day view primary with per-employee lanes**,
week view secondary, real working-hours grid, closed-day + now-line, mini-month +
week strip + employee/status filters, click-empty-slot → prefilled sheet, mobile
single-day column. Detail modal + status actions preserved. Reads `?date/?week/?action/&time`.

### Wave 3 — COMPLETE (`596bd98`)
**Klienci** = master-detail salon memory (`SplitShell`): list ⇄ live profile,
honest segments (Wszyscy/Wracający/Nowi/Uśpieni) with counts, freshness dots, LTV,
stat chips, **history-based next-step suggestion** (dormant cadence / upcoming /
new — never a prediction), visit timeline. Data layer enriched
(completed/no-show/upcoming counts, first visit, `cadenceDays`) from
already-fetched appointments.
**Opinie** = reputation workflow: unanswered-first ordering, response-rate ring,
filters (Bez odpowiedzi / Wszystkie / Niskie oceny), unanswered flagged with ink
rail + "WYMAGA ODPOWIEDZI", inline reply. Amber only for stars.

### Wave 4 — COMPLETE (`9622d7b`)
**Usługi** = two-pane offer management: editable list with **inline row editor
(no modal)** + live "tak widzi to klient" public preview; inline active toggle /
edit / delete; `?action=new` opens create; price>0 enforced.
**Zespół** = people not rows: persona cards (colour-identity avatar, role, service
chips) + real "X wizyt w tym tygodniu" load (staff page adds a 7-day per-employee
count); add-person ghost card; editor modal preserved.
**Godziny** = visible week (7 day cards, open/closed + range), customer-facing
summary sentence, copy-to-week, **sticky save bar only on dirty state**.

### Wave 5 — COMPLETE
- **AI Asystent**, **Faktury**, **Płatności**, **Kupony** (real CRUD),
  **Analityka** — committed `9a4eaa2` (the transferred partial work).
- **Marketing** (`c8aa1c0`) — honest campaign workspace: real audience segments
  (Wszyscy / Nadchodzące / Stali / Uśpieni) from appointment history + per-channel
  reachability (phone/e-mail + opt-in flags); SMS/WhatsApp via Twilio, e-mail via
  Resend, **sends for real when configured, honestly reports "niedostępna" when
  not — never fakes delivery**; token composer ({imię}/{salon}/{link}) + live
  preview, working booking-link copy, local draft, confirm-gated send with a
  truthful per-recipient tally. New files: `lib/marketing.ts` (client-safe logic),
  `lib/marketing-config.ts` (server-only availability — keeps Resend/Twilio out of
  the client bundle), `lib/actions/marketing.ts` (`sendCampaign`); additive
  `smsConfigured`/`whatsappConfigured`/`emailConfigured` exports.
- **Ustawienia + Salon Profile** (`9378ec2`) — decision-cards (question titles +
  live consequence sentences) across Rezerwacje / Odwołania / Powiadomienia /
  Profil publiczny / Bezpieczeństwo; dirty-state with a sticky save bar that only
  appears on unsaved changes; NaN-guarded inputs; honest cancellation-fee copy
  (system does not auto-charge). Salon Profile is embedded as a section while
  `/business/profile` stays live — `ProfileClient` gained a backwards-compatible
  `embedded` prop. All existing flows preserved (updateBusinessSettings, the
  notification form, the danger-zone code-confirm deletion, invite).
- **Customer Panel** (`7eb3a5a`) — appointment-focal: next-appointment ticket
  (big date, relative countdown, salon+service+staff, Google-Maps action,
  reschedule/cancel/favourite, cancellation policy), remaining upcoming,
  quick-repeat from real completed history, recent history + review prompts,
  quick links. All existing actions reused unchanged; history-only, no invented data.

---

## Exact Current State (when the limit hit)

Mid-Wave-5. Sequence at interruption:
1. Launched a background workflow (`wf_b63ef40d-650`) to write three honest
   server-component pages: **AI**, **Faktury**, **Płatności**. Faktury agent
   finished cleanly; the **AI and Płatności agents hit the session limit**, BUT
   both files were written to disk before/at failure and are present and valid
   (confirmed: build compiles them).
2. In parallel, inline, I wrote **Kupony** (new server action + page + client) and
   **Analityka** (rewritten page + new `charts.tsx` client wrapper) and thinned
   `AreaChart` x-labels in `components/ui/chart.tsx`.
3. The very last edit was writing `app/business/(business-layout)/analytics/page.tsx`.
   Immediately after, the stop instruction arrived.

Nothing was mid-write or left syntactically broken — a full `pnpm build` after the
stop **succeeded** (see Verification State).

**Not yet touched in Wave 5** (still on their earlier Machined-Silver baseline from
commit `2b17878`, functional but NOT the new experience):
- `app/business/(business-layout)/marketing/page.tsx` → still a `<ComingSoon>` stub.
- `app/business/(business-layout)/settings/settings-client.tsx` → baseline glass, not decision-cards; no Profil merge.
- `app/customer/(customer-layout)/dashboard/page.tsx` → baseline glass list, not ticket-focal.

---

## Files Changed

### Committed — Wave 1 (`be586c7`)
- NEW `components/layout/business-nav.tsx`
- `components/layout/business-sidebar.tsx`, `business-topbar.tsx`, `business-mobile-nav.tsx` (rewrites)
- `components/command-palette.tsx` (nav labels)
- `components/ui/glass/index.tsx` (+Skeleton/FormField/Timeline/TimelineRow/SplitShell/DetailEmpty/DangerButton)
- NEW `components/ui/segmented.tsx`, NEW `components/ui/chart.tsx`
- `lib/motion.ts` (+drawerSlide), `app/globals.css` (+tc-skeleton)

### Committed — Wave 2 (`d0dee01`)
- `app/business/(business-layout)/dashboard/page.tsx`
- `app/business/(business-layout)/calendar/page.tsx`, `calendar/calendar-client.tsx`

### Committed — Wave 3 (`596bd98`)
- `app/business/(business-layout)/crm/page.tsx`, `crm/crm-client.tsx`
- `app/business/(business-layout)/reviews/reviews-client.tsx`

### Committed — Wave 4 (`9622d7b`)
- `app/business/(business-layout)/services/services-client.tsx`
- `app/business/(business-layout)/staff/page.tsx`, `staff/staff-client.tsx`
- `app/business/(business-layout)/hours/hours-client.tsx`

### UNCOMMITTED — Wave 5 (working tree)
Modified:
- `app/business/(business-layout)/ai/page.tsx` — honest observations (DONE)
- `app/business/(business-layout)/analytics/page.tsx` — health story (DONE)
- `app/business/(business-layout)/invoices/page.tsx` — sales history (DONE)
- `app/business/(business-layout)/payments/page.tsx` — Stripe-state focal (DONE)
- `app/business/(business-layout)/coupons/page.tsx` — server data (DONE)
- `components/ui/chart.tsx` — AreaChart label thinning (DONE)
New (untracked):
- `lib/actions/coupons.ts` — real owner-scoped CRUD (DONE)
- `app/business/(business-layout)/coupons/coupons-client.tsx` — list + create/edit (DONE)
- `app/business/(business-layout)/analytics/charts.tsx` — client chart wrappers (DONE)

Baseline reskin (checkpoint commit `2b17878`, the whole earlier glass pass) is the
tree state that `EXPERIENCE_REDESIGN_BEFORE` points at — see checkpoints.

---

## Uncommitted Work — completeness per file

All uncommitted files are **complete and build-green**, none partial/broken:
- **ai/page.tsx** — honest deterministic "Obserwacje": dormant clients (>60d,
  named, link to CRM), unanswered reviews, quietest open day, no-show (gated ≥15%
  & min base), top service; each card footer "Wyliczone z Twoich danych — nie jest
  to prognoza AI"; honest "Wkrótce" strip for genuine ML. (Minor: may contain an
  unused const/icon — non-blocking; tidy on review.)
- **invoices/page.tsx** — "Historia sprzedaży" from COMPLETED appointments,
  StatCards, `PaymentPill` (honest tints, no amber), disabled "Wystaw fakturę",
  truthful VAT/Stripe footer.
- **payments/page.tsx** — NOT_CONNECTED / PENDING / ACTIVE state from
  `business.stripeAccountId` + `stripeOnboarded`; connect card is focal; no fake
  transactions. (Minor: unused icon components possible — non-blocking.)
- **coupons/** + **lib/actions/coupons.ts** — genuinely persistent CRUD
  (create/update/toggle/delete, unique-code guard, owner-scoped). Redemption is
  intentionally OUT of scope (not wired into booking; `usesCount` stays 0).
- **analytics/page.tsx** + **charts.tsx** — summary sentence + focal `AreaChart`
  revenue series (week=7d / month=days / year=months) + stat ticker + weekday
  `BarColumns` + revenue-structure bars + top clients; honest ghost-chart empty state.
- **chart.tsx** — x-label thinning for dense series.

---

## Commits and Checkpoints

- **Rollback checkpoint:** tag **`EXPERIENCE_REDESIGN_BEFORE`** → commit `2b17878`
  (Machined-Silver baseline, before this experience redesign). Full rollback:
  `git reset --hard EXPERIENCE_REDESIGN_BEFORE` (destroys Waves 1–5 incl.
  uncommitted Wave 5 — only if abandoning).
- Wave commits: `be586c7` (1) · `d0dee01` (2) · `596bd98` (3) · `9622d7b` (4). HEAD = `9622d7b`.
- Prior-phase tags also present: `PHASE_1_BEFORE`, `PHASE_2A/2B/2C_BEFORE`, `PHASE_3_BEFORE`, `PHASE_3_REDESIGN_BEFORE`.
- **Untracked `.claude/`** is intentionally excluded from every commit (`git commit -- ':!.claude'`).

---

## Verification State (updated — Wave 5 completion session)

- **Production build: SUCCESS** — `✓ Compiled successfully`, static generation
  19/19, exit 0. Re-run green after every module.
- **Typecheck: PASS** — `pnpm typecheck` (`tsc --noEmit`) exit 0, standalone.
- **Tests: NONE EXIST** — no test script in `package.json` and no `*.test.*` /
  `*.spec.*` files in the repo. Nothing to run (stated honestly, not skipped).
- **Live/visual verification: DONE** (dev server on :3000, authenticated owner
  session "Admin", real Supabase DB reachable — one transient `P1001` at cold
  start only):
  - **Marketing** — renders real audience ("2 klientów", segments, reach "2 z 2"),
    E-mail shows "skonfigurowana" (Resend set), booking link, live preview; no
    console errors. Send NOT triggered (would send real e-mail — correct to avoid).
  - **Ustawienia** — decision cards + live consequences; **dirty-state confirmed**
    (changed a value → "Masz niezapisane zmiany" sticky bar appeared; reverting
    cleared it); **Profil publiczny** section renders the embedded editor with its
    save intact; `/business/profile` still renders standalone (backwards-compat).
  - **Customer Panel** — renders; empty focal hero + **quick-repeat from real
    completed history** ("dainoda"/"nada") + recent history w/ "Napisz opinię" +
    quick links; no console errors.
  - **Analityka** — real summary sentence, revenue chart, stat tickers, weekday
    rhythm, revenue structure, top clients — all real, no fabricated numbers.
  - **Kupony** — **persistence proven end-to-end**: created a coupon → survived a
    full reload (DB round-trip) → deleted → confirmed removed. Test data cleaned up.
- **Route health: all 20 routes → HTTP 200** (14 business nav + profile + 5
  customer), authenticated. No 500s / error redirects → no Wave 1–4 regressions.
- **Console: no errors** on every page inspected.
- **NOT visually verified (needs manual eyes):**
  - Customer focal ticket **populated** state — no upcoming appointment existed on
    the "Admin" account and the separate customer login was not used (password
    policy). The empty-hero path + surrounding sections are verified; the ticket
    card is build- + type-checked and shares the verified primitives.
  - Full **tablet/desktop-width** visual pass — the in-app preview pane caps at
    ~800px (renders the tablet/mobile layout with bottom nav); desktop grid
    confirmed structurally + one 1280px settings check.
  - Settings **save** persistence not committed to DB (dirty-state verified; save
    uses the unchanged, previously-working `updateBusinessSettings`).

---

## Known Problems / Risks / Backend limitations

Resolved this session: Wave 5 committed; Marketing built (no longer a stub);
Ustawienia + Customer Panel redesigned; Salon-Profile→Ustawienia merge done with
the route preserved; Coupons CRUD proven against the DB; live/visual QA performed.

Remaining honest limitations (product/backend, not regressions):

1. **Marketing delivery is env-gated.** Real send needs Twilio (SMS/WhatsApp) and
   Resend (e-mail). In this dev env Resend IS configured (e-mail sends for real);
   Twilio is not (SMS/WhatsApp show "niedostępna" — correct, no fake success).
   There is still **no `Campaign`/`CampaignRecipient` model** — drafts are
   localStorage-only and sends are not persisted/scheduled/tracked. SMS/WhatsApp
   marketing consent is approximated by the `smsNotifications`/`whatsappNotifications`
   flags (there is no dedicated SMS-marketing opt-in column).
2. **Coupons redemption** still intentionally not implemented (management only;
   `usesCount` stays 0) — not wired into booking.
3. **Cancellation fee is declarative** — `cancellationFeeType/Value` are saved and
   shown as policy, but `cancelAppointment` does not auto-charge. Settings copy
   says this honestly.
4. **Faktury** = sales-history only (no invoice generation/numbering/PDF, no Stripe
   webhook persistence) — unchanged from the partial checkpoint.
5. **AI Asystent** = deterministic rule-based observations only (no LLM backend);
   labelled as such, genuine ML behind an honest "Wkrótce".
6. Possible **unused-variable lint warnings** in the earlier agent-written
   `ai/page.tsx` / `payments/page.tsx` — non-blocking (build + typecheck green).
7. `recharts` installed but unused (charts are hand-rolled SVG) — harmless.
8. Customer focal **ticket populated state** and full tablet/desktop-width pass
   still want a manual look (see Verification State).

---

## Exact Next Actions

> **All steps below are DONE** (kept as a record of what was executed). The only
> open follow-ups are the manual-eyes items in Verification State / Known Problems.
> **Rollback:** `git reset --hard EXPERIENCE_REDESIGN_BEFORE` (→ `2b17878`) reverts
> the entire experience redesign (Waves 1–5). To drop only Wave 5, reset to
> `9622d7b`. To drop one module, `git revert <its commit>`.

1. **Inspect first:** run `git status` (expect 6 modified + 3 untracked Wave-5
   files) and `git log --oneline -6`. Read this file fully.
2. **Confirm green baseline:** `pnpm build` (expect `✓ Compiled successfully`, exit 0).
3. **Commit the partial wave** (do this before new work):
   `git add -A -- ':!.claude' && git commit -m "redesign(wave 5 partial): AI Asystent, Faktury, Płatności, Kupony CRUD, Analityka"`
4. **Build Marketing** (recon: `lib/messaging.ts` has real `sendSms`/`sendWhatsApp`
   that no-op unless Twilio env set; NO Campaign model; audience derivable from the
   CRM appointment-grouping in `app/business/(business-layout)/crm/page.tsx`;
   `User.marketingEmails` is a real opt-in flag):
   a. Create `lib/actions/marketing.ts` — audience segments (Wszyscy / Uśpieni >60d /
      Najlepsi / Nadchodzące) with REAL counts + reachability (has phone / has email);
      a send action that (i) checks `twilioConfigured()`, (ii) filters reachable +
      opted-in, (iii) returns a truthful per-recipient sent/skipped result, and (iv)
      when keys are absent returns "Wysyłka niedostępna — brak konfiguracji" (NO fake success).
   b. Rewrite `app/business/(business-layout)/marketing/page.tsx` (+ a client island):
      audience panel, composer (channel toggle, char count, `{imię}`/`{salon}`/`{link}`
      tokens, live preview vs first real recipient), working copy-booking-link
      (`/b/{slug}`), and either "Zapisz roboczą" (draft, localStorage) or the honest
      send. Read `?action=new` to focus the composer.
5. **Redesign Ustawienia** (`settings-client.tsx`): decision cards (one decision each,
   title as a question, consequence sentence under segmented options), dirty-state +
   sticky save, and a **"Profil salonu" section** that reuses the profile editor
   (`app/business/(business-layout)/profile/profile-client.tsx`) — keep `/business/profile` working.
   Use the shared `Segmented`, `FormField`, `DangerButton`.
6. **Redesign Customer Panel** (`app/customer/(customer-layout)/dashboard/page.tsx`):
   nearest appointment as a focal **"ticket"** (big date, countdown/relative, salon +
   service, map link, reschedule, cancel, policy), then quick-repeat from real history,
   remaining upcoming, and keep history/favourites/notifications/profile. Preserve all
   existing customer actions (`reschedule-button.tsx`, cancel, favourites).
7. After **each** page: `pnpm build`; fix; then commit that slice.
8. **Final verification:** full build + typecheck; if a browser/dev-server is
   available, start it and screenshot every redesigned route at desktop + mobile,
   log in as owner (`clash.09xx+audit-owner@gmail.com`) and customer
   (`clash.09xx+audit-customer@gmail.com`) — password in the project memory, NOT here;
   check console/server errors; verify direct URLs incl. `/business/profile` and `/b/[slug]`.
9. Produce the final report (modified files, commits, per-wave summary, screenshots,
   build/typecheck/test results, limitations, missing-backend list, rollback).

**Reference files to read for patterns before writing Wave-5 remainder:**
`components/ui/glass/index.tsx` (primitives + signatures), `components/ui/segmented.tsx`,
`app/business/(business-layout)/analytics/charts.tsx` (server→client chart wrapper pattern),
`lib/actions/coupons.ts` (owner-scoped server-action pattern to mirror for marketing),
`components/layout/business-nav.tsx` (`PAGE_META` primary-action wiring).

---

## Approved Full Prompt (five-wave requirements — condensed but complete)

**Waves & required experiences** (functionality preserved throughout; per-wave
build + typecheck + commit; continue automatically unless a change would remove
functionality / need an undefined rule / be a destructive DB change):

- **Wave 1 — Application frame:** four-group nav (above), unified Machined-Silver
  shell, redesigned sidebar, contextual topbar (title + one primary action),
  responsive desktop/tablet/mobile nav, unified type/button/input/badge/modal/
  empty-state language, Salon-Profile-into-Ustawienia (route preserved), ⌘K
  compatibility, keyboard/a11y. Improve hierarchy/grouping/density — not a restyle.
- **Wave 2 — Daily work:** _Dziś_ = 30-second morning briefing (dominant day
  axis/timeline, appointments in time, visible free gaps, decision queue for
  pending bookings + unanswered reviews, quiet weekly summary, new-salon setup
  path; NOT four equal zero-cards). _Kalendarz_ = reception workspace (day view
  primary, employee lanes, real hours, closed/out-of-hours, now-line, mini-cal,
  filters, day/week, contextual status actions, mobile=today, no week h-scroll
  hiding today). Preserve all appointment functionality; no drag/order persistence
  unless backend exists (it doesn't).
- **Wave 3 — Relationships:** _Klienci_ = master-detail salon memory (list, profile,
  visit history, notes, counts, honest revenue, last visit, no-show, real segments,
  contextual "Umów kolejną", real history-based next step; no fabricated predictions).
  _Opinie_ = reputation workflow (unanswered-first, response progress, reply where
  reading, keep rating summary + all actions, amber only for stars).
- **Wave 4 — Offer:** _Usługi_ (keep name) = offer management (scannable list, clear
  name/duration/price hierarchy, inline editing where safe, active/inactive, create/
  delete preserved, public preview, quiet counters, edit near the item, no needless
  modals). _Zespół_ = people (avatar/identity, name/role, assigned services,
  schedule/load from real appointments, colour identity with restraint, working add,
  preserve CRUD + assignments). _Godziny_ = visible week (7 day lanes, open/closed,
  ranges, customer-facing summary, safe validation, visible unsaved state, sticky
  save on dirty, preserve update logic).
- **Wave 5 — Tools/Company/Customer:**
  - _AI Asystent_ (keep visible in Narzędzia): genuinely useful assistant from
    available data; DO NOT fabricate insights/predictions; clearly distinguish real
    data / suggestions / generated text / unavailable capabilities. **[DONE]**
  - _Marketing_ (visible): campaign workspace from existing capabilities — drafts,
    audience where available, message generation, delivery/status where implemented,
    clear empty state, NO fake sending/audience. **[NOT STARTED]**
  - _Kupony_ (visible): preserve + redesign coupon creation/code/discount rules/
    validity/usage limits/active states/validation; no unsupported discount behaviour. **[DONE — real CRUD]**
  - _Faktury_ (visible): present available invoicing clearly; if backend incomplete,
    ship safe frontend + document missing; don't pretend invoices were issued. **[DONE — sales history]**
  - _Analityka_ (keep name): coherent business-health story — one dominant revenue/
    activity chart, concise human summary from real calc, period controls, weekday
    rhythm, revenue/service structure, client behaviour where data exists, honest
    zero-state, useful next actions; a rule-based conclusion is NOT "AI". **[DONE]**
  - _Płatności_: Stripe connection state as primary focus (not connected / verification
    / active / payout+transaction info when available); no empty transaction grid as
    the main experience. **[DONE]**
  - _Ustawienia_: organise around business decisions (reservations, cancellation,
    notifications, salon/public profile, risk/security), clear consequences,
    dirty-state, save when needed, preserve all settings behaviour. **[NOT STARTED]**
  - _Customer Panel_: appointment-oriented; nearest appointment focal (large date,
    countdown/relative, salon+service, map, reschedule, cancel, policy) + quick repeat
    from real history + remaining upcoming + history + favourites + notifications +
    profile; preserve all actions. **[NOT STARTED]**

**Design system to formalise (largely done in Wave 1):** one type scale; two radii +
pills; three glass elevations; one icon system; one status system; one ink/graphite
primary; consistent spacing; tabular numerals; focus-visible; modal focus traps;
prefers-reduced-motion; glass supports hierarchy (doesn't erase it); silver for
materials/surfaces/borders/secondary; avoid excessive stacked backdrop-blur.

**Responsiveness:** verify desktop, common laptop height, tablet (iPad reception —
not a stretched phone), mobile (task-first, not shrunk desktop).

**Missing-backend notes to carry into the final report (from recon, unchanged):**
- AI: no LLM/AI backend at all (only an unused `OPENAI_API_KEY` placeholder; unused
  `AiConversation`/`AiInsight` models). Genuine forecasting/sentiment/generated
  replies require new backend — kept behind an honest "Wkrótce".
- Marketing: real bulk send needs Twilio env (likely unset → send must report
  unavailable, not fake success) and a new `Campaign`/`CampaignRecipient` model for
  persistence/scheduling/tracking; organic-reach metrics aren't attributable per-salon.
- Kupony: management is real; **redemption** (validate/apply at booking, increment
  `usesCount`) is a separate larger piece — not built.
- Faktury: no invoice generation/numbering/PDF, no Stripe webhook (payments not
  persisted), no seller NIP field — so only sales-history is honest today.

---

## Secrets and Safety
No credentials, API keys, tokens, or customer data are stored in this file. Audit
test-account passwords live in the project memory, not here.
