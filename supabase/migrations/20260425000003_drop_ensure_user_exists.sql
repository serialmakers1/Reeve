-- Migration: Drop zombie function ensure_user_exists()
-- This function was superseded by the handle_new_user / handle_user_updated triggers
-- and the verify-phone-otp edge function. Zero callers confirmed via:
--   pg_depend, RLS policies, views, triggers, and grep of src/.
-- The only reference in src/ is an auto-generated type stub in types.ts (not a call).
--
-- DOWN:
--   Recreate with the body from the diagnostic (stored in git history).
--   No data is touched by this migration; rollback is safe at any point.

BEGIN;

DROP FUNCTION IF EXISTS public.ensure_user_exists();

-- ── Verification ──────────────────────────────────────────────────────────────
-- Expected: 0 rows
SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'ensure_user_exists';

COMMIT;
