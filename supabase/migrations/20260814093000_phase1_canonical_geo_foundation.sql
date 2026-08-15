-- =====================================================================================
-- Phase 1 · Prompt 1 — PostGIS + Canonical Geography Schema Foundation
-- Project: tfutuqqcxqqbirnsdpvz
--
-- ADDITIVE / COMPATIBILITY-SAFE ONLY. Installs PostGIS (alongside cube/earthdistance),
-- gives properties an authoritative geom_exact synced with legacy lat/lng, and evolves
-- the canonical geography tables toward the final Discovery-Geography model WITHOUT
-- cutting over any live contract. Owner/Admin/PropertyDetail/Search keep working; the
-- trusted RPCs, Edge Function, guards' *writers*, and Search are rewritten in Prompt 2.
--
-- Locked decision: the confirmed pin is PUBLIC for all property types. geom_exact only —
-- no geom_public, no private table, no jitter. Existing public lat/lng access stays.
-- All existing rows are test data; NOTHING is deleted or truncated.
-- =====================================================================================

-- geometry types/functions live in the `extensions` schema (Supabase convention); make
-- the bare `geometry(...)` type name resolve during this migration's DDL.
SET LOCAL search_path = public, extensions;

-- -------------------------------------------------------------------------------------
-- 1. PostGIS (do NOT touch cube/earthdistance — active Search still depends on them)
-- -------------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- -------------------------------------------------------------------------------------
-- 2. properties.geom_exact + lat/lng pair CHECK + country_code (nullable, NO default)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS geom_exact extensions.geometry(Point, 4326);

COMMENT ON COLUMN public.properties.geom_exact IS
  'Authoritative confirmed property point (SRID 4326), kept in sync with latitude/longitude by trg_geom_sync. Public for all property types. Prompt 2 makes this the primary spatial anchor for Search.';

CREATE INDEX IF NOT EXISTS idx_properties_geom_exact
  ON public.properties USING gist (geom_exact)
  WHERE geom_exact IS NOT NULL;

-- A location has both coordinates or neither (live data: 14 both / 2 neither / 0 half).
ALTER TABLE public.properties
  ADD CONSTRAINT properties_latlng_pair CHECK ((latitude IS NULL) = (longitude IS NULL));

-- Only genuinely-missing factual field. NO default: country_code is guarded on INSERT by
-- the canonical lock (step 5); a DEFAULT would auto-populate untrusted draft inserts and
-- the guard would then reject them. Backfilled for India rows in step 6; Prompt 2's trusted
-- resolver populates it going forward.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS country_code varchar;

COMMENT ON COLUMN public.properties.country_code IS
  'ISO country code (e.g. IN). Nullable, no default (guarded on INSERT). Populated by the trusted location resolver in Prompt 2.';

-- -------------------------------------------------------------------------------------
-- 3. lat/lng <-> geom_exact synchronization trigger
--    Named trg_geom_sync so it sorts AFTER trg_a_canonical_location_lock (the lock
--    rejects untrusted geom tampering loudly; this is belt-and-suspenders).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_property_geom_sync()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_trusted boolean := COALESCE(current_setting('reeve.system_action', true), '') <> '';
  v_geom_from_latlng extensions.geometry(Point,4326);
  v_tol double precision := 0.000001;  -- ~0.11 m tolerance for consistency checks
BEGIN
  -- Coordinate range validation (never build an invalid Point).
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
      -- Untrusted: geom is derived solely from lat/lng; any supplied geom_exact is ignored.
      NEW.geom_exact := v_geom_from_latlng;
    ELSE
      -- Trusted (future geom-first path). Half-pair is already blocked by properties_latlng_pair.
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
        -- consistent -> keep as supplied
      END IF;
      -- all NULL -> draft, leave NULL
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: change-detection against OLD.
  IF NOT v_trusted THEN
    -- Untrusted: lat/lng are locked from change by the canonical guard, so geom is simply
    -- re-derived from NEW lat/lng — any client-supplied geom_exact is overwritten (no pin move).
    NEW.geom_exact := v_geom_from_latlng;
  ELSE
    IF NEW.geom_exact IS DISTINCT FROM OLD.geom_exact
       AND NEW.latitude IS NOT DISTINCT FROM OLD.latitude
       AND NEW.longitude IS NOT DISTINCT FROM OLD.longitude THEN
      -- geom-first trusted write: derive lat/lng from the new geom
      NEW.latitude  := extensions.ST_Y(NEW.geom_exact)::numeric;
      NEW.longitude := extensions.ST_X(NEW.geom_exact)::numeric;
    ELSIF (NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude)
          AND NEW.geom_exact IS NOT DISTINCT FROM OLD.geom_exact THEN
      -- latlng-first trusted write: derive geom
      NEW.geom_exact := v_geom_from_latlng;
    ELSIF (NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude)
          AND NEW.geom_exact IS DISTINCT FROM OLD.geom_exact THEN
      -- both changed: must be consistent
      IF v_geom_from_latlng IS NULL AND NEW.geom_exact IS NULL THEN
        NULL;  -- both cleared
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

