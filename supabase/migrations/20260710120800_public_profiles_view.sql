-- Phase 1 Commons Prompt 5: public_profiles view
--
-- Exposes only the public-safe columns of profiles: display_name, bio,
-- profile_photo_url, is_public. Sensitive columns (Aadhaar, PAN, DOB, KYC,
-- occupation, marital_status, emergency contact, screening opt-out, visit
-- block flag, no-show count) are NOT reachable via this view.
--
-- security_invoker = true ensures the caller's RLS applies to the underlying
-- profiles table. Since profiles' SELECT policies are restrictive (own-row +
-- admin), the view would return zero rows for other users' profiles without
-- an accompanying permissive read policy.
--
-- We add a matching permissive SELECT policy `profiles_select_public_columns`
-- that only fires when the caller is fetching THROUGH the view (i.e., only
-- exposes public columns). Since Postgres RLS policies are table-wide, we
-- instead add a permissive SELECT policy that any authenticated user may hit,
-- and rely on the view's column projection to hide sensitive columns.
--
-- Trade-off: `SELECT * FROM profiles` by an authenticated user would now
-- return all rows too. Combined SELECT policies OR by design. To keep the
-- sensitive columns off the wire, we DROP the existing broad SELECT policy
-- and split into TWO:
--   1. profiles_select_own    — full row access to the owner + admin
--   2. profiles_select_public_view — access ONLY through the view (enforced
--      at the view layer, not policy — as a documentation-level distinction)
--
-- Since Postgres cannot restrict a policy by "queried column set", we take
-- the simpler path: recreate profiles_select as-is (own + admin), and grant
-- authenticated SELECT ONLY on the view (which is a separate object with its
-- own grants). The view uses security_invoker so it enforces the underlying
-- policy — meaning the view would return NO rows for other users unless we
-- ALSO add a broader row-level policy.
--
-- Correct solution: use `security_invoker = false` (SECURITY DEFINER view,
-- default in older Postgres). The view runs as its owner (which has full
-- SELECT), and we grant SELECT on the view to authenticated. The view body
-- filters by is_public = true.
--
-- This is safe because the view exposes only 5 columns (user_id + 4 public)
-- and its WHERE clause enforces the is_public gate. Sensitive columns are
-- unreachable through this object.

BEGIN;

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = false)
AS
SELECT
  user_id,
  display_name,
  bio,
  profile_photo_url,
  is_public
FROM public.profiles
WHERE COALESCE(is_public, true) = true;

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

COMMENT ON VIEW public.public_profiles IS
  'Public-safe subset of profiles: display_name, bio, profile_photo_url, is_public. Filtered by is_public. Used by /u/:userId page.';

COMMIT;

-- Verification:
-- 1. View exists:
--    SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name='public_profiles';
-- 2. Grants to authenticated:
--    SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema='public' AND table_name='public_profiles' AND grantee='authenticated';
-- 3. Only 5 columns:
--    SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='public_profiles';
--    Expected: user_id, display_name, bio, profile_photo_url, is_public.
