-- Phase 1 Commons: add 5 new property_status enum values
--
-- Postgres requires COMMIT between ADD VALUE and any reference to the new value,
-- so each value gets its own transaction. Idempotent via IF NOT EXISTS.
--
-- Downstream migrations (20260710120600_add_commons_rls_and_triggers.sql) reference
-- these values in RLS policies and trigger bodies — they must be committed first.
--
-- ROLLBACK: Postgres does NOT support removing enum values. To rollback, this
-- migration must be paired with a full type rename dance:
--   ALTER TYPE property_status RENAME TO property_status_old;
--   CREATE TYPE property_status AS ENUM (<original 12 values>);
--   ALTER TABLE properties ALTER COLUMN status TYPE property_status USING status::text::property_status;
--   DROP TYPE property_status_old;
-- Do not attempt automatically — a running listing in any of the 5 new statuses
-- would fail the type cast. Manual intervention required.

BEGIN;
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'pending_review';
COMMIT;

BEGIN;
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'changes_requested';
COMMIT;

BEGIN;
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'edit_pending_review';
COMMIT;

BEGIN;
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'unlisted';
COMMIT;

BEGIN;
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'archived';
COMMIT;

-- Verification (run manually after migration):
-- SELECT unnest(enum_range(NULL::public.property_status));
-- Expected: 17 rows including the 5 new values.
