-- Prompt 4A — durable secondary-city intent + trusted write.
-- 0 secondary_city association rows cannot distinguish "Google derived none" from
-- "admin deliberately chose none", so intent is stored on the property. System-only
-- (trusted flow); guarded by enforce_canonical_location_lock.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS secondary_city_mode text NOT NULL DEFAULT 'auto'
    CHECK (secondary_city_mode IN ('auto','admin'));

-- apply_property_location: write secondary_city_mode. Absent/invalid key PRESERVES the
-- current value (never NULL); a valid 'auto'|'admin' sets it. Everything else unchanged.
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
    -- Durable secondary-city intent: valid value sets it; absent/invalid PRESERVES current (never NULL).
    secondary_city_mode = COALESCE(
      CASE WHEN p_location->>'secondary_city_mode' IN ('auto','admin') THEN p_location->>'secondary_city_mode' END,
      secondary_city_mode, 'auto'),
    location_verified_by_owner = (p_actor_type = 'owner'),
    location_verified_at       = CASE WHEN p_actor_type = 'owner' THEN now() ELSE NULL END,
    streetview_available    = false,
    streetview_pano_id      = NULL,
    streetview_checked_at   = NULL,
    streetview_show_in_listing = false
  WHERE id = p_property_id;

  PERFORM public.set_property_geo_associations(p_property_id, p_actor_user_id, p_actor_type, p_associations);

  RETURN p_property_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_property_location(uuid,uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_property_location(uuid,uuid,text,jsonb,jsonb) TO service_role;

-- Lock-guard the new column: only the trusted path (reeve.system_action) may change it.
CREATE OR REPLACE FUNCTION public.enforce_canonical_location_lock()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(current_setting('reeve.system_action', true), '') <> '' THEN
    RETURN NEW;  -- trusted path
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.place_id IS NOT NULL OR NEW.formatted_address IS NOT NULL
       OR NEW.latitude IS NOT NULL OR NEW.longitude IS NOT NULL
       OR NEW.address_mode IS NOT NULL OR NEW.city IS NOT NULL OR NEW.locality IS NOT NULL
       OR NEW.street_address IS NOT NULL OR NEW.street_number IS NOT NULL OR NEW.route IS NOT NULL
       OR NEW.sublocality_1 IS NOT NULL OR NEW.sublocality_2 IS NOT NULL OR NEW.neighborhood IS NOT NULL
       OR NEW.district IS NOT NULL OR NEW.state IS NOT NULL OR NEW.pincode IS NOT NULL OR NEW.plus_code IS NOT NULL
       OR NEW.viewport_ne_lat IS NOT NULL OR NEW.viewport_ne_lng IS NOT NULL
       OR NEW.viewport_sw_lat IS NOT NULL OR NEW.viewport_sw_lng IS NOT NULL
       OR NEW.building_name IS NOT NULL OR NEW.building_name_source IS NOT NULL
       OR NEW.location_verified_by_owner IS TRUE OR NEW.location_verified_at IS NOT NULL
       OR NEW.secondary_city_mode IS DISTINCT FROM 'auto' THEN
      RAISE EXCEPTION 'canonical location must be set via the trusted location flow';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.place_id IS DISTINCT FROM OLD.place_id
     OR NEW.formatted_address IS DISTINCT FROM OLD.formatted_address
     OR NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude
     OR NEW.address_mode IS DISTINCT FROM OLD.address_mode
     OR NEW.city IS DISTINCT FROM OLD.city OR NEW.locality IS DISTINCT FROM OLD.locality
     OR NEW.street_address IS DISTINCT FROM OLD.street_address
     OR NEW.street_number IS DISTINCT FROM OLD.street_number OR NEW.route IS DISTINCT FROM OLD.route
     OR NEW.sublocality_1 IS DISTINCT FROM OLD.sublocality_1 OR NEW.sublocality_2 IS DISTINCT FROM OLD.sublocality_2
     OR NEW.neighborhood IS DISTINCT FROM OLD.neighborhood OR NEW.district IS DISTINCT FROM OLD.district
     OR NEW.state IS DISTINCT FROM OLD.state OR NEW.pincode IS DISTINCT FROM OLD.pincode
     OR NEW.plus_code IS DISTINCT FROM OLD.plus_code
     OR NEW.viewport_ne_lat IS DISTINCT FROM OLD.viewport_ne_lat OR NEW.viewport_ne_lng IS DISTINCT FROM OLD.viewport_ne_lng
     OR NEW.viewport_sw_lat IS DISTINCT FROM OLD.viewport_sw_lat OR NEW.viewport_sw_lng IS DISTINCT FROM OLD.viewport_sw_lng
     OR NEW.building_name IS DISTINCT FROM OLD.building_name
     OR NEW.building_name_source IS DISTINCT FROM OLD.building_name_source
     OR NEW.location_verified_by_owner IS DISTINCT FROM OLD.location_verified_by_owner
     OR NEW.location_verified_at IS DISTINCT FROM OLD.location_verified_at
     OR NEW.secondary_city_mode IS DISTINCT FROM OLD.secondary_city_mode THEN
    RAISE EXCEPTION 'canonical location must be changed via the trusted location flow';
  END IF;
  RETURN NEW;
END;
$$;
