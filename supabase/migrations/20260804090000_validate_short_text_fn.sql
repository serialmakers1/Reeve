-- Purpose: Add shared validate_short_text(p_text, p_max_length) function
-- Used by: update_profile_bio (internal SECURITY DEFINER call), submit-contact-request (service_role REST)
-- Grants: service_role only — callers are SECURITY DEFINER functions (run as postgres) or service_role edge functions
-- Applied: 2026-08-04

-- CREATE OR REPLACE preserves any existing grants on the function registration.
-- Do NOT DROP — that would break any currently-executing calls.
CREATE OR REPLACE FUNCTION public.validate_short_text(p_text text, p_max_length integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_text       text;
  v_normalized text;
BEGIN
  -- Guard: sane max_length
  IF p_max_length IS NULL OR p_max_length < 1 THEN
    RAISE EXCEPTION 'INVALID_MAX_LENGTH';
  END IF;

  -- 1. Null/empty is always valid
  v_text := nullif(regexp_replace(p_text, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '');
  IF v_text IS NULL THEN RETURN NULL; END IF;

  -- 2. Length (authoritative; char_length counts Unicode code points)
  IF char_length(v_text) > p_max_length THEN
    RAISE EXCEPTION 'TEXT_TOO_LONG';
  END IF;

  -- 3a. URL: http(s):// or www.
  IF v_text ~* 'https?://' OR v_text ~* 'www\.' THEN
    RAISE EXCEPTION 'CONTAINS_URL';
  END IF;

  -- 3b. Email — MUST run BEFORE bare-domain check so that reach@me.com raises
  --     CONTAINS_EMAIL rather than CONTAINS_URL (me.com matches the TLD list).
  IF v_text ~* '[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}' THEN
    RAISE EXCEPTION 'CONTAINS_EMAIL';
  END IF;

  -- 3c. Domain detection: per-candidate extraction, then check each individually.
  --   Allows one-character labels so x.com and a.co.in are extracted and blocked.
  --   End-char guard accepts any non-domain character ([^a-z0-9\-]) or end-of-string —
  --   covers example.com?ref=1, example.com#contact, example.com:8080, example.com!, etc.
  --   No honorific exemption — Dr.com, Mr.shop, St.live are real domains and must be blocked.
  --   Only exact academic abbreviations are exempted using CASE-SENSITIVE = (not ~*) so
  --   that b.com is never exempted but B.Tech (standard Indian capitalization) is.
  DECLARE
    v_dom_candidate text;
  BEGIN
    FOR v_dom_candidate IN
      SELECT (regexp_matches(
        v_text,
        '(([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,63})([^a-z0-9\-]|$)',
        'gi'
      ))[1]
    LOOP
      IF v_dom_candidate IS NULL THEN CONTINUE; END IF;
      -- Exact safe abbreviations (case-sensitive = avoids exempting b.com, m.sc domain).
      -- Academic credentials use standard Indian capitalization; property measurements use
      -- lower() so sq.ft and Sq.Ft are both allowed.
      IF v_dom_candidate IN (
           'B.Tech', 'M.Tech',
           'B.Sc',   'M.Sc',
           'B.Com',  'M.Com',
           'B.Ed'
         )
         OR lower(v_dom_candidate) IN ('sq.ft', 'sq.yd') THEN
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'CONTAINS_URL';
    END LOOP;

    -- Defence-in-depth: short social domains (most now caught in loop above)
    IF v_text ~* '\m(wa|t|fb|ig|tg|ly|bit|goo)\.(com|me|in|io|gg|ly)([^a-z0-9\-]|$)' THEN
      RAISE EXCEPTION 'CONTAINS_URL';
    END IF;
  END;

  -- 3d. Social handles (@username format, ≥2 chars after @).
  --     Runs after email so foo@bar is already caught above.
  IF v_text ~ '@[a-zA-Z0-9._\-]{2,30}' THEN
    RAISE EXCEPTION 'CONTAINS_SOCIAL_HANDLE';
  END IF;

  -- 3e. Phone — explicit format checks to avoid false positives from
  --     budgets and reference numbers, and to prevent greedy-separator bypasses.
  DECLARE
    v_stripped text;
    v_phone_candidate text;
  BEGIN
    -- Pattern A: Explicit Indian mobile formats (subscriber starts 6-9)
    IF v_text ~ '\m[6-9][0-9]{9}\M'
       OR v_text ~ '\m[6-9][0-9]{4}[[:space:]][0-9]{5}\M'
       OR v_text ~ '\m[6-9][0-9]{4}[-][0-9]{5}\M'
       OR v_text ~ '\m[6-9][0-9]{4}[.][0-9]{5}\M'
       OR v_text ~ '\m[6-9][0-9]{3}[[:space:]][0-9]{6}\M'
       OR v_text ~ '\m[6-9][0-9]{3}[-][0-9]{6}\M'
       OR v_text ~ '\m[6-9][0-9]{2}[-][0-9]{3}[-][0-9]{4}\M'
       OR v_text ~ '\m[6-9][0-9]{2}[.][0-9]{3}[.][0-9]{4}\M'
       OR v_text ~ '\m[6-9][0-9]{2}[[:space:]][0-9]{3}[[:space:]][0-9]{4}\M'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{9}([^0-9]|$)'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{4}[[:space:]][0-9]{5}([^0-9]|$)'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{4}[-][0-9]{5}([^0-9]|$)'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{4}[.][0-9]{5}([^0-9]|$)'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{3}[[:space:]][0-9]{6}([^0-9]|$)'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{3}[-][0-9]{6}([^0-9]|$)'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{2}[-][0-9]{3}[-][0-9]{4}([^0-9]|$)'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{2}[[:space:]][0-9]{3}[[:space:]][0-9]{4}([^0-9]|$)'
       OR v_text ~ '(^|[^0-9])(\+91|91)[[:space:]\-]?[6-9][0-9]{2}[.][0-9]{3}[.][0-9]{4}([^0-9]|$)'
    THEN
      RAISE EXCEPTION 'CONTAINS_PHONE';
    END IF;

    -- Pattern B: any number starting with + (international dialling prefix)
    FOR v_phone_candidate IN
      SELECT (regexp_matches(v_text,
        '(\+[0-9][0-9[:space:]\-(). ]{6,20}[0-9])',
        'g'))[1]
    LOOP
      IF v_phone_candidate IS NULL THEN CONTINUE; END IF;
      v_stripped := regexp_replace(v_phone_candidate, '[^0-9]', '', 'g');
      IF char_length(v_stripped) >= 10 THEN
        RAISE EXCEPTION 'CONTAINS_PHONE';
      END IF;
    END LOOP;

    -- Pattern C: North American formats
    IF v_text ~ '[(][0-9]{3}[)][[:space:]\-]?[0-9]{3}[[:space:]\-][0-9]{4}'
       OR v_text ~ '\m[0-9]{3}[-][0-9]{3}[-][0-9]{4}\M'
       OR v_text ~ '\m[0-9]{3}[[:space:]][0-9]{3}[[:space:]][0-9]{4}\M'
       OR v_text ~ '\m[0-9]{3}[.][0-9]{3}[.][0-9]{4}\M'
       OR v_text ~ '\m[2-9][0-9]{2}[2-9][0-9]{6}\M'
    THEN
      RAISE EXCEPTION 'CONTAINS_PHONE';
    END IF;
  END;

  -- 3f. WhatsApp/Telegram contact solicitation.
  IF v_text ~* '\m(whatsapp|telegram)\M[[:space:]]*(me\M|number\M|no\M|num\M|contact\M|chat\M|call\M|msg\M|message\M|@)'
     OR v_text ~* '\m(contact|reach|call|message|text|msg|ping|find|send)\M[[:space:]]+((me|us)[[:space:]]+)?(on|via|through|at)[[:space:]]+\m(whatsapp|telegram)\M'
     OR v_text ~* '\mmy\M[[:space:]]+\m(whatsapp|telegram)\M[[:space:]]*(is\M|:|=|number\M|id\M|username\M|handle\M)'
     OR v_text ~* '\m(whatsapp|telegram)\M[[:space:]]*(:|=)[[:space:]]*\S'
     OR v_text ~* '\m(whatsapp|telegram)\M[[:space:]]+(username|handle|id|number|no|num)\M' THEN
    RAISE EXCEPTION 'BLOCKED_CONTENT';
  END IF;

  -- 4a. Tier A blocklist (exact word-boundary)
  IF EXISTS (
    SELECT 1 FROM public.comment_blocklist bl
    WHERE bl.tier = 'A' AND lower(v_text) ~ ('\m' || bl.word || '\M')
  ) THEN
    RAISE EXCEPTION 'BLOCKED_WORD';
  END IF;

  -- 4b. Normalization pipeline for Tier B (identical to post_comment / update_profile_bio)
  v_normalized := v_text;
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

  -- 4c. Tier B blocklist
  IF EXISTS (
    SELECT 1 FROM public.comment_blocklist bl
    WHERE bl.tier = 'B'
      AND v_normalized ~ bl.word
      AND NOT EXISTS (
        SELECT 1 FROM public.comment_allowlist al
        WHERE v_normalized ~ al.word AND al.word ~ bl.word
      )
  ) THEN
    RAISE EXCEPTION 'BLOCKED_WORD';
  END IF;

  RETURN v_text;
END;
$function$;

ALTER FUNCTION public.validate_short_text(text, integer) OWNER TO postgres;
REVOKE ALL     ON FUNCTION public.validate_short_text(text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_short_text(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_short_text(text, integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.validate_short_text(text, integer) TO service_role;
