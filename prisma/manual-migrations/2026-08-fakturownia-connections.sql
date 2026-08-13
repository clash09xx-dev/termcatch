-- Multi-tenant Fakturownia credentials — additive, idempotent.
-- Every business connects its OWN Fakturownia account; the API token is stored
-- encrypted (AES-256-GCM) by the app and never in plaintext.
--
-- Safe to run more than once. Apply manually (NOT auto-applied by the app):
--   psql "$DATABASE_URL" -f prisma/manual-migrations/2026-08-fakturownia-connections.sql

CREATE TABLE IF NOT EXISTS "fakturownia_connections" (
  "id"              TEXT NOT NULL,
  "business_id"     TEXT NOT NULL,
  "account_name"    TEXT NOT NULL,
  "encrypted_token" TEXT NOT NULL,
  "last_sync_at"    TIMESTAMP(3),
  "connected_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fakturownia_connections_pkey" PRIMARY KEY ("id")
);

-- One connection per business (1:1).
CREATE UNIQUE INDEX IF NOT EXISTS "fakturownia_connections_business_id_key"
  ON "fakturownia_connections" ("business_id");

-- FK to businesses with ON DELETE CASCADE (drop the credentials with the salon).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fakturownia_connections_business_id_fkey'
  ) THEN
    ALTER TABLE "fakturownia_connections"
      ADD CONSTRAINT "fakturownia_connections_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