DROP TRIGGER IF EXISTS trg_geom_sync ON public.properties;
CREATE TRIGGER trg_geom_sync
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_geom_sync();

-- -------------------------------------------------------------------------------------
-- 4. properties lifecycle timestamps (additive, nullable, no backfill).
--    Created BEFORE the guard in step 5 references them.
-- -------------------------------------------------------------------------------------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS location_confirmed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS discovery_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS discovery_finalized_at timestamptz;

COMMENT ON COLUMN public.properties.location_confirmed_at  IS 'When the exact pin was confirmed (trusted path). Wired in Prompt 2.';
COMMENT ON COLUMN public.properties.discovery_confirmed_at IS 'When the owner confirmed discovery geography (trusted path). Wired in Prompt 2.';
COMMENT ON COLUMN public.properties.discovery_finalized_at IS 'When admin finalized discovery geography (trusted path). Wired in Prompt 2.';

-- -------------------------------------------------------------------------------------
-- 5. Extend enforce_canonical_location_lock to also guard geom_exact, country_code, and
--    the three lifecycle timestamps (both INSERT and UPDATE). Trusted-path short-circuit
--    unchanged, so apply_property_location + the step-6 backfill still pass.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_canonical_location_lock()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(current_setting('reeve.system_action', true), '') <> '' THEN
    RETURN NEW;  -- trusted path
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

-- -------------------------------------------------------------------------------------
-- 6. Backfill geom_exact + country_code for existing rows, WITHOUT firing side-effect
--    triggers. Disable only: n8n webhook, activity-log writer, and the geom sync trigger
--    (geom is computed inline here, so sync must not re-derive lat/lng and mutate them).
--    Set the trusted GUC so the now-extended canonical lock passes; clear it before exit.
-- -------------------------------------------------------------------------------------
ALTER TABLE public.properties DISABLE TRIGGER "n8n-properties";
ALTER TABLE public.properties DISABLE TRIGGER property_activity_log_writer_trigger;
ALTER TABLE public.properties DISABLE TRIGGER trg_geom_sync;

SELECT set_config('reeve.system_action', 'geo_backfill', true);  -- txn-local

UPDATE public.properties
  SET geom_exact = extensions.ST_SetSRID(extensions.ST_MakePoint(longitude::float8, latitude::float8), 4326)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
    AND geom_exact IS NULL;

UPDATE public.properties
  SET country_code = 'IN'
  WHERE country ILIKE 'India' AND country_code IS NULL;

SELECT set_config('reeve.system_action', '', true);  -- clear before leaving block

ALTER TABLE public.properties ENABLE TRIGGER "n8n-properties";
ALTER TABLE public.properties ENABLE TRIGGER property_activity_log_writer_trigger;
ALTER TABLE public.properties ENABLE TRIGGER trg_geom_sync;

-- -------------------------------------------------------------------------------------
-- 7. geo_places evolution (transitional; legacy city/area kinds still valid)
-- -------------------------------------------------------------------------------------
-- Expand kind to the transitional union (final types + legacy).
ALTER TABLE public.geo_places DROP CONSTRAINT IF EXISTS geo_places_kind_check;
ALTER TABLE public.geo_places
  ADD CONSTRAINT geo_places_kind_check
  CHECK (kind IN ('search_region','settlement','locality','road','city','area'));

-- Allow provider-less canonical places now (keep UNIQUE; Postgres permits multiple NULLs).
ALTER TABLE public.geo_places ALTER COLUMN place_id DROP NOT NULL;

