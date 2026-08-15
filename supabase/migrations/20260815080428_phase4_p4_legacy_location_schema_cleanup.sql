-- Phase 4 · Prompt 4 — Migration B: legacy location schema cleanup (audited).
-- RETAINED after dependency audit (final-system deps / discriminator role) — NOT dropped:
--   * property_geo_associations.relationship  — read by reeve_search_property_ids_v2 (v3 predicate),
--       _assert_final_discovery_valid, enforce_geo_association_rules, set_property_geo_associations,
--       replace_property_discovery_geography, and both M3 triggers. Still the final-vs-legacy discriminator.
--   * property_geo_associations.confidence    — written/validated by set_property_geo_associations,
--       replace_property_discovery_geography, enforce_publish_location_invariant (final path).
--   * geo_places.place_id                     — read/written by the FINAL canonical resolver
--       (upsert_geo_place, resolve_canonical_geo_place).
--   * legacy geo_places(kind in city/area) rows + legacy property_geo_associations rows — harmless
--       (canonical v3 excludes them via relationship IS NULL); geo_places.kind CHECK left as-is.
-- DROPPED here (proven dead): apply_property_location (0 callers) and properties.secondary_city_mode
--   (all 'auto'; only apply_property_location [dropped] + enforce_canonical_location_lock referenced it).
-- Recovery: original CREATE bodies live in earlier supabase/migrations; column was
--   `secondary_city_mode text NOT NULL DEFAULT 'auto'`.

-- 1) Update the Tier-1 location lock to stop guarding the obsolete secondary_city_mode column
--    (identical to the prior definition except the two secondary_city_mode field-list references).
CREATE OR REPLACE FUNCTION public.enforce_canonical_location_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

-- 2) Drop the retired legacy applier (0 callers; exact live signature).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='apply_property_location'
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig;
  END LOOP;
END $$;

-- 3) Drop the obsolete Primary/Secondary column (all rows 'auto'; no remaining reader).
ALTER TABLE public.properties DROP COLUMN secondary_city_mode;
