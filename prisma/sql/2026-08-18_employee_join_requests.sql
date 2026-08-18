-- ============================================================
-- TermCatch — specialist join REQUESTS (owner approval)
-- Run once against the Supabase database (SQL editor or psql).
-- ============================================================
--
-- WHAT THIS DOES
--   1. join_request_status  — PENDING | APPROVED | REJECTED
--   2. employee_join_requests
--      The queue between "a specialist typed the salon's join code" and
--      "the owner let them in". Typing the code used to create the Employee
--      row outright; it now only creates a row here, and the Employee row is
--      created when the owner approves.
--
-- WHY IT IS SAFE
--   Purely additive: one new enum type, one new table, no existing table is
--   altered and no existing row is touched. Every statement is IF NOT EXISTS
--   guarded (the enum via a DO block, since CREATE TYPE has no IF NOT EXISTS),
--   so re-running it is a no-op.
--
--   Salons that already have Employee rows are unaffected — approved
--   membership is still exactly "an active Employee row linked to a User", and
--   this table only records how a future one came to exist.
--
--   This mirrors `prisma db push` for the same schema change — run either, not
--   both. It is written out here because the project keeps no migrations
--   directory, and a reviewable SQL file beats an unreviewable push.
--
-- AFTER RUNNING
--   pnpm db:generate   (regenerate the Prisma client)
--   pnpm db:check      (confirms the table + columns are really there)
-- ============================================================

BEGIN;

-- ── 1. Status enum ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JoinRequestStatus') THEN
    CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

-- ── 2. The request queue ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "employee_join_requests" (
  "id"          TEXT NOT NULL,
  "business_id" TEXT NOT NULL,
  "user_id"     TEXT NOT NULL,
  "status"      "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  -- Set at approval: the Employee row this request produced.
  "employee_id" TEXT,
  "decided_at"  TIMESTAMP(3),
  "decided_by"  TEXT,
  -- Last time approval was refused because the plan was full. The request
  -- stays PENDING so it becomes approvable again after an upgrade.
  "blocked_at"  TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_join_requests_pkey" PRIMARY KEY ("id")
);

-- One live request per (salon, person): re-applying after a rejection reuses
-- the row instead of filling the owner's queue with duplicates. This is also
-- what stops two concurrent submissions from creating two pending rows.
CREATE UNIQUE INDEX IF NOT EXISTS "employee_join_requests_business_id_user_id_key"
  ON "employee_join_requests" ("business_id", "user_id");

CREATE INDEX IF NOT EXISTS "employee_join_requests_business_id_status_idx"
  ON "employee_join_requests" ("business_id", "status");

CREATE INDEX IF NOT EXISTS "employee_join_requests_user_id_idx"
  ON "employee_join_requests" ("user_id");

-- Cascades: deleting a salon or an account must not leave a request behind
-- that would resurrect a membership question about something that no longer
-- exists. Added conditionally so a re-run does not error on a duplicate name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_join_requests_business_id_fkey'
  ) THEN
    ALTER TABLE "employee_join_requests"
      ADD CONSTRAINT "employee_join_requests_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employee_join_requests_user_id_fkey'
  ) THEN
    ALTER TABLE "employee_join_requests"
      ADD CONSTRAINT "employee_join_requests_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

COMMIT;
