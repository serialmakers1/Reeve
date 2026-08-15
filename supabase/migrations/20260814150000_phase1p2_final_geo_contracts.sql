-- =====================================================================================
-- Phase 1 · Prompt 2 — Final Canonical Geography DB Contracts + Trusted RPC Foundation
-- Project: tfutuqqcxqqbirnsdpvz  ·  COMPLETES PHASE 1
--
-- Makes the DB capable of the FINAL Reeve geography model (Reeve-owned canonical identity
-- via geo_provider_refs; final kinds search_region/settlement/locality/road; property→
-- geo_place associations with is_primary/source/evidence_type/distance_m; owner-confirm /
-- admin-finalize lifecycle) while EVERY current Owner/Admin/PropertyDetail/Search/location-
-- confirmation contract keeps working. Additive + replace-in-place. No data deleted.
--
-- Prompt-1 gotcha honored: geometry-touching functions use search_path 'public','extensions'
-- and schema-qualify extensions.*  (earthdistance/cube stay — Search still uses them).
-- =====================================================================================

SET LOCAL search_path = public, extensions;

-- -------------------------------------------------------------------------------------
-- 1. Relax nullability for final rows + data-quality CHECKs (pre-flight: data is clean)
-- -------------------------------------------------------------------------------------
ALTER TABLE public.geo_places ALTER COLUMN center_lat DROP NOT NULL;
ALTER TABLE public.geo_places ALTER COLUMN center_lng DROP NOT NULL;
ALTER TABLE public.geo_places
  DROP CONSTRAINT IF EXISTS geo_places_center_pair,
  ADD  CONSTRAINT geo_places_center_pair CHECK ((center_lat IS NULL) = (center_lng IS NULL));
ALTER TABLE public.geo_places
  DROP CONSTRAINT IF EXISTS geo_places_display_name_nonblank,
  ADD  CONSTRAINT geo_places_display_name_nonblank CHECK (btrim(display_name) <> '');

ALTER TABLE public.property_geo_associations ALTER COLUMN relationship DROP NOT NULL;
ALTER TABLE public.property_geo_associations
  DROP CONSTRAINT IF EXISTS property_geo_assoc_distance_nonneg,
  ADD  CONSTRAINT property_geo_assoc_distance_nonneg CHECK (distance_m IS NULL OR distance_m >= 0);

ALTER TABLE public.geo_provider_refs
  DROP CONSTRAINT IF EXISTS geo_provider_refs_place_id_nonblank,
  ADD  CONSTRAINT geo_provider_refs_place_id_nonblank CHECK (btrim(provider_place_id) <> ''),
  DROP CONSTRAINT IF EXISTS geo_provider_refs_provider_nonblank,
  ADD  CONSTRAINT geo_provider_refs_provider_nonblank CHECK (btrim(provider) <> '');

ALTER TABLE public.geo_place_aliases
  DROP CONSTRAINT IF EXISTS geo_place_aliases_nonblank,
  ADD  CONSTRAINT geo_place_aliases_nonblank CHECK (btrim(alias) <> '' AND btrim(normalized_alias) <> '');

-- -------------------------------------------------------------------------------------
-- 2. geo_places field-sync trigger (normalized_name + center<->representative_point)
--    side-that-changed wins so legacy upsert_geo_place center refresh never stale-rejects.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_geo_place_sync()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_tol double precision := 0.000001;
  v_center_changed boolean;
  v_rep_changed boolean;
