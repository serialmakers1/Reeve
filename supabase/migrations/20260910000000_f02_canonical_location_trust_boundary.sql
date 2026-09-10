-- F-02: canonical-location / reeve.system_action trust-boundary fix.
--
-- Root cause (authority conflation): enforce_canonical_location_lock() disabled itself on
-- ANY non-empty reeve.system_action. handle_property_status_change() (a SECURITY INVOKER
-- BEFORE UPDATE trigger that fires inside an owner-controlled UPDATE) sets
-- reeve.system_action = 'status_change' to license server-managed status/timestamp writes
-- during a relist. Because the lock treated any non-empty value as trusted, an ordinary
-- owner could, in a single `unlisted -> listed` relist PATCH, also supply an attacker-chosen
-- geom_exact: the owner-edit partition omits geom_exact, the status trigger set the GUC, the
-- lock then returned early, and enforce_property_geom_sync derived latitude/longitude from the
-- forged geometry. geom_exact is Reeve's spatial anchor for radius/distance Search
-- (reeve_search_property_ids_v2), so this falsified the property's public/searchable position.
--
-- Fix (minimal, lock-only): the lock now bypasses ONLY for the exact reeve.system_action
-- values that genuinely authorize a canonical-location change on public.properties, all set by
-- SECURITY DEFINER location RPCs that control their own writes:
--   geo_apply_v2   -> apply_final_property_location        (writes lat/lng/address/place_id/...)
--   geo_confirm    -> confirm_property_discovery_geography (writes discovery_confirmed_at)
--   geo_finalize   -> finalize_property_discovery_geography(writes discovery_finalized_at)
--   geo_discovery  -> replace_property_discovery_geography (nulls discovery_* ; also called by apply)
--   building_name  -> update_property_building_name        (writes building_name/_source)
--
-- Deliberately NOT trusted (least-privilege): 'status_change', 'confirm_rent', 'confirm_sale',
-- 'photo_op', 'auto_unlist', 'geo_assoc', and empty. None cause a lock-protected column on
-- public.properties to change while this lock runs — verified against the current live function
-- bodies (set_property_geo_associations only SELECT ... FOR UPDATEs properties and writes
-- property_geo_associations; the confirm/photo/sweep/status paths write only non-location
-- columns). A clean relist changes no location column, so the lock's IS DISTINCT checks are all
-- false and it returns NEW normally; only a relist that also changes a canonical-location column
-- is now rejected.
--
-- enforce_property_geom_sync is intentionally left unchanged: it runs AFTER this lock (trigger
-- trg_geom_sync fires after trg_a_canonical_location_lock), so the fixed lock aborts the forged
-- statement before geom-sync is reached; narrowing geom-sync would add precision-drift regression
-- risk to legitimate relist/confirm/admin flows for no additional protection.
--
-- Original definition: baseline migration 20260821213930_baseline.sql (immutable, applied).
-- This is a forward-only, single-purpose CREATE OR REPLACE FUNCTION body change: only the top
-- trust predicate changes; every branch, comparison, exception message, and function property
-- (name, args, RETURNS trigger, plpgsql, SECURITY DEFINER, owner, search_path) is preserved, and
-- the existing trigger trg_a_canonical_location_lock stays attached.

CREATE OR REPLACE FUNCTION public.enforce_canonical_location_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Trust ONLY the operation-specific reeve.system_action values that genuinely authorize a
  -- canonical-location change (F-02). A non-location value such as 'status_change' must NOT
  -- disable this lock merely by being non-empty.
  IF COALESCE(current_setting('reeve.system_action', true), '') IN
     ('geo_apply_v2', 'geo_confirm', 'geo_finalize', 'geo_discovery', 'building_name') THEN
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
       OR NEW.discovery_finalized_at IS NOT NULL THEN
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
     OR NEW.discovery_finalized_at IS DISTINCT FROM OLD.discovery_finalized_at THEN
    RAISE EXCEPTION 'canonical location must be changed via the trusted location flow';
  END IF;
  RETURN NEW;
END;
$function$;
