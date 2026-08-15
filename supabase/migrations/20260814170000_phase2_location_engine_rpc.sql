-- =====================================================================================
-- Phase 2 · Prompt 2 — Trusted Location Engine DB foundation
-- Project: tfutuqqcxqqbirnsdpvz
--
-- (A1) apply_final_property_location — ONE atomic service-role RPC that commits the final
--      pin + factual/admin fields + building identity + Street View + FINAL Discovery
--      associations (composing replace_property_discovery_geography) + lifecycle reset.
-- (A2) update_property_building_name — relax the location precondition to also accept a
--      confirmed MANUAL pin (address_mode='manual' + geom_exact + location_confirmed_at),
--      preserving every existing owner/provenance/status rule.
--
-- Additive + replace-in-place. No Phase-1 object rewritten beyond A2's controlled relax.
-- Geometry-touching → search_path 'public','extensions'. No data mutated by this migration.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- A1. apply_final_property_location
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_final_property_location(
  p_property_id uuid,
  p_actor_user_id uuid,
  p_actor_type text,
  p_location jsonb,
  p_final_associations jsonb,
  p_streetview jsonb
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_owner uuid; v_status text;
  v_lat double precision; v_lng double precision; v_cc text;
  v_ex_src text; v_ex_place text; v_ex_name text;
  v_in_name text; v_in_src text; v_in_place text;
  v_final_name text; v_final_src text; v_final_place text; v_address_mode text;
  v_sv_available boolean; v_sv_pano text;
BEGIN
  -- ── actor validation (mirrors apply_property_location; never trusts p_actor_type alone) ──
  IF p_actor_type NOT IN ('owner','admin') THEN RAISE EXCEPTION 'invalid actor_type %', p_actor_type; END IF;
  SELECT owner_id, status::text, building_name_source, place_id, building_name
    INTO v_owner, v_status, v_ex_src, v_ex_place, v_ex_name
    FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'property not found'; END IF;
  IF p_actor_type = 'owner' THEN
    IF p_actor_user_id IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'actor does not own property'; END IF;
    IF v_status NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION 'owner location edits not allowed in %', v_status; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id AND role::text IN ('admin','super_admin')) THEN
      RAISE EXCEPTION 'actor is not an admin';
    END IF;
  END IF;

  -- ── confirmed-location invariant (defense-in-depth, not a new India system) ──
  v_lat := (p_location->>'latitude')::double precision;
  v_lng := (p_location->>'longitude')::double precision;
  v_cc  := p_location->>'country_code';
  IF v_lat IS NULL OR v_lng IS NULL
     OR v_lat <> v_lat OR v_lng <> v_lng                       -- NaN
     OR v_lat < -90 OR v_lat > 90 OR v_lng < -180 OR v_lng > 180 THEN  -- range / Infinity
    RAISE EXCEPTION 'invalid final coordinates';
  END IF;
  IF v_cc IS DISTINCT FROM 'IN' THEN RAISE EXCEPTION 'country_code must be IN'; END IF;

  -- ── building identity transition (admin-protection enforced at this privileged boundary) ──
  v_in_name  := NULLIF(btrim(COALESCE(p_location->>'building_name','')), '');
  v_in_src   := p_location->>'building_name_source';
  v_in_place := NULLIF(btrim(COALESCE(p_location->>'place_id','')), '');
  IF v_ex_src = 'admin' AND p_actor_type = 'owner' THEN
    -- preserve an admin-corrected building entirely; owner cannot overwrite/clear/replace place_id
    v_final_name := v_ex_name; v_final_src := v_ex_src; v_final_place := v_ex_place;
  ELSE
    IF v_in_src = 'admin' AND p_actor_type <> 'admin' THEN
      RAISE EXCEPTION 'owner cannot set admin building source';
    END IF;
    IF v_in_src = 'google' AND v_in_place IS NULL THEN
      RAISE EXCEPTION 'google building source requires provider place_id evidence';
    END IF;
    IF v_in_src IS NOT NULL AND v_in_src NOT IN ('google','owner','admin') THEN
      RAISE EXCEPTION 'invalid building_name_source %', v_in_src;
    END IF;
    v_final_name  := v_in_name;
    v_final_src   := CASE WHEN v_in_name IS NULL THEN NULL ELSE v_in_src END;
    v_final_place := v_in_place;
  END IF;
  -- google_place only when a legitimate verified building place_id is retained
  v_address_mode := CASE WHEN v_final_place IS NOT NULL THEN 'google_place' ELSE 'manual' END;

  -- ── street view (metadata/cache only; pano is non-authoritative) ──
  v_sv_available := COALESCE((p_streetview->>'available')::boolean, false);
  v_sv_pano := p_streetview->>'pano_id';

  PERFORM set_config('reeve.system_action', 'geo_apply_v2', true);

  UPDATE public.properties SET
    latitude = v_lat, longitude = v_lng,           -- authoritative pin → geom_exact via trg_geom_sync
    formatted_address = p_location->>'formatted_address',
    city = p_location->>'city', locality = p_location->>'locality',
    street_address = p_location->>'street_address', street_number = p_location->>'street_number',
    route = p_location->>'route',
    sublocality_1 = p_location->>'sublocality_1', sublocality_2 = p_location->>'sublocality_2',
    neighborhood = p_location->>'neighborhood',
    district = p_location->>'district', state = p_location->>'state', pincode = p_location->>'pincode',
    plus_code = p_location->>'plus_code',
    country = p_location->>'country', country_code = 'IN',
    viewport_ne_lat = (p_location->>'viewport_ne_lat')::double precision,
    viewport_ne_lng = (p_location->>'viewport_ne_lng')::double precision,
    viewport_sw_lat = (p_location->>'viewport_sw_lat')::double precision,
    viewport_sw_lng = (p_location->>'viewport_sw_lng')::double precision,
    place_id = v_final_place,
    building_name = v_final_name,
    building_name_source = v_final_src,
    address_mode = v_address_mode,
    location_verified_by_owner = (p_actor_type = 'owner'),
    location_verified_at = CASE WHEN p_actor_type = 'owner' THEN now() ELSE NULL END,
    location_confirmed_at = now(),                 -- derived here, never from JSON
    streetview_available = v_sv_available,
    streetview_pano_id = CASE WHEN v_sv_available THEN v_sv_pano ELSE NULL END,
    streetview_checked_at = now(),
    streetview_show_in_listing = CASE WHEN p_streetview ? 'show_in_listing'
                                      THEN (p_streetview->>'show_in_listing')::boolean
                                      ELSE streetview_show_in_listing END
  WHERE id = p_property_id;

  -- ── final Discovery associations + lifecycle reset (reuse Phase-1 writer in same tx) ──
  -- replace_property_discovery_geography validates (dup/final-kind/source/evidence_type/≤1 root),
  -- server-computes distance_m, DELETE+INSERT final rows (relationship/confidence NULL), and
  -- resets discovery_confirmed_at/finalized_at. Empty/locality-only sets are accepted (missing_root).
  PERFORM public.replace_property_discovery_geography(p_property_id, COALESCE(p_final_associations, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.apply_final_property_location(uuid, uuid, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_final_property_location(uuid, uuid, text, jsonb, jsonb, jsonb) TO service_role;

COMMENT ON FUNCTION public.apply_final_property_location(uuid, uuid, text, jsonb, jsonb, jsonb) IS
  'Phase-2 atomic trusted commit: final pin + factual/admin + building identity + Street View + FINAL Discovery associations (composes replace_property_discovery_geography) + lifecycle reset. Service-role only. Actor-validated; enforces IN + coord + building-provenance invariants; location_confirmed_at derived server-side.';

-- -------------------------------------------------------------------------------------
-- A2. update_property_building_name — relax location precondition for a confirmed MANUAL pin
--     (all other owner/provenance/status rules preserved verbatim)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_property_building_name(
  p_property_id uuid, p_actor_user_id uuid, p_actor_type text, p_building_name text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_owner uuid; v_status text; v_ptype text; v_mode text; v_place text; v_src text;
  v_trimmed text; v_optional boolean; v_geom_present boolean; v_confirmed timestamptz;
BEGIN
  IF p_actor_type NOT IN ('owner','admin') THEN RAISE EXCEPTION 'invalid actor_type %', p_actor_type; END IF;
  SELECT owner_id, status::text, property_type, address_mode, place_id, building_name_source,
         (geom_exact IS NOT NULL), location_confirmed_at
    INTO v_owner, v_status, v_ptype, v_mode, v_place, v_src, v_geom_present, v_confirmed
    FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'property not found'; END IF;

  IF p_actor_type = 'owner' THEN
    IF p_actor_user_id IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'actor does not own property'; END IF;
    IF v_status NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION 'owner edits not allowed in %', v_status; END IF;
    IF NOT (v_src IS NULL OR v_src = 'owner') THEN
      RAISE EXCEPTION 'building identity is % — use Search again', v_src;
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id AND role::text IN ('admin','super_admin')) THEN
      RAISE EXCEPTION 'actor is not an admin';
    END IF;
  END IF;

  -- location confirmed: original google_place path OR a confirmed manual pin (Phase-2 relax)
  IF NOT (
    (v_mode = 'google_place' AND NULLIF(btrim(COALESCE(v_place,'')), '') IS NOT NULL)
    OR (v_mode = 'manual' AND v_geom_present AND v_confirmed IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'location not confirmed';
  END IF;

  v_optional := v_ptype IN ('independent_house','villa','plot');
  v_trimmed := NULLIF(btrim(COALESCE(p_building_name,'')), '');
  IF v_trimmed IS NULL AND NOT v_optional THEN
    RAISE EXCEPTION 'building_name_required';
  END IF;

  PERFORM set_config('reeve.system_action', 'building_name', true);
  UPDATE public.properties SET
    building_name = v_trimmed,
    building_name_source = CASE WHEN v_trimmed IS NULL THEN NULL
                                WHEN p_actor_type = 'admin' THEN 'admin' ELSE 'owner' END
  WHERE id = p_property_id;
END;
$$;