BEGIN
  IF NEW.display_name IS NOT NULL THEN
    NEW.normalized_name := lower(btrim(NEW.display_name));
  END IF;

  -- half-pair guard (defense-in-depth with the CHECK) + range validation
  IF (NEW.center_lat IS NULL) <> (NEW.center_lng IS NULL) THEN
    RAISE EXCEPTION 'geo_places center_lat/center_lng must both be set or both null';
  END IF;
  IF NEW.center_lat IS NOT NULL AND (NEW.center_lat < -90 OR NEW.center_lat > 90) THEN
    RAISE EXCEPTION 'center_lat % out of range', NEW.center_lat;
  END IF;
  IF NEW.center_lng IS NOT NULL AND (NEW.center_lng < -180 OR NEW.center_lng > 180) THEN
    RAISE EXCEPTION 'center_lng % out of range', NEW.center_lng;
  END IF;

  -- search_region_id must reference a search_region (cross-row rule)
  IF NEW.search_region_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.geo_places sr WHERE sr.id = NEW.search_region_id AND sr.kind = 'search_region') THEN
      RAISE EXCEPTION 'search_region_id % must reference a search_region', NEW.search_region_id;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.center_lat IS NOT NULL AND NEW.representative_point IS NULL THEN
      NEW.representative_point := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.center_lng::float8, NEW.center_lat::float8), 4326);
    ELSIF NEW.center_lat IS NULL AND NEW.representative_point IS NOT NULL THEN
      NEW.center_lat := extensions.ST_Y(NEW.representative_point)::double precision;
      NEW.center_lng := extensions.ST_X(NEW.representative_point)::double precision;
    ELSIF NEW.center_lat IS NOT NULL AND NEW.representative_point IS NOT NULL THEN
      IF abs(extensions.ST_X(NEW.representative_point) - NEW.center_lng::float8) > v_tol
         OR abs(extensions.ST_Y(NEW.representative_point) - NEW.center_lat::float8) > v_tol THEN
        RAISE EXCEPTION 'representative_point inconsistent with center_lat/lng';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  v_center_changed := (NEW.center_lat IS DISTINCT FROM OLD.center_lat) OR (NEW.center_lng IS DISTINCT FROM OLD.center_lng);
  v_rep_changed    := (NEW.representative_point IS DISTINCT FROM OLD.representative_point);

  IF v_center_changed AND v_rep_changed THEN
    IF NEW.center_lat IS NULL AND NEW.representative_point IS NULL THEN
      NULL;  -- point-less
    ELSIF NEW.center_lat IS NOT NULL AND NEW.representative_point IS NULL THEN
      NEW.representative_point := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.center_lng::float8, NEW.center_lat::float8), 4326);
    ELSIF NEW.center_lat IS NULL AND NEW.representative_point IS NOT NULL THEN
      NEW.center_lat := extensions.ST_Y(NEW.representative_point)::double precision;
      NEW.center_lng := extensions.ST_X(NEW.representative_point)::double precision;
    ELSE
      IF abs(extensions.ST_X(NEW.representative_point) - NEW.center_lng::float8) > v_tol
         OR abs(extensions.ST_Y(NEW.representative_point) - NEW.center_lat::float8) > v_tol THEN
        RAISE EXCEPTION 'representative_point inconsistent with center_lat/lng';
      END IF;
    END IF;
  ELSIF v_center_changed THEN
    IF NEW.center_lat IS NOT NULL THEN
      NEW.representative_point := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.center_lng::float8, NEW.center_lat::float8), 4326);
    ELSE
      NEW.representative_point := NULL;
    END IF;
  ELSIF v_rep_changed THEN
    IF NEW.representative_point IS NOT NULL THEN
      NEW.center_lat := extensions.ST_Y(NEW.representative_point)::double precision;
      NEW.center_lng := extensions.ST_X(NEW.representative_point)::double precision;
    ELSE
      NEW.center_lat := NULL;
      NEW.center_lng := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_geo_place_sync ON public.geo_places;
CREATE TRIGGER trg_geo_place_sync
  BEFORE INSERT OR UPDATE ON public.geo_places
  FOR EACH ROW EXECUTE FUNCTION public.enforce_geo_place_sync();

-- -------------------------------------------------------------------------------------
-- 3. Transitional association validator (legacy relationship rows + final NULL rows)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_geo_association_rules()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_kind text;
  v_secondary_count int;
BEGIN
  SELECT kind INTO v_kind FROM public.geo_places WHERE id = NEW.geo_place_id;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'geo_place % does not exist', NEW.geo_place_id;
  END IF;

  IF NEW.relationship IS NOT NULL THEN
    -- LEGACY row (kind acceptance widened for in-place promotion)
    IF NEW.relationship IN ('primary_city','secondary_city') AND v_kind NOT IN ('city','search_region','settlement') THEN
      RAISE EXCEPTION 'relationship % requires city/search_region/settlement, got kind %', NEW.relationship, v_kind;
    END IF;
    IF NEW.relationship = 'area_road' AND v_kind NOT IN ('area','locality','road') THEN
      RAISE EXCEPTION 'relationship area_road requires area/locality/road, got kind %', v_kind;
    END IF;
    IF NEW.relationship = 'secondary_city' THEN
      SELECT count(*) INTO v_secondary_count
      FROM public.property_geo_associations
      WHERE property_id = NEW.property_id AND relationship = 'secondary_city' AND id <> NEW.id;
      IF v_secondary_count >= 2 THEN
        RAISE EXCEPTION 'At most 2 secondary cities per property';
      END IF;
    END IF;
    NEW.is_primary := (NEW.relationship = 'primary_city');
    RETURN NEW;
  END IF;

  -- FINAL row (relationship IS NULL)
  IF v_kind NOT IN ('search_region','settlement','locality','road') THEN
    RAISE EXCEPTION 'final association requires a final kind, got %', v_kind;
  END IF;
  IF NEW.source NOT IN ('system','owner','admin') THEN
    RAISE EXCEPTION 'final association source must be system/owner/admin, got %', NEW.source;
  END IF;
  IF NEW.evidence_type IS NULL THEN
    RAISE EXCEPTION 'final association requires evidence_type';
  END IF;
  IF NEW.is_primary AND v_kind NOT IN ('search_region','settlement') THEN
    RAISE EXCEPTION 'primary association must be search_region/settlement, got %', v_kind;
  END IF;
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 4. reeve_geo_is_plausible -> PostGIS (same signature/return/thresholds/semantics)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reeve_geo_is_plausible(
  p_lat double precision, p_lng double precision,
  p_center_lat double precision, p_center_lng double precision,
  p_bbox_ne_lat double precision, p_bbox_ne_lng double precision,
  p_bbox_sw_lat double precision, p_bbox_sw_lng double precision,
  p_kind text
) RETURNS boolean
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_max_m   double precision;
  v_pad_deg double precision;
  v_dist    double precision;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL OR p_center_lat IS NULL OR p_center_lng IS NULL THEN
    RETURN false;
  END IF;

  IF p_kind = 'road' THEN v_max_m := 10000; v_pad_deg := 0.02;
  ELSE                    v_max_m := 3000;  v_pad_deg := 0;
  END IF;

  IF p_bbox_ne_lat IS NOT NULL AND p_bbox_sw_lat IS NOT NULL THEN
    IF p_lat >= p_bbox_sw_lat - v_pad_deg AND p_lat <= p_bbox_ne_lat + v_pad_deg
       AND p_lng >= p_bbox_sw_lng - v_pad_deg AND p_lng <= p_bbox_ne_lng + v_pad_deg THEN
      RETURN true;
    END IF;
  END IF;

  v_dist := extensions.ST_Distance(
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::geography,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_center_lng, p_center_lat), 4326)::geography);
  RETURN v_dist <= v_max_m;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 5. upsert_geo_place — legacy compatibility bridge, now provider-ref-first + no-demote
