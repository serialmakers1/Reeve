-- =====================================================================================
-- Phase 1 · Prompt 1 (fix) — geometry operator resolution in location trigger functions
--
-- enforce_canonical_location_lock and enforce_property_geom_sync compare geom_exact with
-- `IS DISTINCT FROM`, which needs the `geometry = geometry` operator. That operator lives
-- in the `extensions` schema, so with `search_path TO 'public'` the comparison fails with
-- "operator is not unique: extensions.geometry = extensions.geometry" on every non-trusted
-- properties UPDATE. Fix: add `extensions` to both functions' search_path. Bodies are
-- otherwise unchanged from 20260814093000_phase1_canonical_geo_foundation.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.enforce_property_geom_sync()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_trusted boolean := COALESCE(current_setting('reeve.system_action', true), '') <> '';
  v_geom_from_latlng extensions.geometry(Point,4326);
  v_tol double precision := 0.000001;
BEGIN
  IF NEW.latitude IS NOT NULL AND (NEW.latitude < -90 OR NEW.latitude > 90) THEN
    RAISE EXCEPTION 'latitude % out of range [-90,90]', NEW.latitude;
  END IF;
  IF NEW.longitude IS NOT NULL AND (NEW.longitude < -180 OR NEW.longitude > 180) THEN
    RAISE EXCEPTION 'longitude % out of range [-180,180]', NEW.longitude;
  END IF;

  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    v_geom_from_latlng := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.longitude::float8, NEW.latitude::float8), 4326);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT v_trusted THEN
      NEW.geom_exact := v_geom_from_latlng;
    ELSE
      IF NEW.latitude IS NOT NULL AND NEW.geom_exact IS NULL THEN
        NEW.geom_exact := v_geom_from_latlng;
      ELSIF NEW.latitude IS NULL AND NEW.geom_exact IS NOT NULL THEN
        NEW.latitude  := extensions.ST_Y(NEW.geom_exact)::numeric;
        NEW.longitude := extensions.ST_X(NEW.geom_exact)::numeric;
      ELSIF NEW.latitude IS NOT NULL AND NEW.geom_exact IS NOT NULL THEN
        IF abs(extensions.ST_X(NEW.geom_exact) - NEW.longitude::float8) > v_tol
           OR abs(extensions.ST_Y(NEW.geom_exact) - NEW.latitude::float8) > v_tol THEN
          RAISE EXCEPTION 'geom_exact is inconsistent with latitude/longitude on insert';
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT v_trusted THEN
    NEW.geom_exact := v_geom_from_latlng;
  ELSE
    IF NEW.geom_exact IS DISTINCT FROM OLD.geom_exact
       AND NEW.latitude IS NOT DISTINCT FROM OLD.latitude
       AND NEW.longitude IS NOT DISTINCT FROM OLD.longitude THEN
      NEW.latitude  := extensions.ST_Y(NEW.geom_exact)::numeric;
      NEW.longitude := extensions.ST_X(NEW.geom_exact)::numeric;
    ELSIF (NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude)
          AND NEW.geom_exact IS NOT DISTINCT FROM OLD.geom_exact THEN
      NEW.geom_exact := v_geom_from_latlng;
    ELSIF (NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude)
          AND NEW.geom_exact IS DISTINCT FROM OLD.geom_exact THEN
      IF v_geom_from_latlng IS NULL AND NEW.geom_exact IS NULL THEN
        NULL;
      ELSIF v_geom_from_latlng IS NULL OR NEW.geom_exact IS NULL
            OR abs(extensions.ST_X(NEW.geom_exact) - NEW.longitude::float8) > v_tol
            OR abs(extensions.ST_Y(NEW.geom_exact) - NEW.latitude::float8) > v_tol THEN
        RAISE EXCEPTION 'geom_exact is inconsistent with latitude/longitude on update';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_canonical_location_lock()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF COALESCE(current_setting('reeve.system_action', true), '') <> '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.place_id IS NOT NULL OR NEW.formatted_address IS NOT NULL
       OR NEW.latitude IS NOT NULL OR NEW.longitude IS NOT NULL
       OR NEW.geom_exact IS NOT NULL
       OR NEW.address_mode IS NOT NULL OR NEW.city IS NOT NULL OR NEW.locality IS NOT NULL
       OR NEW.street_address IS NOT NULL OR NEW.street_number IS NOT NULL OR NEW.route IS NOT NULL
       OR NEW.sublocality_1 IS NOT NULL OR NEW.sublocality_2 IS NOT NULL OR NEW.neighborhood IS NOT NULL
       OR NEW.district IS NOT NULL OR NEW.state IS NOT NULL OR NEW.pincode IS NOT NULL OR NEW.plus_code IS NOT NULL
       OR NEW.country_code IS NOT NULL
       OR NEW.viewport_ne_lat IS NOT NULL OR NEW.viewport_ne_lng IS NOT NULL
       OR NEW.viewport_sw_lat IS NOT NULL OR NEW.viewport_sw_lng IS NOT NULL
       OR NEW.building_name IS NOT NULL OR NEW.building_name_source IS NOT NULL
       OR NEW.location_verified_by_owner IS TRUE OR NEW.location_verified_at IS NOT NULL
       OR NEW.location_confirmed_at IS NOT NULL OR NEW.discovery_confirmed_at IS NOT NULL
       OR NEW.discovery_finalized_at IS NOT NULL
       OR NEW.secondary_city_mode IS DISTINCT FROM 'auto' THEN
      RAISE EXCEPTION 'canonical location must be set via the trusted location flow';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.place_id IS DISTINCT FROM OLD.place_id
     OR NEW.formatted_address IS DISTINCT FROM OLD.formatted_address
     OR NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude
     OR NEW.geom_exact IS DISTINCT FROM OLD.geom_exact
     OR NEW.address_mode IS DISTINCT FROM OLD.address_mode
     OR NEW.city IS DISTINCT FROM OLD.city OR NEW.locality IS DISTINCT FROM OLD.locality
     OR NEW.street_address IS DISTINCT FROM OLD.street_address
     OR NEW.street_number IS DISTINCT FROM OLD.street_number OR NEW.route IS DISTINCT FROM OLD.route
     OR NEW.sublocality_1 IS DISTINCT FROM OLD.sublocality_1 OR NEW.sublocality_2 IS DISTINCT FROM OLD.sublocality_2
     OR NEW.neighborhood IS DISTINCT FROM OLD.neighborhood OR NEW.district IS DISTINCT FROM OLD.district
     OR NEW.state IS DISTINCT FROM OLD.state OR NEW.pincode IS DISTINCT FROM OLD.pincode
     OR NEW.plus_code IS DISTINCT FROM OLD.plus_code
     OR NEW.country_code IS DISTINCT FROM OLD.country_code
     OR NEW.viewport_ne_lat IS DISTINCT FROM OLD.viewport_ne_lat OR NEW.viewport_ne_lng IS DISTINCT FROM OLD.viewport_ne_lng
     OR NEW.viewport_sw_lat IS DISTINCT FROM OLD.viewport_sw_lat OR NEW.viewport_sw_lng IS DISTINCT FROM OLD.viewport_sw_lng
     OR NEW.building_name IS DISTINCT FROM OLD.building_name
     OR NEW.building_name_source IS DISTINCT FROM OLD.building_name_source
     OR NEW.location_verified_by_owner IS DISTINCT FROM OLD.location_verified_by_owner
     OR NEW.location_verified_at IS DISTINCT FROM OLD.location_verified_at
     OR NEW.location_confirmed_at IS DISTINCT FROM OLD.location_confirmed_at
     OR NEW.discovery_confirmed_at IS DISTINCT FROM OLD.discovery_confirmed_at
     OR NEW.discovery_finalized_at IS DISTINCT FROM OLD.discovery_finalized_at
     OR NEW.secondary_city_mode IS DISTINCT FROM OLD.secondary_city_mode THEN
    RAISE EXCEPTION 'canonical location must be changed via the trusted location flow';
  END IF;
  RETURN NEW;
END;
$$;
