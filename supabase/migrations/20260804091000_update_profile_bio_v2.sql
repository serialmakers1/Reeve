-- Purpose: Refactor update_profile_bio to delegate validation to validate_short_text
-- Preserves BIO_TOO_LONG error code for existing callers (mapBioError in bioValidation.ts)
-- All other validation codes (CONTAINS_URL, CONTAINS_EMAIL, CONTAINS_PHONE,
--   CONTAINS_SOCIAL_HANDLE, BLOCKED_CONTENT, BLOCKED_WORD) propagate unchanged
-- Applied: 2026-08-04

CREATE OR REPLACE FUNCTION public.update_profile_bio(p_bio text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_bio     text;
BEGIN
  -- 1. Auth
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- 2. Normalize: strip leading/trailing whitespace → NULL if empty
  v_bio := nullif(
    regexp_replace(p_bio, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    ''
  );

  -- 3-4. Delegate all validation to validate_short_text (length + content checks).
  --      Re-raise TEXT_TOO_LONG as BIO_TOO_LONG to preserve the existing RPC contract.
  BEGIN
    PERFORM public.validate_short_text(v_bio, 200);
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'TEXT_TOO_LONG' THEN
        RAISE EXCEPTION 'BIO_TOO_LONG';
      END IF;
      RAISE; -- re-raise all other codes unchanged
  END;

  -- 5. Upsert — only bio column, all others preserved
  INSERT INTO public.profiles (user_id, bio)
  VALUES (v_user_id, v_bio)
  ON CONFLICT ON CONSTRAINT uq_profiles_user
  DO UPDATE SET bio = EXCLUDED.bio;

  RETURN v_bio;
END;
$function$;

ALTER FUNCTION public.update_profile_bio(text) OWNER TO postgres;
REVOKE ALL     ON FUNCTION public.update_profile_bio(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_profile_bio(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.update_profile_bio(text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.update_profile_bio(text) TO service_role;