ALTER TABLE public.geo_places
  ADD COLUMN IF NOT EXISTS normalized_name     text,
  ADD COLUMN IF NOT EXISTS settlement_subtype  text,
  ADD COLUMN IF NOT EXISTS representative_point extensions.geometry(Point,4326),
  ADD COLUMN IF NOT EXISTS anchor_quality      text,
  ADD COLUMN IF NOT EXISTS parent_geo_place_id uuid REFERENCES public.geo_places(id),
  ADD COLUMN IF NOT EXISTS search_region_id    uuid REFERENCES public.geo_places(id),
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.geo_places
  DROP CONSTRAINT IF EXISTS geo_places_settlement_subtype_check,
  ADD  CONSTRAINT geo_places_settlement_subtype_check
    CHECK (settlement_subtype IS NULL OR (kind = 'settlement' AND settlement_subtype IN ('city','town','village')));

ALTER TABLE public.geo_places
  DROP CONSTRAINT IF EXISTS geo_places_anchor_quality_check,
  ADD  CONSTRAINT geo_places_anchor_quality_check
    CHECK (anchor_quality IS NULL OR anchor_quality IN ('provider_centroid','verified_point','polygon_available'));

ALTER TABLE public.geo_places
  DROP CONSTRAINT IF EXISTS geo_places_no_self_parent,
  ADD  CONSTRAINT geo_places_no_self_parent CHECK (parent_geo_place_id IS NULL OR parent_geo_place_id <> id);

ALTER TABLE public.geo_places
  DROP CONSTRAINT IF EXISTS geo_places_no_self_region,
  ADD  CONSTRAINT geo_places_no_self_region CHECK (search_region_id IS NULL OR search_region_id <> id);

-- Backfill normalized name + representative point (reliable provider centroid) for existing rows.
UPDATE public.geo_places
  SET normalized_name = lower(btrim(display_name))
  WHERE normalized_name IS NULL;

UPDATE public.geo_places
  SET representative_point = extensions.ST_SetSRID(extensions.ST_MakePoint(center_lng::float8, center_lat::float8), 4326),
      anchor_quality = COALESCE(anchor_quality, 'provider_centroid')
  WHERE representative_point IS NULL AND center_lat IS NOT NULL AND center_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_geo_places_representative_point
  ON public.geo_places USING gist (representative_point)
  WHERE representative_point IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_geo_places_normalized_name
  ON public.geo_places (normalized_name);

DROP TRIGGER IF EXISTS handle_geo_places_updated_at ON public.geo_places;
CREATE TRIGGER handle_geo_places_updated_at
  BEFORE UPDATE ON public.geo_places
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

COMMENT ON COLUMN public.geo_places.normalized_name IS 'lower(btrim(display_name)); lookup key. NOT globally unique (same name may exist in different contexts).';
COMMENT ON COLUMN public.geo_places.anchor_quality IS 'Factual anchor source of representative_point: provider_centroid | verified_point | polygon_available.';

-- -------------------------------------------------------------------------------------
-- 8. geo_provider_refs — provider identity mapping (idempotency guarantee)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geo_provider_refs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geo_place_id      uuid NOT NULL REFERENCES public.geo_places(id) ON DELETE CASCADE,
  provider          text NOT NULL CHECK (provider = lower(provider)),
  provider_place_id text NOT NULL,
  provider_type     text,
  last_verified_at  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT geo_provider_refs_provider_place_uniq UNIQUE (provider, provider_place_id)
);
CREATE INDEX IF NOT EXISTS idx_geo_provider_refs_geo_place_id ON public.geo_provider_refs (geo_place_id);

COMMENT ON TABLE public.geo_provider_refs IS
  'Maps a Reeve canonical geo_place to an external provider identity. UNIQUE(provider, provider_place_id) makes canonical get-or-create idempotent. Service-role writes only.';

ALTER TABLE public.geo_provider_refs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS geo_provider_refs_select ON public.geo_provider_refs;
CREATE POLICY geo_provider_refs_select ON public.geo_provider_refs
  FOR SELECT USING (auth.uid() IS NOT NULL);

