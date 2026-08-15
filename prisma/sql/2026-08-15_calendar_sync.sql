-- ============================================================
-- TermCatch — calendar synchronization (Google Calendar bridge)
-- Run once against the Supabase database (SQL editor or psql).
-- ============================================================
--
-- WHAT THIS DOES
--   1. calendar_connections
--      One connected external calendar, per employee or salon-wide.
--   2. appointment_calendar_events
--      The appointment ↔ external event link that makes mirroring idempotent.
--
-- WHY IT IS SAFE
--   Purely additive and IF NOT EXISTS guarded, so it is re-runnable and touches
--   no existing row. No column is dropped, no type changed, no data rewritten.
--   With no rows in these tables the product behaves exactly as it does today:
--   availability falls back to TermCatch appointments only.
--
--   Equivalent to `pnpm db:push` for the same schema change — run either, not
--   both. Written out because this project keeps no migrations directory and a
--   reviewable file beats an unreviewable push.
--
-- AFTER RUNNING
--   pnpm db:generate
-- ============================================================

BEGIN;

-- ── 1. Calendar connections ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "calendar_connections" (
  "id"                       TEXT NOT NULL,
  "business_id"              TEXT NOT NULL,
  "employee_id"              TEXT,
  "provider"                 TEXT NOT NULL DEFAULT 'google',
  "account_email"            TEXT,
  "calendar_id"              TEXT,
  "calendar_summary"         TEXT,
  -- AES-256-GCM ciphertext only. A plaintext token must never reach this table.
  "encrypted_access_token"   TEXT,
  "encrypted_refresh_token"  TEXT,
  "access_token_expires_at"  TIMESTAMP(3),
  "scope"                    TEXT,
  "read_busy"                BOOLEAN NOT NULL DEFAULT true,
  "write_events"             BOOLEAN NOT NULL DEFAULT false,
  "status"                   TEXT NOT NULL DEFAULT 'connected',
  "last_synced_at"           TIMESTAMP(3),
  "last_error"               TEXT,
  "connected_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "calendar_connections_business_id_idx"
  ON "calendar_connections" ("business_id");
CREATE INDEX IF NOT EXISTS "calendar_connections_employee_id_idx"
  ON "calendar_connections" ("employee_id");
-- The health list on the settings page reads "this business, by status".
CREATE INDEX IF NOT EXISTS "calendar_connections_business_id_status_idx"
  ON "calendar_connections" ("business_id", "status");

-- Ownership uniqueness, split in two because Postgres treats NULLs as distinct
-- and a single UNIQUE(business, employee, provider) would let a salon collect
-- unlimited salon-wide rows.
--
--   a) one connection per (employee, provider)
--   b) one salon-wide connection per (business, provider) when employee is NULL
CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_employee_provider_key"
  ON "calendar_connections" ("employee_id", "provider")
  WHERE "employee_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "calendar_connections_business_provider_key"
  ON "calendar_connections" ("business_id", "provider")
  WHERE "employee_id" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_connections_business_id_fkey') THEN
    ALTER TABLE "calendar_connections"
      ADD CONSTRAINT "calendar_connections_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_connections_employee_id_fkey') THEN
    ALTER TABLE "calendar_connections"
      ADD CONSTRAINT "calendar_connections_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 2. Appointment ↔ external event link ────────────────────
CREATE TABLE IF NOT EXISTS "appointment_calendar_events" (
  "id"                   TEXT NOT NULL,
  "appointment_id"       TEXT NOT NULL,
  "connection_id"        TEXT NOT NULL,
  "provider"             TEXT NOT NULL DEFAULT 'google',
  "external_event_id"    TEXT NOT NULL,
  "external_calendar_id" TEXT,
  "sync_state"           TEXT NOT NULL DEFAULT 'synced',
  "last_error"           TEXT,
  "synced_at"            TIMESTAMP(3),
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_calendar_events_pkey" PRIMARY KEY ("id")
);

-- THE idempotency guarantee: one mirror per appointment per connection, so a
-- retried write patches the existing event instead of creating a second one.
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_calendar_events_appointment_connection_key"
  ON "appointment_calendar_events" ("appointment_id", "connection_id");
CREATE INDEX IF NOT EXISTS "appointment_calendar_events_connection_id_idx"
  ON "appointment_calendar_events" ("connection_id");
-- Lets a future retry job find the rows that need another attempt.
CREATE INDEX IF NOT EXISTS "appointment_calendar_events_sync_state_idx"
  ON "appointment_calendar_events" ("sync_state");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointment_calendar_events_appointment_id_fkey') THEN
    ALTER TABLE "appointment_calendar_events"
      ADD CONSTRAINT "appointment_calendar_events_appointment_id_fkey"
      FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointment_calendar_events_connection_id_fkey') THEN
    ALTER TABLE "appointment_calendar_events"
      ADD CONSTRAINT "appointment_calendar_events_connection_id_fkey"
      FOREIGN KEY ("connection_id") REFERENCES "calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Both tables hold OAuth ciphertext and cross-tenant scheduling links, and are
-- reached only through server code running with the service role that checks
-- ownership itself (lib/calendar/*, lib/actions/calendar-sync.ts).
--
-- If your project enables RLS per table, enable it here and add NO permissive
-- policy — with RLS on and no policy, only the service role can read, which is
-- exactly the access the app needs. The anon key must never be able to select
-- from calendar_connections: that row contains encrypted refresh tokens.
--
--   ALTER TABLE "calendar_connections"         ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "appointment_calendar_events"  ENABLE ROW LEVEL SECURITY;
