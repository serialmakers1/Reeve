-- Phase 1 Commons: add public-identity columns to profiles
--
-- display_name: preferred public name; falls back to users.full_name → email prefix per D-085.
-- bio: 200-char public bio (enforced app-side, not DB-side, for flexibility).
-- is_public: reserved for future hide-profile toggle. No UI in Phase 1 (D-051).
--
-- profile_photo_url ALREADY EXISTS on profiles — no column change needed. Triggers in
-- migration 7 populate it from Google OAuth metadata.
--
-- No backfill of display_name (D-105) — existing rows get NULL; UI falls back via D-085.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.display_name IS
  'Preferred public display name. NULL means fall back to users.full_name.';

COMMENT ON COLUMN public.profiles.bio IS
  'Public 200-char bio (limit enforced app-side).';

COMMENT ON COLUMN public.profiles.is_public IS
  'Reserved for future hide-profile toggle. All profiles public by default.';

COMMIT;

-- Verification:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='profiles'
--   AND column_name IN ('display_name','bio','is_public');
-- Expected: 3 rows.
--
-- SELECT count(*) FROM public.profiles WHERE is_public IS NOT true;
-- Expected: 0 rows (default applied to all existing rows).
