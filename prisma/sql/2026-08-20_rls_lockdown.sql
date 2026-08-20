-- ============================================================
-- TermCatch — defence-in-depth lockdown of the PostgREST surface
-- Run once against the Supabase database (SQL editor or psql).
-- ============================================================
--
-- WHY THIS EXISTS
--   Supabase exposes every table in `public` over HTTPS through PostgREST, to
--   the `anon` and `authenticated` roles, using the PUBLISHABLE key that ships
--   in the browser bundle by design. The only things standing between that API
--   and the data are (a) table privileges and (b) row-level security.
--
--   Audited state before this file:
--     * 57 tables in public, RLS enabled on 0, policies: 0
--     * anon/authenticated hold only REFERENCES/TRIGGER/TRUNCATE on those
--       tables -- no SELECT/INSERT/UPDATE/DELETE -- so PostgREST answers 401
--       (Postgres 42501) today. Verified by calling the REST API with the
--       real publishable key: every table refused.
--
--   So the door is shut, but only by accident of WHO created the tables.
--   `pg_default_acl` carries two entries for schema public:
--     * granted by `postgres`       -> anon gets Dxtm      (no read/write)  OK
--     * granted by `supabase_admin` -> anon gets arwdDxtm  (FULL CRUD)      NOT OK
--   Prisma connects as `postgres`, which is why the current tables are safe.
--   A table created through the Supabase dashboard/SQL editor can land under
--   the `supabase_admin` default instead and be world-readable AND writable the
--   moment it exists, with no code change and no warning.
--
--   This file removes the accident and replaces it with a rule.
--
-- WHY IT CANNOT BREAK THE APP
--   Prisma connects as `postgres`, which owns all 57 tables and has
--   `rolbypassrls = true`. A role with BYPASSRLS ignores row-level security
--   entirely, and no table here uses FORCE ROW LEVEL SECURITY. Enabling RLS is
--   therefore invisible to every server-side query the product makes -- and it
--   is the backstop that makes a future stray GRANT harmless, because a table
--   with RLS on and zero policies denies everything to everyone else.
--
--   Authorization itself does NOT move: it stays in the server (ownership and
--   membership resolved from the session in lib/ownership, per-action gates in
--   lib/actions/*). This file adds a second wall behind that one; it is not a
--   replacement for it.
--
-- WHY IT IS SAFE TO RE-RUN
--   Every statement is idempotent: ENABLE ROW LEVEL SECURITY on an
--   already-enabled table is a no-op, REVOKE of a privilege that is not held is
--   a no-op, and ALTER DEFAULT PRIVILEGES is declarative.
--   No row is read, written or deleted. No column or type is changed.
--
-- AFTER RUNNING
--   pnpm db:check                 (must stay green)
--   plus the REST probe in the report, which must still return 401
-- ============================================================

BEGIN;

-- ── 1. RLS on every existing table in public ────────────────
-- Zero policies == deny-all for anyone who is not the owner/BYPASSRLS.
DO $$
DECLARE t regclass;
BEGIN
  FOR t IN
    SELECT c.oid::regclass
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;

-- ── 2. Take away the write/read privileges nobody should hold ──
-- TRUNCATE on every table for `anon` is not reachable through PostgREST (it
-- only issues SELECT/INSERT/UPDATE/DELETE and RPC), but it has no business
-- being granted either.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- ── 3. Close the default-privilege hole for FUTURE tables ────
-- Both grantors, because the dangerous entry belongs to supabase_admin and the
-- benign one to postgres; a future table can be created by either.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

COMMIT;