-- -------------------------------------------------------------------------------------
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
  v_is_final boolean;
  v_ref_place uuid;
BEGIN
  IF p_place_id IS NULL OR btrim(p_place_id) = '' THEN RAISE EXCEPTION 'place_id required'; END IF;
  IF p_kind NOT IN ('city','area','road') THEN RAISE EXCEPTION 'invalid kind %', p_kind; END IF;

  -- Resolve identity: provider ref FIRST, then legacy place_id, else create.
  SELECT geo_place_id INTO v_ref_place FROM public.geo_provider_refs
    WHERE provider = 'google' AND provider_place_id = p_place_id;
  IF v_ref_place IS NOT NULL THEN
    v_id := v_ref_place;
  ELSE
    SELECT id INTO v_id FROM public.geo_places WHERE place_id = p_place_id;
  END IF;

  IF v_id IS NOT NULL THEN
    SELECT kind INTO v_existing_kind FROM public.geo_places WHERE id = v_id;
    v_is_final := v_existing_kind IN ('search_region','settlement','locality','road');

    IF v_is_final THEN
      -- compatibility mapping (matches resolver promotions); never demote / overwrite curated data
      IF NOT (
        (p_kind = 'city' AND v_existing_kind IN ('search_region','settlement')) OR
        (p_kind = 'area' AND v_existing_kind IN ('locality','road')) OR
        (p_kind = 'road' AND v_existing_kind = 'road')
      ) THEN
        RAISE EXCEPTION 'legacy kind % incompatible with canonical final kind % for place_id %',
          p_kind, v_existing_kind, p_place_id;
      END IF;
      UPDATE public.geo_places SET
        display_name = COALESCE(display_name, p_display_name),
        center_lat   = COALESCE(center_lat, p_center_lat),
        center_lng   = COALESCE(center_lng, p_center_lng),
        bbox_ne_lat  = COALESCE(bbox_ne_lat, p_bbox_ne_lat),
        bbox_ne_lng  = COALESCE(bbox_ne_lng, p_bbox_ne_lng),
        bbox_sw_lat  = COALESCE(bbox_sw_lat, p_bbox_sw_lat),
        bbox_sw_lng  = COALESCE(bbox_sw_lng, p_bbox_sw_lng),
        place_id     = COALESCE(place_id, p_place_id)
      WHERE id = v_id;
    ELSE
      -- still-legacy row: preserve current refresh behavior + reclassify guard
      IF v_existing_kind <> p_kind THEN
        RAISE EXCEPTION 'geo_place % already exists as kind % — refusing silent reclassify to %',
          p_place_id, v_existing_kind, p_kind;
      END IF;
      UPDATE public.geo_places SET
        display_name = p_display_name,
        center_lat = p_center_lat, center_lng = p_center_lng,
        bbox_ne_lat = p_bbox_ne_lat, bbox_ne_lng = p_bbox_ne_lng,
        bbox_sw_lat = p_bbox_sw_lat, bbox_sw_lng = p_bbox_sw_lng,
        place_id = COALESCE(place_id, p_place_id)
      WHERE id = v_id;
    END IF;
  ELSE
    INSERT INTO public.geo_places (place_id, display_name, kind, center_lat, center_lng,
                                   bbox_ne_lat, bbox_ne_lng, bbox_sw_lat, bbox_sw_lng)
    VALUES (p_place_id, p_display_name, p_kind, p_center_lat, p_center_lng,
            p_bbox_ne_lat, p_bbox_ne_lng, p_bbox_sw_lat, p_bbox_sw_lng)
    RETURNING id INTO v_id;
  END IF;

  -- Maintain the google provider ref idempotently; never repoint.
  DECLARE v_existing_ref uuid;
  BEGIN
    SELECT geo_place_id INTO v_existing_ref FROM public.geo_provider_refs
      WHERE provider = 'google' AND provider_place_id = p_place_id;
    IF v_existing_ref IS NULL THEN
      INSERT INTO public.geo_provider_refs (geo_place_id, provider, provider_place_id, last_verified_at)
        VALUES (v_id, 'google', p_place_id, now());
    ELSIF v_existing_ref <> v_id THEN
      RAISE EXCEPTION 'google place_id % already mapped to a different canonical place', p_place_id;
    ELSE
      UPDATE public.geo_provider_refs SET last_verified_at = now()
        WHERE provider = 'google' AND provider_place_id = p_place_id;
    END IF;
  END;

  RETURN v_id;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 6. apply_property_location — behavior-preserving lifecycle/country_code maintenance
