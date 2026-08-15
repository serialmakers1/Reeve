-- Phase 3 · Prompt 3 — Universal publish location invariant (M2).
--
-- A property may transition INTO status='listed' ONLY when its persisted location is publish-ready.
-- This is a publish-readiness invariant ONLY — it does NOT alter the status machine, and it does NOT
-- exempt admins (unlike enforce_property_owner_transitions, admins do NOT bypass this). It also has NO
-- reeve.system_action bypass, because the normal publish path (handle_property_status_change) itself
-- sets reeve.system_action='status_change' — a GUC bypass would let every normal publish through.
--
-- Covers all three real →listed writers: admin approve (direct UPDATE), owner relist (unlisted→listed),
-- and approve_edit_request (edit_pending_review→listed).
--
-- Transitional: accepts the FINAL model (finalized discovery) OR the LEGACY model (mirrors M1 LEGACY_OK),
-- so legitimate legacy listings still publish/relist during the Phase 3/4 transition. M3 removes the
-- legacy branch later. Building requirement stays apartment/duplex_apartment only (single rule).
--
-- Trigger name sorts AFTER enforce_property_owner_transitions (status-machine validator) and BEFORE
-- handle_property_status_change (which sets listed_at/is_active) — 'enforce_pu' > 'enforce_pr', < 'handle'.

CREATE OR REPLACE FUNCTION public.enforce_publish_location_invariant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total       int;
  v_non_final   int;   -- rows with legacy relationship/confidence
  v_primary     int;
  v_bad_primary int;   -- primary rows whose kind is not settlement/search_region
  v_legacy_primary int;
  final_ok  boolean;
  legacy_ok boolean;
BEGIN
  -- Only guard the transition INTO 'listed' — never ordinary updates of an already-listed property.
  IF NOT (NEW.status = 'listed' AND OLD.status IS DISTINCT FROM 'listed') THEN
    RETURN NEW;
  END IF;

  -- Building requirement (single authoritative rule; applies to BOTH branches).
  IF NEW.property_type IN ('apartment','duplex_apartment')
     AND NULLIF(btrim(COALESCE(NEW.building_name,'')),'') IS NULL THEN
    RAISE EXCEPTION 'location_not_ready:publish_location_incomplete';
  END IF;

  -- Whole current final association set (validate the state being published, not just the timestamp).
  SELECT count(*),
         count(*) FILTER (WHERE a.relationship IS NOT NULL OR a.confidence IS NOT NULL),
         count(*) FILTER (WHERE a.is_primary),
         count(*) FILTER (WHERE a.is_primary AND g.kind NOT IN ('settlement','search_region'))
    INTO v_total, v_non_final, v_primary, v_bad_primary
    FROM public.property_geo_associations a
    JOIN public.geo_places g ON g.id = a.geo_place_id
   WHERE a.property_id = NEW.id;

  final_ok := (
    NEW.geom_exact IS NOT NULL
    AND NEW.location_confirmed_at IS NOT NULL
    AND NEW.country_code = 'IN'
    AND NEW.address_mode IN ('google_place','manual')
    AND NEW.discovery_finalized_at IS NOT NULL
    AND v_total > 0
    AND v_non_final = 0        -- every association is final shape (relationship & confidence NULL)
    AND v_primary = 1          -- exactly one primary
    AND v_bad_primary = 0      -- primary kind is settlement/search_region
  );

  SELECT count(*) INTO v_legacy_primary
    FROM public.property_geo_associations
   WHERE property_id = NEW.id AND relationship = 'primary_city';

  legacy_ok := (
    NEW.location_verified_by_owner IS TRUE
    AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
    AND NEW.address_mode = 'google_place'
    AND NULLIF(btrim(COALESCE(NEW.place_id,'')),'') IS NOT NULL
    AND v_legacy_primary = 1
  );

  IF NOT (final_ok OR legacy_ok) THEN
    RAISE EXCEPTION 'location_not_ready:publish_location_incomplete';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_publish_location_invariant_trigger ON public.properties;
CREATE TRIGGER enforce_publish_location_invariant_trigger
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_publish_location_invariant();
