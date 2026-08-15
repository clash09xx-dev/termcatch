-- ============================================================
-- TermCatch — join codes + moderation
-- Run once against the Supabase database (SQL editor or psql).
-- ============================================================
--
-- WHAT THIS DOES
--   1. businesses.join_code / join_code_updated_at
--      The per-salon code a specialist types in Settings to join the team.
--   2. blocked_businesses
--      A customer hiding a salon from their own search results and bookings.
--   3. reports
--      The moderation queue behind the "Report" action on a salon profile.
--
-- WHY IT IS SAFE
--   Every statement is additive and IF NOT EXISTS guarded, so it can be run
--   more than once and it touches no existing row. No column is dropped, no
--   type is changed, no data is rewritten. Existing salons simply have a NULL
--   join_code until the owner opens the team page, which mints one lazily.
--
--   This mirrors `prisma db push` for the same schema change — run either, not
--   both. It is written out here because the project keeps no migrations
--   directory, and a reviewable SQL file beats an unreviewable push.
--
-- AFTER RUNNING
--   pnpm db:generate   (regenerate the Prisma client)
-- ============================================================

BEGIN;

-- ── 1. Join codes ───────────────────────────────────────────
ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "join_code" TEXT,
  ADD COLUMN IF NOT EXISTS "join_code_updated_at" TIMESTAMP(3);

-- Unique so a code resolves to exactly one salon, and so regenerating can
-- never collide with a live code. Partial: NULLs are not unique in Postgres
-- anyway, but being explicit documents that "no code yet" is a valid state.
CREATE UNIQUE INDEX IF NOT EXISTS "businesses_join_code_key"
  ON "businesses" ("join_code")
  WHERE "join_code" IS NOT NULL;

-- ── 2. Blocked businesses ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "blocked_businesses" (
  "id"          TEXT NOT NULL,
  "user_id"     TEXT NOT NULL,
  "business_id" TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blocked_businesses_pkey" PRIMARY KEY ("id")
);

-- One block per (person, salon): the action is idempotent by design.
CREATE UNIQUE INDEX IF NOT EXISTS "blocked_businesses_user_id_business_id_key"
  ON "blocked_businesses" ("user_id", "business_id");
CREATE INDEX IF NOT EXISTS "blocked_businesses_user_id_idx"
  ON "blocked_businesses" ("user_id");
CREATE INDEX IF NOT EXISTS "blocked_businesses_business_id_idx"
  ON "blocked_businesses" ("business_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blocked_businesses_user_id_fkey'
  ) THEN
    ALTER TABLE "blocked_businesses"
      ADD CONSTRAINT "blocked_businesses_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blocked_businesses_business_id_fkey'
  ) THEN
    ALTER TABLE "blocked_businesses"
      ADD CONSTRAINT "blocked_businesses_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 3. Reports ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "reports" (
  "id"          TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,           -- 'business' | 'review'
  "target_id"   TEXT NOT NULL,
  "reason"      TEXT NOT NULL,           -- spam | inappropriate | wrong_info | other
  "details"     TEXT,
  "status"      TEXT NOT NULL DEFAULT 'open',  -- open | reviewing | resolved | dismissed
  "handled_by"  TEXT,
  "handled_at"  TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- The queue is read "open first, newest first"; the other two indexes serve
-- "everything reported about this target" and "everything this person filed".
CREATE INDEX IF NOT EXISTS "reports_status_created_at_idx"
  ON "reports" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "reports_target_type_target_id_idx"
  ON "reports" ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "reports_reporter_id_idx"
  ON "reports" ("reporter_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_reporter_id_fkey'
  ) THEN
    ALTER TABLE "reports"
      ADD CONSTRAINT "reports_reporter_id_fkey"
      FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Both new tables are reached only through server actions that run with the
-- service role and check identity themselves (lib/actions/moderation.ts,
-- lib/actions/admin-reports.ts), which is how the rest of this schema works.
--
-- If your project enables RLS per table, enable it here too and keep the
-- default deny — there is no case where the anon key should read either table
-- directly: a block list and a report queue are private by definition.
--
--   ALTER TABLE "blocked_businesses" ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "reports"            ENABLE ROW LEVEL SECURITY;
--
-- (No permissive policy is added on purpose: with RLS on and no policy, only
-- the service role can read, which matches how the app accesses them.)
