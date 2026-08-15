-- Phase 5 · Prompt 2 — add owner pin-adjustment provenance writes to apply_final_property_location.
-- Uses per-column CASE with key-presence detection: key present → write (null or value);
-- key absent (admin path, tiny drag noise) → leave DB column unchanged.
-- CREATE OR REPLACE preserves existing grants and security metadata.

CREATE OR REPLACE FUNCTION public.apply_final_property_location(
  p_property_id uuid,
  p_actor_user_id uuid,
  p_actor_type text,
  p_location jsonb,
  p_final_associations jsonb,
  p_streetview jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_owner uuid; v_status text;
  v_lat double precision; v_lng double precision; v_cc text;
  v_ex_src text; v_ex_place text; v_ex_name text;
  v_in_name text; v_in_src text; v_in_place text;
  v_final_name text; v_final_src text; v_final_place text; v_address_mode text;
  v_sv_available boolean; v_sv_pano text;
BEGIN
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

  v_lat := (p_location->>'latitude')::double precision;
  v_lng := (p_location->>'longitude')::double precision;
  v_cc  := p_location->>'country_code';
  IF v_lat IS NULL OR v_lng IS NULL
     OR v_lat <> v_lat OR v_lng <> v_lng
     OR v_lat < -90 OR v_lat > 90 OR v_lng < -180 OR v_lng > 180 THEN
    RAISE EXCEPTION 'invalid final coordinates';
  END IF;
  IF v_cc IS DISTINCT FROM 'IN' THEN RAISE EXCEPTION 'country_code must be IN'; END IF;

  v_in_name  := NULLIF(btrim(COALESCE(p_location->>'building_name','')), '');
  v_in_src   := p_location->>'building_name_source';
  v_in_place := NULLIF(btrim(COALESCE(p_location->>'place_id','')), '');
  IF v_ex_src = 'admin' AND p_actor_type = 'owner' THEN
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
  v_address_mode := CASE WHEN v_final_place IS NOT NULL THEN 'google_place' ELSE 'manual' END;

  v_sv_available := COALESCE((p_streetview->>'available')::boolean, false);
  v_sv_pano := p_streetview->>'pano_id';

  PERFORM set_config('reeve.system_action', 'geo_apply_v2', true);

  UPDATE public.properties SET
    latitude = v_lat, longitude = v_lng,
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
    location_confirmed_at = now(),
    streetview_available = v_sv_available,
    streetview_pano_id = CASE WHEN v_sv_available THEN v_sv_pano ELSE NULL END,
    streetview_checked_at = now(),
    streetview_show_in_listing = CASE WHEN p_streetview ? 'show_in_listing'
                                      THEN (p_streetview->>'show_in_listing')::boolean
                                      ELSE streetview_show_in_listing END,
    owner_pin_adjusted_at =
      CASE
        WHEN p_location ? 'owner_pin_adjusted_at'
        THEN (p_location->>'owner_pin_adjusted_at')::timestamptz
        ELSE owner_pin_adjusted_at
      END,
    owner_pin_adjustment_distance_m =
      CASE
        WHEN p_location ? 'owner_pin_adjustment_distance_m'
        THEN (p_location->>'owner_pin_adjustment_distance_m')::numeric
        ELSE owner_pin_adjustment_distance_m
      END
  WHERE id = p_property_id;

  PERFORM public.replace_property_discovery_geography(p_property_id, COALESCE(p_final_associations, '[]'::jsonb));
END;
$function$;
