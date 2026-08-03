-- Purpose: Add update_profile_bio RPC
-- Security: SECURITY DEFINER, authenticated only, auth.uid() derived
-- Content policy: URL/email/phone + comment_blocklist (Tier A + B),
--   no English-only gate, no emoji gate, no rate limits, no verification gate
-- Applied: 2026-08-03

DROP FUNCTION IF EXISTS public.update_profile_bio(text);

CREATE FUNCTION public.update_profile_bio(p_bio text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id    uuid := auth.uid();
  v_bio        text;
  v_normalized text;
BEGIN
  -- 1. Auth
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- 2. Normalize: strip leading/trailing whitespace (spaces, tabs, newlines) → NULL if empty
  v_bio := nullif(
    regexp_replace(p_bio, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
    ''
  );

  -- 3. Length (server-authoritative; char_length counts Unicode code points)
  --    Skip when bio is NULL — clearing is always valid
  IF char_length(v_bio) > 200 THEN
    RAISE EXCEPTION 'BIO_TOO_LONG';
  END IF;

  -- 4a. URL detection (identical to post_comment)
  IF v_bio ~* 'https?://' OR v_bio ~* 'www\.'
     OR v_bio ~* '[a-z0-9-]+\.[a-z]{2,4}(\s|$|/)' THEN
    RAISE EXCEPTION 'CONTAINS_URL';
  END IF;

  -- 4b. Email detection (identical to post_comment)
  IF v_bio ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
    RAISE EXCEPTION 'CONTAINS_EMAIL';
  END IF;

  -- 4c. Phone detection (identical to post_comment)
  IF v_bio ~ '(\+91|91)?[6-9][0-9]{9}' THEN
    RAISE EXCEPTION 'CONTAINS_PHONE';
  END IF;

  -- 4d. Tier A blocklist — exact word-boundary match (identical to post_comment)
  IF EXISTS (
    SELECT 1
    FROM public.comment_blocklist bl
    WHERE bl.tier = 'A'
      AND lower(v_bio) ~ ('\m' || bl.word || '\M')
  ) THEN
    RAISE EXCEPTION 'BLOCKED_WORD';
  END IF;

  -- 4e. Normalization pipeline for Tier B (identical to post_comment)
  v_normalized := v_bio;

  -- Strip zero-width / invisible chars (U+200B, U+200C, U+200D, U+FEFF)
  v_normalized := regexp_replace(v_normalized, E'[​‌‍﻿]', '', 'g');

  -- Lowercase
  v_normalized := lower(v_normalized);

  -- Leet speak substitution
  v_normalized := translate(v_normalized, '013457@$+', 'oieats ast');

  -- Unicode homoglyph substitution (Cyrillic/Greek lookalikes → Latin)
  v_normalized := replace(v_normalized, chr(1072), 'a');  -- Cyrillic а
  v_normalized := replace(v_normalized, chr(1077), 'e');  -- Cyrillic е
  v_normalized := replace(v_normalized, chr(1086), 'o');  -- Cyrillic о
  v_normalized := replace(v_normalized, chr(1088), 'r');  -- Cyrillic р
  v_normalized := replace(v_normalized, chr(1089), 'c');  -- Cyrillic с
  v_normalized := replace(v_normalized, chr(1091), 'y');  -- Cyrillic у
  v_normalized := replace(v_normalized, chr(1093), 'x');  -- Cyrillic х
  v_normalized := replace(v_normalized, chr(1110), 'i');  -- Cyrillic і
  v_normalized := replace(v_normalized, chr(1068), 'b');  -- Cyrillic Ь (approx)

  -- Collapse repeated letters (biiitch → biitch for matching)
  v_normalized := regexp_replace(v_normalized, '([a-z])\1{2,}', '\1\1', 'g');

  -- Collapse punctuation/spaces between single letters (b.i.t.c.h → bitch)
  -- Iterative application needed — run twice to handle alternating patterns
  v_normalized := regexp_replace(v_normalized, '(?<=[a-z])[^a-z](?=[a-z])', '', 'g');
  v_normalized := regexp_replace(v_normalized, '(?<=[a-z])[^a-z](?=[a-z])', '', 'g');

  -- 4f. Tier B blocklist — substring on normalized + allowlist check (identical to post_comment)
  IF EXISTS (
    SELECT 1
    FROM public.comment_blocklist bl
    WHERE bl.tier = 'B'
      AND v_normalized ~ bl.word
      AND NOT EXISTS (
        SELECT 1 FROM public.comment_allowlist al
        WHERE v_normalized ~ al.word
          AND al.word ~ bl.word
      )
  ) THEN
    RAISE EXCEPTION 'BLOCKED_WORD';
  END IF;

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
