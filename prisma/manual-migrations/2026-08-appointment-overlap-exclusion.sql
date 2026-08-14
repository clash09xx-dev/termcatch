-- ============================================================================
-- P0 — Hard, concurrency-proof double-booking guarantee.
--
-- Makes it PHYSICALLY IMPOSSIBLE for two non-cancelled appointments with the
-- SAME employee to overlap in time — enforced by Postgres itself, so it holds
-- for every write path (app, raw SQL, future code) and under any race, even if
-- the application-level advisory lock is ever bypassed.
--
-- Prisma cannot express EXCLUDE constraints, so this is applied MANUALLY and is
-- NOT removed by `prisma db push` (push ignores constraint types it doesn't
-- model). Apply AFTER `prisma db push`. Safe to run more than once.
--
--   psql "$DATABASE_URL" -f prisma/manual-migrations/2026-08-appointment-overlap-exclusion.sql
--
-- start_time / end_time are `timestamp(3)` (Prisma DateTime, stored in UTC), so
-- tsrange (not tstzrange) is correct. Half-open [) bounds: 10:00–11:00 and
-- 11:00–12:00 do NOT conflict; 10:00–11:00 and 10:30–11:30 DO. The "any
-- specialist" case (employee_id IS NULL) is deliberately excluded here — NULLs
-- never conflict in EXCLUDE, and that capacity rule stays owned by the app's
-- advisory-lock guard.
-- ============================================================================

-- GiST index support for equality (=) on a scalar column alongside a range (&&).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── PRE-FLIGHT: this MUST return zero rows before the constraint can be added ──
-- Existing overlapping pairs (e.g. the double-booking the tester created) will
-- make ADD CONSTRAINT fail. Inspect + resolve them first (cancel/repoint one of
-- each pair), then re-run this file. This query is read-only.
--
--   SELECT a.id AS keep_id, b.id AS dup_id, a.employee_id, a.start_time, a.end_time
--   FROM appointments a
--   JOIN appointments b
--     ON a.employee_id = b.employee_id
--    AND a.id < b.id
--    AND a.start_time < b.end_time
--    AND a.end_time   > b.start_time
--   WHERE a.employee_id IS NOT NULL
--     AND a.status NOT IN ('CANCELLED_CUSTOMER','CANCELLED_BUSINESS')
--     AND b.status NOT IN ('CANCELLED_CUSTOMER','CANCELLED_BUSINESS');

-- Idempotent add (no IF NOT EXISTS for constraints → guard via pg_constraint).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_employee_overlap'
  ) THEN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_no_employee_overlap"
      EXCLUDE USING gist (
        "employee_id" WITH =,
        tsrange("start_time", "end_time") WITH &&
      )
      WHERE (
        "employee_id" IS NOT NULL
        AND "status" NOT IN ('CANCELLED_CUSTOMER', 'CANCELLED_BUSINESS')
      );
  END IF;
END
$$;

-- ROLLBACK (if ever needed):
--   ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_no_employee_overlap";
