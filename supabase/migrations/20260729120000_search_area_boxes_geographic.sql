-- Geographic Area filtering for Search (B2).
-- Adds `p_area_boxes jsonb DEFAULT '[]'` to search_compact_properties + get_map_markers and
-- replaces the broken placeId area clause with a rollout-safe CASE:
--   area boxes present -> property lat/lng inside ANY box (OR);
--   else legacy p_location_ids present -> legacy placeId match (guards stale clients);
--   else -> no area filter.
-- Built in-DB from the live pg_get_functiondef via exact-string replace() so the bodies stay
-- byte-identical except the two targeted edits. DROP+CREATE (new signature = new overload), then
-- restore owner + the captured per-function grants (search had PUBLIC EXECUTE; markers did NOT).

DO $mig$
DECLARE
  v_def   text;
  v_old   constant text := '(array_length(p_location_ids,1) IS NULL OR p.place_id=ANY(p_location_ids))';
  v_new   constant text :=
    '(CASE WHEN jsonb_array_length(coalesce(p_area_boxes,''[]''::jsonb))>0 THEN EXISTS ('
    || 'SELECT 1 FROM jsonb_array_elements(p_area_boxes) AS b WHERE p.latitude IS NOT NULL '
    || 'AND p.longitude IS NOT NULL AND p.latitude BETWEEN (b->>''sw_lat'')::numeric AND '
    || '(b->>''ne_lat'')::numeric AND p.longitude BETWEEN (b->>''sw_lng'')::numeric AND '
    || '(b->>''ne_lng'')::numeric) WHEN array_length(p_location_ids,1) IS NOT NULL THEN '
    || 'p.place_id=ANY(p_location_ids) ELSE TRUE END)';
  v_param constant text := 'p_property_tax_paid boolean DEFAULT NULL::boolean)';
  v_param_new constant text := 'p_property_tax_paid boolean DEFAULT NULL::boolean, p_area_boxes jsonb DEFAULT ''[]''::jsonb)';
BEGIN
  -- ── search_compact_properties ──
  SELECT pg_get_functiondef('public.search_compact_properties'::regproc) INTO v_def;
  IF position(v_old in v_def) = 0 THEN
    RAISE EXCEPTION 'search_compact_properties: expected area clause not found — aborting';
  END IF;
  v_def := replace(v_def, v_old, v_new);      -- all 4 sort branches
  v_def := replace(v_def, v_param, v_param_new); -- append param (signature only)
  DROP FUNCTION public.search_compact_properties(
    property_listing_type, text, text[], text, text[], text[], numeric, numeric, date, integer,
    integer, numeric, integer, integer, numeric, numeric, text[], text[], date, boolean, numeric,
    numeric, numeric, numeric, text[], text[], text[], boolean, numeric, boolean, text, timestamptz,
    uuid, timestamptz, numeric, integer, boolean, numeric, numeric, boolean, text[], boolean);
  EXECUTE v_def;

  -- ── get_map_markers ──
  SELECT pg_get_functiondef('public.get_map_markers'::regproc) INTO v_def;
  IF position(v_old in v_def) = 0 THEN
    RAISE EXCEPTION 'get_map_markers: expected area clause not found — aborting';
  END IF;
  v_def := replace(v_def, v_old, v_new);
  v_def := replace(v_def, v_param, v_param_new);
  DROP FUNCTION public.get_map_markers(
    property_listing_type, text, numeric, numeric, numeric, numeric, text[], numeric, numeric,
    integer, text[], text, text[], date, integer, integer, numeric, integer, integer, numeric,
    numeric, text[], text[], date, boolean, numeric, numeric, numeric, numeric, text[], text[],
    text[], boolean, numeric, boolean, boolean, numeric, numeric, boolean, text[], boolean);
  EXECUTE v_def;
END
$mig$;

-- ── Restore owner + captured grants (new objects have no inherited ACL) ──
-- search_compact_properties: owner postgres; PUBLIC HAD execute (default create grants it → keep).
ALTER FUNCTION public.search_compact_properties(
  property_listing_type, text, text[], text, text[], text[], numeric, numeric, date, integer,
  integer, numeric, integer, integer, numeric, numeric, text[], text[], date, boolean, numeric,
  numeric, numeric, numeric, text[], text[], text[], boolean, numeric, boolean, text, timestamptz,
  uuid, timestamptz, numeric, integer, boolean, numeric, numeric, boolean, text[], boolean, jsonb
) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.search_compact_properties(
  property_listing_type, text, text[], text, text[], text[], numeric, numeric, date, integer,
  integer, numeric, integer, integer, numeric, numeric, text[], text[], date, boolean, numeric,
  numeric, numeric, numeric, text[], text[], text[], boolean, numeric, boolean, text, timestamptz,
  uuid, timestamptz, numeric, integer, boolean, numeric, numeric, boolean, text[], boolean, jsonb
) TO anon, authenticated, service_role;

-- get_map_markers: owner postgres; PUBLIC had NO execute → REVOKE from PUBLIC to match capture.
ALTER FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric, text[], numeric, numeric,
  integer, text[], text, text[], date, integer, integer, numeric, integer, integer, numeric,
  numeric, text[], text[], date, boolean, numeric, numeric, numeric, numeric, text[], text[],
  text[], boolean, numeric, boolean, boolean, numeric, numeric, boolean, text[], boolean, jsonb
) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric, text[], numeric, numeric,
  integer, text[], text, text[], date, integer, integer, numeric, integer, integer, numeric,
  numeric, text[], text[], date, boolean, numeric, numeric, numeric, numeric, text[], text[],
  text[], boolean, numeric, boolean, boolean, numeric, numeric, boolean, text[], boolean, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric, text[], numeric, numeric,
  integer, text[], text, text[], date, integer, integer, numeric, integer, integer, numeric,
  numeric, text[], text[], date, boolean, numeric, numeric, numeric, numeric, text[], text[],
  text[], boolean, numeric, boolean, boolean, numeric, numeric, boolean, text[], boolean, jsonb
) TO anon, authenticated, service_role;
