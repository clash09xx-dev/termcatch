# TermCatch — Experience Redesign · Cowork Handoff

> Handoff for a fresh session. Implementation was stopped mid-Wave-5 at a usage
> limit. **Everything through Wave 4 is committed; Wave 5 is ~60% done and
> UNCOMMITTED but present in the working tree.** The production build is green.

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
| 5 | Tools/Company/Customer | **PARTIALLY COMPLETE — UNCOMMITTED** | — |

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

### Wave 5 — PARTIALLY COMPLETE (UNCOMMITTED, build-green)
DONE (uncommitted): **AI Asystent**, **Faktury**, **Płatności**, **Kupony** (real
CRUD), **Analityka**. NOT STARTED: **Marketing**, **Ustawienia** redesign +
Profil merge, **Customer Panel**. Detail below.

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

## Verification State

- **Production build: SUCCESS.** Ran `pnpm build` AFTER the stop, with all
  uncommitted Wave 5 files on disk → `✓ Compiled successfully in 3.9s`, static
  generation 19/19, exit 0. Real, not assumed.
- **Typecheck: PASS** (Next build type-checks; it would have failed on any TS error).
- **Tests: NOT RUN** this session (no test run attempted for the redesign).
- **Routes manually checked in a browser: NONE for Waves 1–5.** The in-app Preview
  MCP disconnected mid-session and no dev server is running, so **there is zero
  live/visual verification of the redesign** — correctness rests on the build +
  code review only.
- **Console/server errors: UNKNOWN** (not observed in a browser).
- **Running at limit:** the background workflow (`wf_b63ef40d-650`) — its AI &
  Płatności agents errored on the session limit but their files were already written.
- **Not verified:** all visual/interaction, mobile/tablet/laptop breakpoints, both
  roles, direct-URL compatibility, empty-vs-populated states, motion/reduced-motion,
  the new Coupons CRUD end-to-end against the DB.

---

## Known Problems / Risks

1. **Wave 5 is uncommitted** — persists in the working tree but is not checkpointed;
   commit it first (see Next Actions) so it can't be lost.
2. **Marketing not built** — `/business/marketing` is still a `<ComingSoon>` stub,
   yet the topbar `PAGE_META` gives it a "Nowa kampania" `?action=new` primary
   action that currently does nothing. Build the page (and it should read `?action=new`).
3. **Ustawienia + Customer Panel not redesigned** to Wave-5 spec (they render fine
   on the earlier baseline, so not broken — just not the new experience). **Salon
   Profile→Ustawienia merge not done** (route still standalone).
4. Possible **unused-variable lint warnings** in agent-written `ai/page.tsx` and
   `payments/page.tsx` (e.g. an unused icon/const) — non-blocking (build passed);
   tidy during review.
5. **No live/visual QA** performed for any wave (tooling constraint). High priority
   before declaring done.
6. **Coupons redemption** is intentionally not implemented (management only) — do
   not present usage analytics as live.
7. `recharts` is installed but unused (charts are hand-rolled SVG) — harmless; can
   be removed in cleanup.

---

## Exact Next Actions (resume here)

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
