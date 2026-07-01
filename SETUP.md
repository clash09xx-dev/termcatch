# Termcatch — Setup Guide

## Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- Supabase account (free)
- Stripe account

---

## 1. Install dependencies

```bash
pnpm install
```

---

## 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **Project Settings → Database → Connection string**
   - Copy "Transaction" mode URL (port 6543) → `DATABASE_URL`
   - Copy "Session" mode URL (port 5432) → `DIRECT_URL`

### Enable Auth Providers
- Go to **Authentication → Providers**
- Enable **Email** (default)
- Enable **Google** (add your OAuth credentials)

---

## 3. Configure environment

```bash
cp .env.example .env.local
# Fill in your values
```

---

## 4. Push database schema

```bash
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema to Supabase
```

---

## 5. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 6. Stripe setup

1. Copy secret key to `STRIPE_SECRET_KEY` and publishable key to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. For webhooks in dev: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

---

## Project Structure

```
termcatch/
├── app/
│   ├── (auth)/          # Login, Register, Reset Password
│   ├── (customer)/      # Customer dashboard
│   ├── (business)/      # Business dashboard
│   ├── (admin)/         # Admin panel
│   ├── api/             # API routes
│   └── page.tsx         # Landing page
├── components/
│   ├── ui/              # Button, Input, Badge, Card, Avatar...
│   ├── layout/          # Navbars, Sidebars, Footers
│   ├── booking/         # Search bar, Booking flow
│   └── providers/       # Theme, React Query
├── lib/
│   ├── supabase/        # Client + server helpers
│   ├── prisma.ts        # Singleton
│   ├── stripe.ts        # Stripe helpers
│   ├── utils.ts         # cn(), formatCurrency(), etc.
│   └── env.ts           # Type-safe env vars
├── actions/
│   └── auth/            # Server actions: login, register, logout
├── types/               # Global TypeScript types
├── prisma/
│   └── schema.prisma    # Full DB schema
└── middleware.ts         # Route protection
```

---

## Phase 2 Roadmap (next session)

- [ ] Business onboarding flow
- [ ] Employee management (CRUD)
- [ ] Service management (CRUD)
- [ ] Working hours editor
- [ ] Calendar view (week/day)
- [ ] Booking engine (availability algorithm)

## Phase 3 Roadmap

- [ ] Search page with filters
- [ ] Business public profile
- [ ] Booking flow (step-by-step)
- [ ] Stripe payment integration
- [ ] Reviews system

## Architecture Decisions

### Why Supabase Auth + Prisma?
Supabase handles OAuth, email magic links, and session management. Prisma gives us a type-safe query layer with full control over our schema — we're not locked into Supabase's ORM.

### Why Server Actions?
Eliminates the need for a separate API layer for most mutations. Less boilerplate, better TypeScript integration, automatic revalidation.

### Availability-First Search
The core differentiator vs Booksy. The search algorithm prioritizes:
1. Available NOW (within next 2 hours)
2. Available TODAY
3. Earliest available slot
4. Distance, Rating, Price

This is computed server-side with a smart SQL query joining appointments and working hours, never showing "available in 5 days" results first.

### Generic Booking Engine
The `Appointment` model is completely agnostic — it works for haircuts, doctor appointments, car washes, parking. Adding a new category requires:
- One new `ServiceCategory` enum value
- One new category icon on the frontend
- Zero backend changes
```
