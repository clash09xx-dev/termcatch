-- ============================================================================
-- FINAL PRODUCT FIXES — additive-only schema changes
-- Apply with `npm run db:push` (or run this idempotent SQL). No table dropped.
-- ============================================================================

-- One-time welcome email gate (email + Google signup).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "welcome_email_sent_at" TIMESTAMP(3);