REVOKE ALL ON TABLE public.geo_provider_refs FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.geo_provider_refs FROM anon, authenticated;
GRANT SELECT ON TABLE public.geo_provider_refs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.geo_provider_refs TO service_role;

DROP TRIGGER IF EXISTS handle_geo_provider_refs_updated_at ON public.geo_provider_refs;
CREATE TRIGGER handle_geo_provider_refs_updated_at
  BEFORE UPDATE ON public.geo_provider_refs
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- Idempotent compatibility backfill: existing Google-backed geo_places -> provider refs.
INSERT INTO public.geo_provider_refs (geo_place_id, provider, provider_place_id)
  SELECT id, 'google', place_id FROM public.geo_places WHERE place_id IS NOT NULL
  ON CONFLICT (provider, provider_place_id) DO NOTHING;

-- -------------------------------------------------------------------------------------
-- 9. geo_place_aliases — alternate names per canonical place
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geo_place_aliases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  geo_place_id     uuid NOT NULL REFERENCES public.geo_places(id) ON DELETE CASCADE,
  alias            text NOT NULL,
  normalized_alias text NOT NULL,
  language         text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  -- Dedup per canonical place; identical names across DIFFERENT places are allowed (no global unique).
  CONSTRAINT geo_place_aliases_place_norm_uniq UNIQUE (geo_place_id, normalized_alias)
);
CREATE INDEX IF NOT EXISTS idx_geo_place_aliases_normalized_alias ON public.geo_place_aliases (normalized_alias);

COMMENT ON TABLE public.geo_place_aliases IS
  'Alternate/normalized names (e.g. Bangalore->Bengaluru) per canonical geo_place. UNIQUE per (place, normalized_alias) only — same name may legitimately exist for different places. Service-role writes only.';

ALTER TABLE public.geo_place_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS geo_place_aliases_select ON public.geo_place_aliases;
CREATE POLICY geo_place_aliases_select ON public.geo_place_aliases
  FOR SELECT USING (auth.uid() IS NOT NULL);

REVOKE ALL ON TABLE public.geo_place_aliases FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.geo_place_aliases FROM anon, authenticated;
GRANT SELECT ON TABLE public.geo_place_aliases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.geo_place_aliases TO service_role;

DROP TRIGGER IF EXISTS handle_geo_place_aliases_updated_at ON public.geo_place_aliases;
CREATE TRIGGER handle_geo_place_aliases_updated_at
  BEFORE UPDATE ON public.geo_place_aliases
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- -------------------------------------------------------------------------------------
-- 10. property_geo_associations — additive final-model fields (evolve in place)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.property_geo_associations
  ADD COLUMN IF NOT EXISTS is_primary   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_type text,
  ADD COLUMN IF NOT EXISTS distance_m   double precision;

ALTER TABLE public.property_geo_associations
  DROP CONSTRAINT IF EXISTS property_geo_assoc_evidence_type_check,
  ADD  CONSTRAINT property_geo_assoc_evidence_type_check
    CHECK (evidence_type IS NULL OR evidence_type IN (
      'provider_address','provider_descriptor','provider_route','formatted_address_alias',
      'curated_search_region','nearby_canonical','owner_added','admin_override'));

-- Expand source to the transitional union (legacy google + final system/owner/admin).
ALTER TABLE public.property_geo_associations DROP CONSTRAINT IF EXISTS property_geo_associations_source_check;
ALTER TABLE public.property_geo_associations
  ADD CONSTRAINT property_geo_associations_source_check
  CHECK (source IN ('google','system','owner','admin'));

-- Backfill is_primary from the legacy relationship (deterministic; one per property already).
UPDATE public.property_geo_associations SET is_primary = true
  WHERE relationship = 'primary_city' AND is_primary = false;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_property_geo_is_primary
  ON public.property_geo_associations (property_id) WHERE is_primary;

COMMENT ON COLUMN public.property_geo_associations.is_primary   IS 'Final-model primary flag (replaces relationship=primary_city in Prompt 2).';
COMMENT ON COLUMN public.property_geo_associations.evidence_type IS 'Factual provenance of this association. Populated by the trusted resolver in Prompt 2.';
COMMENT ON COLUMN public.property_geo_associations.distance_m    IS 'Optional distance (m) from property pin to the canonical place, when evidence is proximity-based.';
