-- Purpose: Exempt property owner from per-hour and per-day comment quotas on their own properties
-- Security: ownership derived from auth.uid() via is_property_owner(uuid) — never from client param
-- Content moderation still applies to owner (same checks, no bypass)
-- Applied: 2026-08-04

CREATE OR REPLACE FUNCTION public.post_comment(p_property_id uuid, p_text text, p_parent_comment_id uuid DEFAULT NULL::uuid)
RETURNS property_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id      uuid := auth.uid();
  v_phone_ver    boolean;
  v_email_ver    boolean;
  v_prop_status  text;
  v_prop_active  boolean;
  v_prop_owner   uuid;
  v_is_owner     boolean := false;
  v_parent_depth integer;
  v_depth        integer := 0;
  v_result       public.property_comments;
  v_count        integer;
  v_normalized   text;
  v_tier_b_regex text;
BEGIN
  -- 1. Auth
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- 2. Verification
  SELECT phone_verified, email_verified
  INTO v_phone_ver, v_email_ver
  FROM public.users WHERE id = v_user_id;

  IF NOT v_phone_ver THEN
    RAISE EXCEPTION 'VERIFICATION_INCOMPLETE:phone';
  END IF;
  IF NOT v_email_ver THEN
    RAISE EXCEPTION 'VERIFICATION_INCOMPLETE:email';
  END IF;

  -- 3. Property status gate
  SELECT status, is_active, owner_id
  INTO v_prop_status, v_prop_active, v_prop_owner
  FROM public.properties WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPERTY_NOT_FOUND';
  END IF;

  IF v_prop_status NOT IN ('listed', 'edit_pending_review') OR NOT v_prop_active THEN
    RAISE EXCEPTION 'PROPERTY_NOT_AVAILABLE';
  END IF;

  -- 3b. Ownership check — derives from auth.uid(), not from any client parameter.
  --     EXISTS always returns true or false, never null.
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND owner_id = v_user_id
  ) INTO v_is_owner;

  -- 4. Content filters

  -- English only
  IF p_text ~ '[^\x00-\x7F]' THEN
    IF EXISTS (
      SELECT 1 FROM regexp_split_to_table(p_text, '') AS ch
      WHERE ascii(ch) > 591
        AND ascii(ch) != 8377
        AND ascii(ch) NOT BETWEEN 8208 AND 8213
        AND ascii(ch) NOT BETWEEN 8216 AND 8223
    ) THEN
      RAISE EXCEPTION 'NON_ENGLISH';
    END IF;
  END IF;

  -- No emojis
  IF EXISTS (
    SELECT 1 FROM regexp_split_to_table(p_text, '') AS ch
    WHERE ascii(ch) BETWEEN 9728 AND 10175
      OR ascii(ch) BETWEEN 127744 AND 131071
      OR ascii(ch) BETWEEN 126976 AND 127743
      OR ascii(ch) BETWEEN 9000 AND 9999
  ) THEN
    RAISE EXCEPTION 'CONTAINS_EMOJI';
  END IF;

  -- No URLs
  IF p_text ~* 'https?://' OR p_text ~* 'www\.'
     OR p_text ~* '[a-z0-9-]+\.[a-z]{2,4}(\s|$|/)' THEN
    RAISE EXCEPTION 'CONTAINS_URL';
  END IF;

  -- No emails
  IF p_text ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
    RAISE EXCEPTION 'CONTAINS_EMAIL';
  END IF;

  -- No phone numbers
  IF p_text ~ '(\+91|91)?[6-9][0-9]{9}' THEN
    RAISE EXCEPTION 'CONTAINS_PHONE';
  END IF;

  -- PASS 1: Tier A
  IF EXISTS (
    SELECT 1
    FROM public.comment_blocklist bl
    WHERE bl.tier = 'A'
      AND lower(p_text) ~ ('\m' || bl.word || '\M')
  ) THEN
    RAISE EXCEPTION 'BLOCKED_WORD';
  END IF;

  -- PASS 2: Normalize
  v_normalized := p_text;
  v_normalized := regexp_replace(v_normalized, E'[​‌‍﻿]', '', 'g');
  v_normalized := lower(v_normalized);
  v_normalized := translate(v_normalized, '013457@$+', 'oieats ast');
  v_normalized := replace(v_normalized, chr(1072), 'a');
  v_normalized := replace(v_normalized, chr(1077), 'e');
  v_normalized := replace(v_normalized, chr(1086), 'o');
  v_normalized := replace(v_normalized, chr(1088), 'r');
  v_normalized := replace(v_normalized, chr(1089), 'c');
  v_normalized := replace(v_normalized, chr(1091), 'y');
  v_normalized := replace(v_normalized, chr(1093), 'x');
  v_normalized := replace(v_normalized, chr(1110), 'i');
  v_normalized := replace(v_normalized, chr(1068), 'b');
  v_normalized := regexp_replace(v_normalized, '([a-z])\1{2,}', '\1\1', 'g');
  v_normalized := regexp_replace(v_normalized, '(?<=[a-z])[^a-z](?=[a-z])', '', 'g');
  v_normalized := regexp_replace(v_normalized, '(?<=[a-z])[^a-z](?=[a-z])', '', 'g');

  -- PASS 3: Tier B
  IF EXISTS (
    SELECT 1
    FROM public.comment_blocklist bl
    WHERE bl.tier = 'B'
      AND v_normalized ~ bl.word
      AND NOT EXISTS (
        SELECT 1
        FROM public.comment_allowlist al
        WHERE v_normalized ~ al.word
          AND al.word ~ bl.word
      )
  ) THEN
    RAISE EXCEPTION 'BLOCKED_WORD';
  END IF;

  -- Pattern spam
  IF p_text ~ '[A-Z]{21,}' THEN
    RAISE EXCEPTION 'PATTERN_SPAM';
  END IF;
  IF p_text ~ '(.)\1{3,}' THEN
    RAISE EXCEPTION 'PATTERN_SPAM';
  END IF;
  IF trim(p_text) = '' THEN
    RAISE EXCEPTION 'PATTERN_SPAM';
  END IF;

  -- 5. Rate limiting — waived for property owner on their own property only.
  --    Content moderation above applies to everyone including the owner.
  IF NOT v_is_owner THEN
    SELECT COUNT(*) INTO v_count
    FROM public.property_comments
    WHERE user_id = v_user_id
      AND created_at > now() - interval '1 hour'
      AND is_deleted = false;

    IF v_count >= 3 THEN
      RAISE EXCEPTION 'RATE_LIMIT_HOUR';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.property_comments
    WHERE user_id = v_user_id
      AND created_at > now() - interval '24 hours'
      AND is_deleted = false;

    IF v_count >= 10 THEN
      RAISE EXCEPTION 'RATE_LIMIT_DAY';
    END IF;
  END IF;

  -- 6. Depth
  IF p_parent_comment_id IS NOT NULL THEN
    SELECT depth INTO v_parent_depth
    FROM public.property_comments
    WHERE id = p_parent_comment_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PARENT_NOT_FOUND';
    END IF;

    v_depth := v_parent_depth + 1;
  END IF;

  -- 7. Insert
  INSERT INTO public.property_comments
    (property_id, user_id, parent_comment_id, depth, text)
  VALUES
    (p_property_id, v_user_id, p_parent_comment_id, v_depth, p_text)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

ALTER FUNCTION public.post_comment(uuid, text, uuid) OWNER TO postgres;
REVOKE ALL     ON FUNCTION public.post_comment(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_comment(uuid, text, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.post_comment(uuid, text, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.post_comment(uuid, text, uuid) TO service_role;
