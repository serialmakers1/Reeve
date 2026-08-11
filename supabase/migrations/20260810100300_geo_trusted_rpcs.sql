-- Prompt 1 (geographic foundation) — trusted write path + plausibility helper.
--
-- All three functions are SERVICE-ROLE ONLY (EXECUTE revoked from PUBLIC/anon/
-- authenticated). The Prompt-2 Edge Function (server-side Google verification) calls
-- upsert_geo_place to mint verified places, then set_property_geo_associations with a
-- trusted actor context. Browsers never reach these.

-- ── Centralized plausibility helper (single source of thresholds) ────────────
-- Area:  inside bbox            OR earth_distance ≤ 3 km.
-- Road:  inside padded bbox     OR earth_distance ≤ 10 km  (long/linear geometry).
CREATE OR REPLACE FUNCTION public.reeve_geo_is_plausible(
  p_lat double precision, p_lng double precision,
  p_center_lat double precision, p_center_lng double precision,
  p_bbox_ne_lat double precision, p_bbox_ne_lng double precision,
  p_bbox_sw_lat double precision, p_bbox_sw_lng double precision,
  p_kind text
) RETURNS boolean
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO 'public'
AS $$
DECLARE
  v_max_m   double precision;
  v_pad_deg double precision;
  v_dist    double precision;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL OR p_center_lat IS NULL OR p_center_lng IS NULL THEN
    RETURN false;  -- cannot confirm plausibility without both points
  END IF;

  IF p_kind = 'road' THEN v_max_m := 10000; v_pad_deg := 0.02;  -- ~2 km padding for road bbox
  ELSE                    v_max_m := 3000;  v_pad_deg := 0;      -- area (and default)
  END IF;

  -- bbox containment (padded for roads)
  IF p_bbox_ne_lat IS NOT NULL AND p_bbox_sw_lat IS NOT NULL THEN
    IF p_lat >= p_bbox_sw_lat - v_pad_deg AND p_lat <= p_bbox_ne_lat + v_pad_deg
       AND p_lng >= p_bbox_sw_lng - v_pad_deg AND p_lng <= p_bbox_ne_lng + v_pad_deg THEN
      RETURN true;
    END IF;
  END IF;

  -- distance-to-centre fallback (earthdistance, meters)
  v_dist := earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(p_center_lat, p_center_lng));
  RETURN v_dist <= v_max_m;
END;
$$;