-- -------------------------------------------------------------------------------------
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
    secondary_city_mode = COALESCE(
      CASE WHEN p_location->>'secondary_city_mode' IN ('auto','admin') THEN p_location->>'secondary_city_mode' END,
      secondary_city_mode, 'auto'),
    location_verified_by_owner = (p_actor_type = 'owner'),
    location_verified_at       = CASE WHEN p_actor_type = 'owner' THEN now() ELSE NULL END,
    -- Phase-1-Prompt-2 additions: factual country + lifecycle state (India-only platform)
    country_code           = 'IN',
    location_confirmed_at  = now(),
    discovery_confirmed_at = NULL,
    discovery_finalized_at = NULL,
    streetview_available    = false,
    streetview_pano_id      = NULL,
    streetview_checked_at   = NULL,
    streetview_show_in_listing = false
  WHERE id = p_property_id;

  PERFORM public.set_property_geo_associations(p_property_id, p_actor_user_id, p_actor_type, p_associations);

  RETURN p_property_id;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 7. Internal helpers (SECURITY DEFINER; internal-only)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._geo_insert_aliases(p_geo_place_id uuid, p_aliases text[])
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE a text;
BEGIN
  IF p_aliases IS NULL THEN RETURN; END IF;
  FOREACH a IN ARRAY p_aliases LOOP
    IF btrim(COALESCE(a,'')) = '' THEN CONTINUE; END IF;
    INSERT INTO public.geo_place_aliases (geo_place_id, alias, normalized_alias)
      VALUES (p_geo_place_id, btrim(a), lower(btrim(a)))
      ON CONFLICT (geo_place_id, normalized_alias) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._assert_final_discovery_valid(p_property_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_geom_ok boolean; v_conf timestamptz; v_total int; v_final int; v_primary int; v_bad int;
BEGIN
  SELECT (geom_exact IS NOT NULL), location_confirmed_at
    INTO v_geom_ok, v_conf FROM public.properties WHERE id = p_property_id;
  IF v_geom_ok IS NULL THEN RAISE EXCEPTION 'property not found'; END IF;
  IF NOT v_geom_ok OR v_conf IS NULL THEN RAISE EXCEPTION 'exact location not confirmed'; END IF;

  SELECT count(*),
         count(*) FILTER (WHERE a.relationship IS NULL),
         count(*) FILTER (WHERE a.is_primary),
         count(*) FILTER (WHERE a.is_primary AND g.kind NOT IN ('search_region','settlement'))
    INTO v_total, v_final, v_primary, v_bad
    FROM public.property_geo_associations a
    JOIN public.geo_places g ON g.id = a.geo_place_id
    WHERE a.property_id = p_property_id;

  IF v_total = 0 OR v_final <> v_total THEN
    RAISE EXCEPTION 'discovery set must be all-final with at least one association';
  END IF;
  IF v_primary <> 1 THEN RAISE EXCEPTION 'exactly one primary association required'; END IF;
  IF v_bad > 0 THEN RAISE EXCEPTION 'primary association must be search_region/settlement'; END IF;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 8. resolve_canonical_geo_place — final canonical get-or-create (idempotent)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_canonical_geo_place(
  p_kind text,
  p_display_name text,
  p_settlement_subtype text DEFAULT NULL,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_anchor_quality text DEFAULT NULL,
  p_parent_geo_place_id uuid DEFAULT NULL,
  p_search_region_id uuid DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_provider_place_id text DEFAULT NULL,
  p_provider_type text DEFAULT NULL,
  p_aliases text[] DEFAULT NULL
) RETURNS uuid
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_norm text;
  v_id uuid;
  v_existing_kind text;
  v_ref_place uuid;
  v_existing_ref uuid;
  v_rep extensions.geometry(Point,4326);
  v_cand_ids uuid[];
  v_threshold double precision;
  v_count int;
BEGIN
  -- ── validation ──────────────────────────────────────────────────────────────
  IF p_kind NOT IN ('search_region','settlement','locality','road') THEN
    RAISE EXCEPTION 'resolve_canonical_geo_place accepts final kinds only, got %', p_kind;
  END IF;
  IF btrim(COALESCE(p_display_name,'')) = '' THEN RAISE EXCEPTION 'display_name required'; END IF;
  IF (p_provider IS NULL) <> (p_provider_place_id IS NULL) THEN
    RAISE EXCEPTION 'provider and provider_place_id must both be set or both null';
  END IF;
  IF (p_lat IS NULL) <> (p_lng IS NULL) THEN
    RAISE EXCEPTION 'lat and lng must both be set or both null';
  END IF;
  IF p_lat IS NOT NULL AND (p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180) THEN
    RAISE EXCEPTION 'coordinates out of range';
  END IF;
  IF p_settlement_subtype IS NOT NULL THEN
    IF p_kind <> 'settlement' THEN RAISE EXCEPTION 'settlement_subtype only valid for settlement'; END IF;
    IF p_settlement_subtype NOT IN ('city','town','village') THEN RAISE EXCEPTION 'invalid settlement_subtype %', p_settlement_subtype; END IF;
  END IF;
  IF p_provider IS NOT NULL THEN
    p_provider := lower(btrim(p_provider));
    IF p_provider = '' OR btrim(p_provider_place_id) = '' THEN RAISE EXCEPTION 'provider/provider_place_id must be non-blank'; END IF;
  END IF;
  IF p_search_region_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.geo_places WHERE id = p_search_region_id AND kind = 'search_region') THEN
      RAISE EXCEPTION 'search_region_id must reference a search_region';
    END IF;
  END IF;

  v_norm := lower(btrim(p_display_name));
  IF p_lat IS NOT NULL THEN
    v_rep := extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326);
  END IF;

  -- ── advisory lock (identity; values normalized above) ────────────────────────
  IF p_provider IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_provider || ':' || p_provider_place_id)::bigint);
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext(
      p_kind || '|' || v_norm || '|' || COALESCE(p_settlement_subtype,'') || '|' ||
      COALESCE(p_parent_geo_place_id::text,'') || '|' || COALESCE(p_search_region_id::text,''))::bigint);
  END IF;

  -- ── A+B: existing provider ref → validate/promote/fill → return ──────────────
  IF p_provider IS NOT NULL THEN
    SELECT geo_place_id INTO v_ref_place FROM public.geo_provider_refs
      WHERE provider = p_provider AND provider_place_id = p_provider_place_id;
    IF v_ref_place IS NOT NULL THEN
      SELECT kind INTO v_existing_kind FROM public.geo_places WHERE id = v_ref_place;
      IF v_existing_kind = p_kind THEN
        NULL;
      ELSIF v_existing_kind = 'city' AND p_kind IN ('search_region','settlement') THEN
        UPDATE public.geo_places SET kind = p_kind WHERE id = v_ref_place;
      ELSIF v_existing_kind = 'area' AND p_kind IN ('locality','road') THEN
        UPDATE public.geo_places SET kind = p_kind WHERE id = v_ref_place;
      ELSIF v_existing_kind = 'road' AND p_kind = 'road' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'provider identity points to kind % incompatible with requested %', v_existing_kind, p_kind;
      END IF;
      -- fill only genuinely-missing curated fields; never overwrite established values
      UPDATE public.geo_places SET
        settlement_subtype  = CASE WHEN kind = 'settlement' THEN COALESCE(settlement_subtype, p_settlement_subtype) ELSE settlement_subtype END,
        representative_point = COALESCE(representative_point, v_rep),
        anchor_quality      = COALESCE(anchor_quality, p_anchor_quality),
        parent_geo_place_id = COALESCE(parent_geo_place_id, p_parent_geo_place_id),
        search_region_id    = COALESCE(search_region_id, p_search_region_id)
      WHERE id = v_ref_place;
      UPDATE public.geo_provider_refs
        SET last_verified_at = now(), provider_type = COALESCE(provider_type, p_provider_type)
        WHERE provider = p_provider AND provider_place_id = p_provider_place_id;
      PERFORM public._geo_insert_aliases(v_ref_place, p_aliases);
      RETURN v_ref_place;
    END IF;
  END IF;

  -- ── C/D: deterministic exact match (name/alias + kind + parent + region + subtype)
  v_cand_ids := ARRAY(
    SELECT g.id FROM public.geo_places g
    WHERE g.kind = p_kind
      AND g.parent_geo_place_id IS NOT DISTINCT FROM p_parent_geo_place_id
      AND g.search_region_id    IS NOT DISTINCT FROM p_search_region_id
      AND (p_kind <> 'settlement' OR g.settlement_subtype IS NOT DISTINCT FROM p_settlement_subtype)
      AND (
        g.normalized_name = v_norm
        OR EXISTS (SELECT 1 FROM public.geo_place_aliases al WHERE al.geo_place_id = g.id AND al.normalized_alias = v_norm)
      )
  );

  -- proximity safety net (kind-scoped; search_region has NO gate)
  IF v_rep IS NOT NULL AND p_kind IN ('locality','road','settlement') THEN
    v_threshold := CASE WHEN p_kind = 'settlement' THEN 25000 ELSE 5000 END;
    v_cand_ids := ARRAY(
      SELECT g.id FROM public.geo_places g
      WHERE g.id = ANY(v_cand_ids)
        AND (g.representative_point IS NULL
             OR extensions.ST_DWithin(g.representative_point::geography, v_rep::geography, v_threshold))
    );
  END IF;

  v_count := COALESCE(array_length(v_cand_ids, 1), 0);
  IF v_count > 1 THEN
    RAISE EXCEPTION 'ambiguous canonical match for "%" (% candidates) — refusing silent merge', v_norm, v_count;
  ELSIF v_count = 1 THEN
    v_id := v_cand_ids[1];
    IF p_provider IS NOT NULL THEN
      SELECT geo_place_id INTO v_existing_ref FROM public.geo_provider_refs
        WHERE provider = p_provider AND provider_place_id = p_provider_place_id;
      IF v_existing_ref IS NULL THEN
        INSERT INTO public.geo_provider_refs (geo_place_id, provider, provider_place_id, provider_type, last_verified_at)
          VALUES (v_id, p_provider, p_provider_place_id, p_provider_type, now());
      ELSIF v_existing_ref <> v_id THEN
        RAISE EXCEPTION 'provider identity already maps to a different canonical place';
      END IF;
      IF p_provider = 'google' THEN
        UPDATE public.geo_places SET place_id = COALESCE(place_id, p_provider_place_id) WHERE id = v_id;
      END IF;
    END IF;
    PERFORM public._geo_insert_aliases(v_id, p_aliases);
    RETURN v_id;
  END IF;

  -- ── none → create canonical row (+ provider ref if supplied) ─────────────────
  INSERT INTO public.geo_places (
    display_name, kind, normalized_name, settlement_subtype, representative_point,
    anchor_quality, parent_geo_place_id, search_region_id, place_id
  ) VALUES (
    btrim(p_display_name), p_kind, v_norm,
    CASE WHEN p_kind = 'settlement' THEN p_settlement_subtype END,
    v_rep, p_anchor_quality, p_parent_geo_place_id, p_search_region_id,
    CASE WHEN p_provider = 'google' THEN p_provider_place_id ELSE NULL END
  ) RETURNING id INTO v_id;

  IF p_provider IS NOT NULL THEN
    INSERT INTO public.geo_provider_refs (geo_place_id, provider, provider_place_id, provider_type, last_verified_at)
      VALUES (v_id, p_provider, p_provider_place_id, p_provider_type, now());
  END IF;
  PERFORM public._geo_insert_aliases(v_id, p_aliases);
  RETURN v_id;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 9. replace_property_discovery_geography — final atomic write (server-computed distance)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_property_discovery_geography(
  p_property_id uuid, p_associations jsonb
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_owner uuid;
  v_geom extensions.geometry(Point,4326);
  v_elem jsonb;
  v_gp public.geo_places%ROWTYPE;
  v_seen uuid[] := '{}';
  v_gid uuid;
  v_primary_count int := 0;
BEGIN
  SELECT owner_id, geom_exact INTO v_owner, v_geom FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'property not found'; END IF;
  IF p_associations IS NULL OR jsonb_typeof(p_associations) <> 'array' THEN
    RAISE EXCEPTION 'associations must be a jsonb array';
  END IF;

  -- validate the whole set BEFORE mutating
  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_associations) LOOP
    IF v_elem ? 'relationship' OR v_elem ? 'confidence' THEN
      RAISE EXCEPTION 'final payload must not include legacy relationship/confidence';
    END IF;
    v_gid := (v_elem->>'geo_place_id')::uuid;
    IF v_gid = ANY(v_seen) THEN RAISE EXCEPTION 'duplicate geo_place_id % in payload', v_gid; END IF;
    v_seen := v_seen || v_gid;
    SELECT * INTO v_gp FROM public.geo_places WHERE id = v_gid;
    IF v_gp.id IS NULL THEN RAISE EXCEPTION 'geo_place % not found', v_gid; END IF;
    IF v_gp.kind NOT IN ('search_region','settlement','locality','road') THEN
      RAISE EXCEPTION 'geo_place % is not a final kind (%)', v_gid, v_gp.kind;
    END IF;
    IF COALESCE(v_elem->>'source','') NOT IN ('system','owner','admin') THEN
      RAISE EXCEPTION 'invalid source for geo_place %', v_gid;
    END IF;
    IF COALESCE(btrim(v_elem->>'evidence_type'),'') = '' THEN
      RAISE EXCEPTION 'evidence_type required for geo_place %', v_gid;
    END IF;
    IF (v_elem->>'is_primary')::boolean IS TRUE THEN
      v_primary_count := v_primary_count + 1;
      IF v_gp.kind NOT IN ('search_region','settlement') THEN
        RAISE EXCEPTION 'primary must be search_region/settlement, got % for %', v_gp.kind, v_gid;
      END IF;
    END IF;
  END LOOP;
  IF v_primary_count > 1 THEN RAISE EXCEPTION 'at most one primary association'; END IF;

  PERFORM set_config('reeve.system_action', 'geo_discovery', true);

  DELETE FROM public.property_geo_associations WHERE property_id = p_property_id;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_associations) LOOP
    SELECT * INTO v_gp FROM public.geo_places WHERE id = (v_elem->>'geo_place_id')::uuid;
    INSERT INTO public.property_geo_associations
      (property_id, geo_place_id, relationship, confidence, is_primary, source, evidence_type, distance_m)
    VALUES (
      p_property_id, v_gp.id, NULL, NULL,
      COALESCE((v_elem->>'is_primary')::boolean, false),
      v_elem->>'source', v_elem->>'evidence_type',
      CASE WHEN v_geom IS NOT NULL AND v_gp.representative_point IS NOT NULL
           THEN extensions.ST_Distance(v_geom::geography, v_gp.representative_point::geography)
           ELSE NULL END
    );
  END LOOP;

  UPDATE public.properties SET discovery_confirmed_at = NULL, discovery_finalized_at = NULL WHERE id = p_property_id;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 10. Owner-confirm / Admin-finalize lifecycle RPCs
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_property_discovery_geography(p_property_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM 1 FROM public.properties WHERE id = p_property_id FOR UPDATE;
  PERFORM public._assert_final_discovery_valid(p_property_id);
  PERFORM set_config('reeve.system_action', 'geo_confirm', true);
  UPDATE public.properties SET discovery_confirmed_at = now() WHERE id = p_property_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_property_discovery_geography(p_property_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM 1 FROM public.properties WHERE id = p_property_id FOR UPDATE;
  PERFORM public._assert_final_discovery_valid(p_property_id);
  PERFORM set_config('reeve.system_action', 'geo_finalize', true);
  UPDATE public.properties SET discovery_finalized_at = now() WHERE id = p_property_id;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 11. Transitional Search bridge — reeve_search_property_ids recognizes FINAL rows too
--     (membership by g.kind, not is_primary; final anchors resolved via geo_provider_refs)
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reeve_search_property_ids(
  p_city_anchors jsonb, p_area_anchors jsonb, p_distance_km numeric
) RETURNS SETOF uuid
  LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $$
DECLARE
  v_city_ids   text[] := ARRAY(SELECT e->>'place_id' FROM jsonb_array_elements(COALESCE(p_city_anchors,'[]'::jsonb)) e WHERE e->>'place_id' IS NOT NULL);
  v_area_ids   text[] := ARRAY(SELECT e->>'place_id' FROM jsonb_array_elements(COALESCE(p_area_anchors,'[]'::jsonb)) e WHERE e->>'place_id' IS NOT NULL);
  v_has_city   boolean := array_length(v_city_ids,1) IS NOT NULL;
  v_has_area   boolean := array_length(v_area_ids,1) IS NOT NULL;
  v_net        double precision := public.reeve_search_safety_net_m();
BEGIN
  -- Explicit distance (pin-based; unaffected by association model)
  IF p_distance_km IS NOT NULL AND p_distance_km > 0 THEN
    RETURN QUERY
      SELECT DISTINCT p.id
      FROM public.properties p,
           jsonb_array_elements(CASE WHEN v_has_area THEN COALESCE(p_area_anchors,'[]'::jsonb)
                                     ELSE COALESCE(p_city_anchors,'[]'::jsonb) END) an
      WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND (an->>'lat') IS NOT NULL AND (an->>'lng') IS NOT NULL
        AND earth_box(ll_to_earth((an->>'lat')::float8,(an->>'lng')::float8), (p_distance_km*1000.0)::float8)
              @> ll_to_earth(p.latitude::float8, p.longitude::float8)
        AND earth_distance(ll_to_earth(p.latitude::float8,p.longitude::float8),
                           ll_to_earth((an->>'lat')::float8,(an->>'lng')::float8)) <= (p_distance_km*1000.0)::float8;
    RETURN;
  END IF;

  IF v_has_area THEN
    RETURN QUERY
      SELECT DISTINCT cand.property_id FROM (
        -- legacy area_road OR final locality/road (anchor via place_id mirror OR provider ref)
        SELECT a.property_id FROM public.property_geo_associations a
          JOIN public.geo_places g ON g.id=a.geo_place_id
          WHERE (a.relationship='area_road' AND g.place_id = ANY(v_area_ids))
             OR (a.relationship IS NULL AND g.kind IN ('locality','road')
                 AND (g.place_id = ANY(v_area_ids)
                      OR EXISTS (SELECT 1 FROM public.geo_provider_refs gpr
                                 WHERE gpr.geo_place_id=g.id AND gpr.provider='google' AND gpr.provider_place_id = ANY(v_area_ids))))
        UNION
        SELECT p.id AS property_id
          FROM public.properties p, jsonb_array_elements(COALESCE(p_area_anchors,'[]'::jsonb)) an
          WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
            AND (an->>'lat') IS NOT NULL AND (an->>'lng') IS NOT NULL
            AND earth_box(ll_to_earth((an->>'lat')::float8,(an->>'lng')::float8), v_net)
                  @> ll_to_earth(p.latitude::float8, p.longitude::float8)
            AND earth_distance(ll_to_earth(p.latitude::float8,p.longitude::float8),
                               ll_to_earth((an->>'lat')::float8,(an->>'lng')::float8)) <= v_net
      ) cand
      WHERE NOT v_has_city OR cand.property_id IN (
        SELECT a.property_id FROM public.property_geo_associations a
          JOIN public.geo_places g ON g.id=a.geo_place_id
          WHERE (a.relationship IN ('primary_city','secondary_city') AND g.place_id = ANY(v_city_ids))
             OR (a.relationship IS NULL AND g.kind IN ('search_region','settlement')
                 AND (g.place_id = ANY(v_city_ids)
                      OR EXISTS (SELECT 1 FROM public.geo_provider_refs gpr
                                 WHERE gpr.geo_place_id=g.id AND gpr.provider='google' AND gpr.provider_place_id = ANY(v_city_ids))))
      );
    RETURN;
  END IF;

  IF v_has_city THEN
    RETURN QUERY
      SELECT DISTINCT a.property_id FROM public.property_geo_associations a
        JOIN public.geo_places g ON g.id=a.geo_place_id
        WHERE (a.relationship IN ('primary_city','secondary_city') AND g.place_id = ANY(v_city_ids))
           OR (a.relationship IS NULL AND g.kind IN ('search_region','settlement')
               AND (g.place_id = ANY(v_city_ids)
                    OR EXISTS (SELECT 1 FROM public.geo_provider_refs gpr
                               WHERE gpr.geo_place_id=g.id AND gpr.provider='google' AND gpr.provider_place_id = ANY(v_city_ids))));
    RETURN;
  END IF;

  RETURN;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 12. EXECUTE lockdown for all NEW functions (service-role only)
-- -------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public._geo_insert_aliases(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._geo_insert_aliases(uuid, text[]) TO service_role;

REVOKE ALL ON FUNCTION public._assert_final_discovery_valid(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._assert_final_discovery_valid(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.resolve_canonical_geo_place(text,text,text,double precision,double precision,text,uuid,uuid,text,text,text,text[]) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.resolve_canonical_geo_place(text,text,text,double precision,double precision,text,uuid,uuid,text,text,text,text[]) TO service_role;

REVOKE ALL ON FUNCTION public.replace_property_discovery_geography(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.replace_property_discovery_geography(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.confirm_property_discovery_geography(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_property_discovery_geography(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_property_discovery_geography(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.finalize_property_discovery_geography(uuid) TO service_role;

-- -------------------------------------------------------------------------------------
-- 13. Comments
-- -------------------------------------------------------------------------------------
COMMENT ON FUNCTION public.resolve_canonical_geo_place(text,text,text,double precision,double precision,text,uuid,uuid,text,text,text,text[]) IS
  'Trusted final canonical get-or-create. Identity = geo_places.id via geo_provider_refs; final kinds only; idempotent (advisory lock); deterministic exact match + kind-scoped proximity net; never fuzzy-merges. Phase 2 calls this.';
COMMENT ON FUNCTION public.replace_property_discovery_geography(uuid, jsonb) IS
  'Trusted atomic replace of a property''s FINAL discovery associations (relationship/confidence NULL; server-computed distance_m). Resets discovery_confirmed_at/finalized_at.';
COMMENT ON FUNCTION public.upsert_geo_place(text,text,text,double precision,double precision,double precision,double precision,double precision,double precision) IS
  'LEGACY compatibility bridge (Edge Function). Provider-ref-first identity; maintains google geo_provider_refs; never demotes/overwrites promoted canonical rows. Not the final resolver.';
