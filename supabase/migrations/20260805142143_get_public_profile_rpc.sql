-- Purpose: Secure verification-gated identity read path for the /u/:userId page.
-- Security: SECURITY DEFINER, authenticated only, viewer derived from auth.uid()
--   (never client-supplied). Requires viewer phone_verified AND email_verified.
-- Rationale: public.users RLS (users_select_own = own-row OR is_admin) blocks the
--   two intended cross-user viewing paths (tenant->lister, owner->contact-requester),
--   so PublicProfile.tsx read full_name as NULL and rendered "Anonymous". This RPC
--   returns only public-safe identity columns without broadening public.users RLS.
-- Exposes ONLY: user_id, full_name, profile_photo_url, bio, is_public, created_at,
--   phone_verified, email_verified. NEVER email/phone/role/pseudonym/display_name/
--   auth_provider/KYC.
-- Note: public_profiles view grants intentionally left intact — the public property
--   page owner card (useOwnerCard) and admin listing queue depend on the view; lister
--   names on public listings are intended public data.
-- Applied: (deploy manually via Supabase CLI)

DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(p_user_id uuid)
RETURNS TABLE (
  user_id            uuid,
  full_name          text,
  profile_photo_url  text,
  bio                text,
  is_public          boolean,
  created_at         timestamptz,
  phone_verified     boolean,
  email_verified     boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_viewer     uuid := auth.uid();
  v_v_phone    boolean;
  v_v_email    boolean;
  v_is_admin   boolean;
  v_is_public  boolean;
  v_found      boolean;
BEGIN
  -- 1. Auth
  IF v_viewer IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- 2. Viewer must be fully verified (phone AND email)
  SELECT u.phone_verified, u.email_verified
    INTO v_v_phone, v_v_email
    FROM public.users u
   WHERE u.id = v_viewer;

  IF NOT (COALESCE(v_v_phone, false) AND COALESCE(v_v_email, false)) THEN
    RAISE EXCEPTION 'NOT_FULLY_VERIFIED';
  END IF;

  v_is_admin := public.is_admin();

  -- 3. Resolve target. LEFT JOIN so a missing profile row is handled safely;
  --    a missing profile row / null is_public is treated as NON-public.
  SELECT true, COALESCE(p.is_public, false)
    INTO v_found, v_is_public
    FROM public.users tu
    LEFT JOIN public.profiles p ON p.user_id = tu.id
   WHERE tu.id = p_user_id;

  -- Nonexistent user -> return no row (distinct from private below)
  IF NOT COALESCE(v_found, false) THEN
    RETURN;
  END IF;

  -- 4. Authorized to see full identity: public profile, admin, or self
  IF v_is_public OR v_is_admin OR p_user_id = v_viewer THEN
    RETURN QUERY
      SELECT
        tu.id                        AS user_id,
        tu.full_name::text           AS full_name,
        p.profile_photo_url::text    AS profile_photo_url,
        p.bio::text                  AS bio,
        COALESCE(p.is_public, false) AS is_public,
        tu.created_at                AS created_at,
        tu.phone_verified            AS phone_verified,
        tu.email_verified            AS email_verified
      FROM public.users tu
      LEFT JOIN public.profiles p ON p.user_id = tu.id
      WHERE tu.id = p_user_id;
    RETURN;
  END IF;

  -- 5. Private profile, unauthorized viewer: minimal row so the frontend can
  --    distinguish "private" from "nonexistent". No identity/bio leaked.
  RETURN QUERY
    SELECT
      p_user_id,
      NULL::text,
      NULL::text,
      NULL::text,
      false,
      NULL::timestamptz,
      NULL::boolean,
      NULL::boolean;
END;
$function$;

ALTER FUNCTION public.get_public_profile(uuid) OWNER TO postgres;

REVOKE ALL     ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;

-- Verification:
-- 1. Function exists:
--    SELECT proname FROM pg_proc WHERE proname = 'get_public_profile';
-- 2. Only authenticated can execute:
--    SELECT grantee, privilege_type FROM information_schema.role_routine_grants
--     WHERE routine_name = 'get_public_profile';
-- 3. public_profiles grants unchanged (expect anon + authenticated):
--    SELECT grantee, privilege_type FROM information_schema.role_table_grants
--     WHERE table_name = 'public_profiles';