-- ── Trusted mint/refresh of a canonical geo_place ────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_geo_place(
  p_place_id text, p_display_name text, p_kind text,
  p_center_lat double precision, p_center_lng double precision,
  p_bbox_ne_lat double precision DEFAULT NULL, p_bbox_ne_lng double precision DEFAULT NULL,
  p_bbox_sw_lat double precision DEFAULT NULL, p_bbox_sw_lng double precision DEFAULT NULL
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_existing_kind text;
BEGIN
  IF p_place_id IS NULL OR btrim(p_place_id) = '' THEN RAISE EXCEPTION 'place_id required'; END IF;
  IF p_kind NOT IN ('city','area','road') THEN RAISE EXCEPTION 'invalid kind %', p_kind; END IF;

  SELECT id, kind INTO v_id, v_existing_kind FROM public.geo_places WHERE place_id = p_place_id;
  IF FOUND THEN
    IF v_existing_kind <> p_kind THEN
      RAISE EXCEPTION 'geo_place % already exists as kind % — refusing silent reclassify to %',
        p_place_id, v_existing_kind, p_kind;
    END IF;
    UPDATE public.geo_places SET
      display_name = p_display_name,
      center_lat = p_center_lat, center_lng = p_center_lng,
      bbox_ne_lat = p_bbox_ne_lat, bbox_ne_lng = p_bbox_ne_lng,
      bbox_sw_lat = p_bbox_sw_lat, bbox_sw_lng = p_bbox_sw_lng
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.geo_places (place_id, display_name, kind, center_lat, center_lng,
                                 bbox_ne_lat, bbox_ne_lng, bbox_sw_lat, bbox_sw_lng)
  VALUES (p_place_id, p_display_name, p_kind, p_center_lat, p_center_lng,
          p_bbox_ne_lat, p_bbox_ne_lng, p_bbox_sw_lat, p_bbox_sw_lng)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── Trusted replacement of a property's geo associations ─────────────────────
-- p_associations: jsonb array of { geo_place_id, relationship, source, confidence? }.
CREATE OR REPLACE FUNCTION public.set_property_geo_associations(
  p_property_id uuid, p_actor_user_id uuid, p_actor_type text, p_associations jsonb
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid; v_status text; v_lat double precision; v_lng double precision;
  v_elem jsonb; v_gp public.geo_places%ROWTYPE;
BEGIN
  IF p_actor_type NOT IN ('owner','admin') THEN RAISE EXCEPTION 'invalid actor_type %', p_actor_type; END IF;

  -- serialize the replace + count-based caps
  SELECT owner_id, status::text, latitude, longitude
    INTO v_owner, v_status, v_lat, v_lng
    FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'property not found'; END IF;

  -- actor authorization (DB validates, never trusts the string alone)
  IF p_actor_type = 'owner' THEN
    IF p_actor_user_id IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'actor does not own property'; END IF;
    IF v_status NOT IN ('draft','changes_requested') THEN
      RAISE EXCEPTION 'owner location edits are not allowed in status %', v_status;
    END IF;
  ELSE -- admin
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id AND role::text IN ('admin','super_admin')) THEN
      RAISE EXCEPTION 'actor is not an admin';
    END IF;
  END IF;

  PERFORM set_config('reeve.system_action', 'geo_assoc', true);

  -- atomic replace
  DELETE FROM public.property_geo_associations WHERE property_id = p_property_id;

  IF p_associations IS NOT NULL AND jsonb_typeof(p_associations) = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_associations) LOOP
      SELECT * INTO v_gp FROM public.geo_places WHERE id = (v_elem->>'geo_place_id')::uuid;
      IF v_gp.id IS NULL THEN
        RAISE EXCEPTION 'geo_place % not found (no minting here)', v_elem->>'geo_place_id';
      END IF;

      -- Plausibility check ONLY for an owner-added extra area/road.
      IF (v_elem->>'source') = 'owner' AND (v_elem->>'relationship') = 'area_road' THEN
        IF NOT public.reeve_geo_is_plausible(
             v_lat, v_lng, v_gp.center_lat, v_gp.center_lng,
             v_gp.bbox_ne_lat, v_gp.bbox_ne_lng, v_gp.bbox_sw_lat, v_gp.bbox_sw_lng, v_gp.kind) THEN
          RAISE EXCEPTION 'owner-added % "%" is not geographically plausible for this property',
            v_gp.kind, v_gp.display_name;
        END IF;
      END IF;

      -- kind derived from the geo_places row (relationship/source/confidence from trusted caller;
      -- the association trigger + CHECKs re-validate kind↔relationship, caps, and source semantics).
      INSERT INTO public.property_geo_associations
        (property_id, geo_place_id, relationship, source, confidence)
      VALUES (
        p_property_id, v_gp.id, v_elem->>'relationship', v_elem->>'source',
        NULLIF(v_elem->>'confidence','')
      );
    END LOOP;
  END IF;
END;
$$;

-- ── EXECUTE lockdown: service-role only ──────────────────────────────────────
REVOKE ALL ON FUNCTION public.reeve_geo_is_plausible(double precision,double precision,double precision,double precision,double precision,double precision,double precision,double precision,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reeve_geo_is_plausible(double precision,double precision,double precision,double precision,double precision,double precision,double precision,double precision,text) TO service_role;

REVOKE ALL ON FUNCTION public.upsert_geo_place(text,text,text,double precision,double precision,double precision,double precision,double precision,double precision) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.upsert_geo_place(text,text,text,double precision,double precision,double precision,double precision,double precision,double precision) TO service_role;

REVOKE ALL ON FUNCTION public.set_property_geo_associations(uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.set_property_geo_associations(uuid,uuid,text,jsonb) TO service_role;
