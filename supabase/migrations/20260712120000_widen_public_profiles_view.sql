-- F1 fix (D-125, D-126): expose users.full_name via public_profiles view.
-- Widening from display_name-only. D-125 simplifies the name model — the
-- display_name concept is dropped as a public identity source. The view now
-- returns user_id, full_name, profile_photo_url, bio.
-- Email and phone remain private (D-126 boundary).
--
-- Rationale for security_invoker = false: view runs as owner (postgres role),
-- bypassing users_select RLS which blocks cross-user reads of full_name. The
-- view itself defines what's public. Users RLS stays restrictive for direct
-- queries. Sensitive columns are unreachable via this object.
--
-- Anon SELECT grant: defensive — currently /u/:userId requires auth, but
-- preserves the shape for future unauthenticated public profile views.

BEGIN;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = false)
AS
SELECT
  u.id                   AS user_id,
  u.full_name,
  p.profile_photo_url,
  p.bio
FROM public.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

COMMENT ON VIEW public.public_profiles IS
  'Public-safe identity: user_id, full_name, profile_photo_url, bio. Email and phone are NEVER exposed (D-126). Used by /u/:userId page and admin listing review queue name lookup.';

COMMIT;

-- Verification:
-- 1. View columns:
--    SELECT column_name FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='public_profiles';
--    Expected: user_id, full_name, profile_photo_url, bio.
-- 2. Admin queue non-empty full_name for existing users:
--    SELECT COUNT(*) FROM public.public_profiles WHERE full_name IS NOT NULL;
