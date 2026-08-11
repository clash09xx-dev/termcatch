-- ============================================================================
-- AI PLATFORM — schema additions
-- ============================================================================
-- Two new tables introduced by the AI operating layer. The project manages
-- schema with `prisma db push` (no migration history), so the canonical way to
-- apply this is:
--
--     npm run db:push          # prisma db push — reconciles schema.prisma
--
-- This raw SQL is provided as an explicit, reviewable equivalent for anyone who
-- prefers to apply it by hand (idempotent — safe to re-run). It only ADDS
-- tables; it never alters or drops existing ones, so it cannot affect the live
-- booking or billing flows.
--
-- NOTE: the AiInsight (ai_insights), AiConversation (ai_conversations) and
-- Invoice (invoices) tables already exist in the schema and are reused as-is —
-- no changes to them here.
-- ============================================================================

-- Per-business OpenAI usage / cost ledger (rate limiting + accounting).
CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
    "id"             TEXT NOT NULL,
    "business_id"    TEXT NOT NULL,
    "user_id"        TEXT,
    "feature"        TEXT NOT NULL,
    "model"          TEXT NOT NULL,
    "input_tokens"   INTEGER NOT NULL DEFAULT 0,
    "output_tokens"  INTEGER NOT NULL DEFAULT 0,
    "estimated_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ok"             BOOLEAN NOT NULL DEFAULT true,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_usage_logs_business_id_created_at_idx"
    ON "ai_usage_logs" ("business_id", "created_at");

-- Reference to invoices issued through the external Fakturownia API.
CREATE TABLE IF NOT EXISTS "fakturownia_invoices" (
    "id"             TEXT NOT NULL,
    "business_id"    TEXT NOT NULL,
    "appointment_id" TEXT,
    "customer_id"    TEXT,
    "fakturownia_id" INTEGER NOT NULL,
    "number"         TEXT,
    "total_amount"   DOUBLE PRECISION NOT NULL,
    "currency"       TEXT NOT NULL DEFAULT 'PLN',
    "buyer_name"     TEXT NOT NULL,
    "status"         TEXT NOT NULL DEFAULT 'issued',
    "view_url"       TEXT,
    "sent_at"        TIMESTAMP(3),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fakturownia_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fakturownia_invoices_fakturownia_id_key"
    ON "fakturownia_invoices" ("fakturownia_id");
CREATE INDEX IF NOT EXISTS "fakturownia_invoices_business_id_created_at_idx"
    ON "fakturownia_invoices" ("business_id", "created_at");
CREATE INDEX IF NOT EXISTS "fakturownia_invoices_appointment_id_idx"
    ON "fakturownia_invoices" ("appointment_id");
