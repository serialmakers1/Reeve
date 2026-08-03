-- Migration: sync_verified_phone_from_auth
-- Purpose: Atomic post-Auth synchronization of a confirmed phone from auth.users
--          into public.users, fixing the Google-first -> connect-phone defect where
--          public.users.phone_verified=true but public.users.phone=NULL.
-- Applied: 2026-08-03 | Version: 20260803154209
--
-- Root cause: GoTrue's Admin phone update (phone_change flow) fires
-- handle_user_updated Block 1 while auth.users.phone is still NULL, so the trigger
-- writes phone_verified=true / phone=NULL and never re-syncs. The Edge Function
-- verify-phone-otp calls this RPC after the Admin PUT succeeds to converge the
-- public row to the authoritative, currently-confirmed auth phone under a row lock.
--
-- Security: SECURITY DEFINER, owner postgres (required to FOR UPDATE auth.users and
-- to bypass prevent_user_privilege_escalation so phone_verified may be set). Empty
-- search_path; every reference schema-qualified. Callable by service_role only.
--
-- The written value is ALWAYS auth.users.phone (already canonical 91XXXXXXXXXX).
-- p_expected_phone is used ONLY to report whether this request won or lost a
-- concurrent different-phone race; it is never the value written.

DROP FUNCTION IF EXISTS public.sync_verified_phone_from_auth(uuid, text);

CREATE FUNCTION public.sync_verified_phone_from_auth(
  p_user_id        uuid,
  p_expected_phone text
)
RETURNS TABLE (
  synced                 boolean,
  expected_phone_matches boolean,
  status                 text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth           record;
  v_auth_norm      text;
  v_expected_norm  text;
  v_matches        boolean;
  v_rows           integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  -- Lock the target auth row and read the authoritative confirmed phone.
  -- FOR UPDATE serializes concurrent syncs for this user and prevents a
  -- concurrent Admin phone update from interleaving between read and write.
  SELECT u.id, u.phone, u.phone_confirmed_at
  INTO   v_auth
  FROM   auth.users u
  WHERE  u.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'auth_user_not_found';
  END IF;

  IF v_auth.phone IS NULL OR pg_catalog.btrim(v_auth.phone) = '' THEN
    RAISE EXCEPTION 'auth_phone_missing';
  END IF;

  IF v_auth.phone_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'auth_phone_unconfirmed';
  END IF;

  -- Normalize for comparison only (strip non-digits). The value written is
  -- always v_auth.phone verbatim (already canonical 91XXXXXXXXXX).
  v_auth_norm     := pg_catalog.regexp_replace(v_auth.phone, '\D', '', 'g');
  v_expected_norm := pg_catalog.regexp_replace(COALESCE(p_expected_phone, ''), '\D', '', 'g');
  v_matches       := (v_auth_norm = v_expected_norm);

  -- Update exactly one existing row. Never insert/upsert.
  UPDATE public.users
  SET    phone          = v_auth.phone,
         phone_verified = true,
         updated_at     = pg_catalog.now()
  WHERE  id = p_user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'public_user_row_missing';
  END IF;

  RETURN QUERY SELECT
    true,
    v_matches,
    CASE WHEN v_matches THEN 'synced' ELSE 'concurrent_phone_change' END;
END;
$$;

ALTER FUNCTION public.sync_verified_phone_from_auth(uuid, text) OWNER TO postgres;

-- Note: REVOKE ALL FROM PUBLIC is insufficient in Supabase — anon is auto-granted.
-- Explicit REVOKE from anon (and authenticated) is required. Server-only RPC.
REVOKE ALL     ON FUNCTION public.sync_verified_phone_from_auth(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_verified_phone_from_auth(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_verified_phone_from_auth(uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.sync_verified_phone_from_auth(uuid, text) TO service_role;
