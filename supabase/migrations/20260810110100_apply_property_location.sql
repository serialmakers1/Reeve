-- Prompt 2 (Phase A) — atomic trusted location persistence.
-- Service-role only. Writes canonical location + building + actor-aware owner verification
-- + Street View reset, then replaces geo associations via set_property_geo_associations
-- (which re-runs owner-extra plausibility against the just-written pin). Any failure rolls
-- back the whole transaction. Called only by the confirm-property-location Edge Function.

CREATE OR REPLACE FUNCTION public.apply_property_location(
  p_property_id uuid, p_actor_user_id uuid, p_actor_type text, p_location jsonb, p_associations jsonb
) RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_owner uuid; v_status text;
BEGIN
  IF p_actor_type NOT IN ('owner','admin') THEN RAISE EXCEPTION 'invalid actor_type %', p_actor_type; END IF;
  SELECT owner_id, status::text INTO v_owner, v_status FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'property not found'; END IF;
  IF p_actor_type = 'owner' THEN
    IF p_actor_user_id IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'actor does not own property'; END IF;
    IF v_status NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION 'owner location edits not allowed in %', v_status; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id AND role::text IN ('admin','super_admin')) THEN
      RAISE EXCEPTION 'actor is not an admin';
    END IF;
  END IF;

  PERFORM set_config('reeve.system_action', 'geo_apply', true);

  UPDATE public.properties SET
    place_id            = p_location->>'place_id',
    formatted_address   = p_location->>'formatted_address',
    latitude            = (p_location->>'latitude')::double precision,
    longitude           = (p_location->>'longitude')::double precision,
    viewport_ne_lat     = (p_location->>'viewport_ne_lat')::double precision,
    viewport_ne_lng     = (p_location->>'viewport_ne_lng')::double precision,
    viewport_sw_lat     = (p_location->>'viewport_sw_lat')::double precision,
    viewport_sw_lng     = (p_location->>'viewport_sw_lng')::double precision,
    address_mode        = 'google_place',
    city                = p_location->>'city',
    locality            = p_location->>'locality',
    street_address      = p_location->>'street_address',
    street_number       = p_location->>'street_number',
    route               = p_location->>'route',
    sublocality_1       = p_location->>'sublocality_1',
    sublocality_2       = p_location->>'sublocality_2',
    neighborhood        = p_location->>'neighborhood',
    district            = p_location->>'district',
    state               = p_location->>'state',
    pincode             = p_location->>'pincode',
    building_name       = NULLIF(btrim(COALESCE(p_location->>'building_name','')), ''),
    building_name_source= p_location->>'building_name_source',
    location_verified_by_owner = (p_actor_type = 'owner'),
    location_verified_at       = CASE WHEN p_actor_type = 'owner' THEN now() ELSE NULL END,
    -- Street View is location-derived: reset so Location-A metadata never survives onto Location B.
    streetview_available    = false,
    streetview_pano_id      = NULL,
    streetview_checked_at   = NULL,
    streetview_show_in_listing = false
  WHERE id = p_property_id;

  -- Replace associations (kind derived from geo_places; owner-extra plausibility vs the new pin).
  PERFORM public.set_property_geo_associations(p_property_id, p_actor_user_id, p_actor_type, p_associations);

  RETURN p_property_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_property_location(uuid,uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_property_location(uuid,uuid,text,jsonb,jsonb) TO service_role;
