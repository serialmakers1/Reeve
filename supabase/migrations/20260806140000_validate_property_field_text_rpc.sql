-- Purpose: Thin authenticated wrapper that validates owner-authored public property
--          text via the existing authoritative public.validate_short_text.
-- Used by: ListProperty.tsx (owner form) — blur + final-submit validation.
-- Design:
--   * Client passes only a fixed field identifier + the text. It CANNOT supply or
--     raise the max length — the cap is mapped server-side per allowed field.
--   * Validate only; never writes property data.
--   * All existing validator error codes propagate unchanged
--     (TEXT_TOO_LONG / CONTAINS_URL / CONTAINS_EMAIL / CONTAINS_PHONE /
--      CONTAINS_SOCIAL_HANDLE / BLOCKED_CONTENT / BLOCKED_WORD).
-- Grants: authenticated + service_role (validate_short_text itself stays service_role-only;
--         this SECURITY DEFINER wrapper runs as postgres so it may call it).
-- Applied: 2026-08-06

CREATE OR REPLACE FUNCTION public.validate_property_field_text(p_field text, p_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max integer;
BEGIN
  -- Server-side field → fixed max map. Unknown fields are rejected outright so a
  -- client can never point this at an arbitrary column or supply its own limit.
  v_max := CASE p_field
    WHEN 'parking_notes'  THEN 80
    WHEN 'building_rules' THEN 200
    WHEN 'building_notes' THEN 300
    ELSE NULL
  END;

  IF v_max IS NULL THEN
    RAISE EXCEPTION 'UNKNOWN_FIELD';
  END IF;

  -- Delegate all length + content validation to the shared validator.
  -- Codes bubble up unchanged.
  RETURN public.validate_short_text(p_text, v_max);
END;
$function$;

ALTER FUNCTION public.validate_property_field_text(text, text) OWNER TO postgres;
REVOKE ALL     ON FUNCTION public.validate_property_field_text(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_property_field_text(text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.validate_property_field_text(text, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.validate_property_field_text(text, text) TO service_role;
