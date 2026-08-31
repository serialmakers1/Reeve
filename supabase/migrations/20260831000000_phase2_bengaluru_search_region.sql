-- Phase 2: Canonical Bengaluru Search Region architecture
--
-- Activates the already-present (but unpopulated) search_region model so
-- geo_places.search_region_id becomes the single authoritative, system/admin-owned
-- source of marketplace-region membership, traversed at query time.
--
-- Scope (idempotent, single-purpose):
--   1. create/reuse the "Bengaluru" search_region
--   2. aliases Bengaluru / Bangalore
--   3. backfill search_region_id on the FOUR approved settlement UUIDs only (NULL-guarded, fail-loud on conflict)
--   4. indexes on search_region_id + parent_geo_place_id (partial, if absent)
--   5. reeve_search_property_ids_v2 — primary-settlement region traversal (roots split; no direct region-assoc match)
--   6. reeve_search_geo_suggest — region ranked ahead of same-name settlement; locality-only parent traversal
--   7. reeve_reconcile_road_search_region — ambiguity-safe, set-based road region membership
--   8. backfill existing roads via the reconciler
--   9. admin_set_settlement_search_region — minimal admin/system-only membership maintenance RPC
--
-- Devanahalli / Chikkakannalli / Hoskote are deliberately NOT mapped here (curated review).
-- search_compact_properties_v5 and reeve_search_geo_by_ids are intentionally unchanged.

-- ============================================================
-- Step 1 — Bengaluru search_region (guarded, no unsafe name-only merge)
-- ============================================================
INSERT INTO public.geo_places (display_name, kind, normalized_name)
SELECT 'Bengaluru', 'search_region', 'bengaluru'
WHERE NOT EXISTS (
  SELECT 1 FROM public.geo_places WHERE kind = 'search_region' AND normalized_name = 'bengaluru'
);

-- ============================================================
-- Step 2 — Aliases (Bengaluru, Bangalore) on the region row
-- ============================================================
INSERT INTO public.geo_place_aliases (geo_place_id, alias, normalized_alias)
SELECT r.id, v.alias, v.norm
FROM (SELECT id FROM public.geo_places WHERE kind = 'search_region' AND normalized_name = 'bengaluru') r
CROSS JOIN (VALUES ('Bengaluru', 'bengaluru'), ('Bangalore', 'bangalore')) AS v(alias, norm)
ON CONFLICT (geo_place_id, normalized_alias) DO NOTHING;

-- ============================================================
-- Step 3 — Backfill search_region_id for the FOUR approved UUIDs only
--   NULL-guarded; fail loud if any already maps to a DIFFERENT non-null region.
-- ============================================================
DO $$
DECLARE
  v_region uuid;
  v_ids uuid[] := ARRAY[
    '966f8504-a888-4eb6-b97a-833311120790',  -- Bengaluru (settlement)
    '1ab7b20d-d350-4daa-ba23-6f3fce43851a',  -- Bengaluru Urban
    'c2ce361e-b859-4321-bcb3-f82669546d22',  -- Bangalore Rural
    '88d2a8af-21e5-4c9a-bbed-60c678ec1bfa'   -- Samethanahalli
  ]::uuid[];
BEGIN
  SELECT id INTO v_region FROM public.geo_places WHERE kind = 'search_region' AND normalized_name = 'bengaluru';
  IF v_region IS NULL THEN RAISE EXCEPTION 'Bengaluru search_region missing (Step 1 failed)'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.geo_places
    WHERE id = ANY(v_ids) AND search_region_id IS NOT NULL AND search_region_id <> v_region
  ) THEN
    RAISE EXCEPTION 'An approved settlement already maps to a different search_region — refusing to clobber';
  END IF;

  UPDATE public.geo_places
  SET search_region_id = v_region
  WHERE id = ANY(v_ids) AND search_region_id IS NULL;
END $$;

-- ============================================================
-- Step 4 — Indexes (partial, if absent)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_geo_places_search_region_id
  ON public.geo_places (search_region_id) WHERE search_region_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_geo_places_parent_geo_place_id
  ON public.geo_places (parent_geo_place_id) WHERE parent_geo_place_id IS NOT NULL;

-- ============================================================
-- Step 5 — reeve_search_property_ids_v2 (primary-settlement region traversal)
--   Preserves: signature, STABLE, SECURITY INVOKER, search_path, grants (CREATE OR REPLACE).
--   Roots split: selected settlements match ANY association; a selected search_region matches
--   ONLY a property whose PRIMARY root is (A) a member settlement of the region, or (B) the
--   region itself. A non-primary/stale direct region association never matches.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reeve_search_property_ids_v2(p_geo_place_ids uuid[], p_distance_km numeric)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ids                uuid[];
  v_direct_settlements uuid[];
  v_selected_regions   uuid[];
  v_members            uuid[];
  v_detail             uuid[];
  v_locality           uuid[];
  v_root_props         uuid[];
  v_has_root           boolean;
  v_has_detail         boolean;
  v_found              integer;
BEGIN
  IF p_distance_km IS NOT NULL AND p_distance_km NOT IN (2,5,10,20,30,50) THEN
    RAISE EXCEPTION 'invalid_radius';
  END IF;

  v_ids := ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_geo_place_ids, '{}'::uuid[])) x WHERE x IS NOT NULL);

  IF array_length(v_ids, 1) IS NULL THEN
    IF p_distance_km IS NOT NULL THEN RAISE EXCEPTION 'radius_requires_locality'; END IF;
    RETURN;
  END IF;

  SELECT count(*) INTO v_found
    FROM public.geo_places g
   WHERE g.id = ANY(v_ids) AND g.kind IN ('search_region','settlement','locality','road');
  IF v_found <> array_length(v_ids, 1) THEN RAISE EXCEPTION 'invalid_anchor'; END IF;

  v_direct_settlements := ARRAY(SELECT g.id FROM public.geo_places g WHERE g.id = ANY(v_ids) AND g.kind = 'settlement');
  v_selected_regions   := ARRAY(SELECT g.id FROM public.geo_places g WHERE g.id = ANY(v_ids) AND g.kind = 'search_region');
  v_detail             := ARRAY(SELECT g.id FROM public.geo_places g WHERE g.id = ANY(v_ids) AND g.kind IN ('locality','road'));
  v_locality           := ARRAY(SELECT g.id FROM public.geo_places g WHERE g.id = ANY(v_ids) AND g.kind = 'locality');
  -- Member settlements of the selected search_regions (authoritative membership).
  v_members := ARRAY(
    SELECT g.id FROM public.geo_places g
    WHERE g.kind = 'settlement' AND g.search_region_id = ANY(v_selected_regions)
  );

  -- Radius mode (unchanged): locality representative points, may cross region boundaries by design.
  IF p_distance_km IS NOT NULL THEN
    IF array_length(v_locality, 1) IS NULL THEN RAISE EXCEPTION 'radius_requires_locality'; END IF;
    IF EXISTS (SELECT 1 FROM public.geo_places g WHERE g.id = ANY(v_locality) AND g.representative_point IS NULL) THEN
      RAISE EXCEPTION 'locality_no_representative_point';
    END IF;
    RETURN QUERY
      SELECT DISTINCT p.id
      FROM public.properties p
      JOIN public.geo_places g ON g.id = ANY(v_locality)
      WHERE p.geom_exact IS NOT NULL
        AND ST_DWithin(p.geom_exact::geography, g.representative_point::geography, (p_distance_km * 1000.0)::float8);
    RETURN;
  END IF;

  v_has_root   := (array_length(v_direct_settlements, 1) IS NOT NULL OR array_length(v_selected_regions, 1) IS NOT NULL);
  v_has_detail := array_length(v_detail, 1) IS NOT NULL;

  IF v_has_root THEN
    -- Root match set: direct settlement (ANY assoc) OR region rule A (primary member) OR region rule B (primary == region).
    v_root_props := ARRAY(
      SELECT a.property_id FROM public.property_geo_associations a
      WHERE a.relationship IS NULL
        AND (
          a.geo_place_id = ANY(v_direct_settlements)
          OR (a.is_primary AND a.geo_place_id = ANY(v_members))
          OR (a.is_primary AND a.geo_place_id = ANY(v_selected_regions))
        )
    );
  END IF;

  IF v_has_root AND v_has_detail THEN
    RETURN QUERY
      SELECT DISTINCT rp AS property_id
      FROM unnest(v_root_props) rp
      WHERE rp IN (
        SELECT a.property_id FROM public.property_geo_associations a
        WHERE a.relationship IS NULL AND a.geo_place_id = ANY(v_detail)
      );
  ELSIF v_has_root THEN
    RETURN QUERY SELECT DISTINCT rp FROM unnest(v_root_props) rp;
  ELSE
    RETURN QUERY
      SELECT DISTINCT a.property_id FROM public.property_geo_associations a
      WHERE a.relationship IS NULL AND a.geo_place_id = ANY(v_detail);
  END IF;
  RETURN;
END;
$function$;

-- ============================================================
-- Step 6 — reeve_search_geo_suggest (region-first ranking; locality-only parent traversal)
--   Preserves: signature, STABLE, SECURITY DEFINER, search_path, grants (CREATE OR REPLACE).
-- ============================================================
CREATE OR REPLACE FUNCTION public.reeve_search_geo_suggest(p_query text, p_kinds text[] DEFAULT NULL::text[], p_parent_geo_place_id uuid DEFAULT NULL::uuid, p_search_region_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, display_name text, kind text, settlement_subtype text, parent_geo_place_id uuid, parent_display_name text, search_region_id uuid, search_region_display_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q     text := lower(btrim(coalesce(p_query, '')));
  v_lim   integer := least(greatest(coalesce(p_limit, 10), 1), 20);
  v_kinds text[];
BEGIN
  IF v_q = '' THEN RETURN; END IF;

  v_kinds := ARRAY(
    SELECT k FROM unnest(coalesce(p_kinds, ARRAY['search_region','settlement','locality','road'])) AS k
    WHERE k IN ('search_region','settlement','locality','road')
  );
  IF array_length(v_kinds, 1) IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH matched AS (
    SELECT g.id, g.display_name, g.kind, g.settlement_subtype,
           g.parent_geo_place_id, g.search_region_id,
           -- Best (lowest) rank across canonical name AND aliases, so an exact alias
           -- (e.g. "bangalore" -> the Bengaluru region) ranks like an exact canonical name.
           LEAST(
             CASE WHEN g.normalized_name = v_q THEN 0
                  WHEN g.normalized_name LIKE v_q || '%' THEN 1
                  ELSE 2 END,
             COALESCE((
               SELECT MIN(CASE WHEN al.normalized_alias = v_q THEN 0
                               WHEN al.normalized_alias LIKE v_q || '%' THEN 1
                               ELSE 2 END)
               FROM public.geo_place_aliases al
               WHERE al.geo_place_id = g.id
                 AND al.normalized_alias LIKE '%' || v_q || '%'), 2)
           ) AS rank
    FROM public.geo_places g
    WHERE g.kind = ANY(v_kinds)
      AND (p_parent_geo_place_id IS NULL OR g.parent_geo_place_id = p_parent_geo_place_id)
      -- Region scope: a locality also qualifies through its parent settlement's membership;
      -- a road qualifies ONLY through its own reconciled search_region_id (never a member parent).
      AND (p_search_region_id IS NULL
           OR g.search_region_id = p_search_region_id
           OR (g.kind = 'locality'
               AND EXISTS (SELECT 1 FROM public.geo_places par
                           WHERE par.id = g.parent_geo_place_id
                             AND par.kind = 'settlement'
                             AND par.search_region_id = p_search_region_id)))
      AND (
        g.normalized_name LIKE '%' || v_q || '%'
        OR EXISTS (
          SELECT 1 FROM public.geo_place_aliases al
          WHERE al.geo_place_id = g.id AND al.normalized_alias LIKE '%' || v_q || '%'
        )
      )
  ),
  deduped AS (
    SELECT m.id, m.display_name, m.kind, m.settlement_subtype, m.parent_geo_place_id, m.search_region_id, m.rank
    FROM (
      SELECT m.*, row_number() OVER (PARTITION BY m.id ORDER BY m.rank, m.display_name) AS rn
      FROM matched m
    ) m
    WHERE m.rn = 1
  )
  SELECT d.id, d.display_name, d.kind, d.settlement_subtype,
         d.parent_geo_place_id, par.display_name AS parent_display_name,
         d.search_region_id, sr.display_name AS search_region_display_name
  FROM deduped d
  LEFT JOIN public.geo_places par ON par.id = d.parent_geo_place_id
  LEFT JOIN public.geo_places sr  ON sr.id  = d.search_region_id
  -- Region ranked ahead of a same-rank same-name settlement so the marketplace root wins.
  ORDER BY d.rank, d.display_name,
           CASE d.kind WHEN 'search_region' THEN 0 WHEN 'settlement' THEN 1 WHEN 'locality' THEN 2 ELSE 3 END
  LIMIT v_lim;
END;
$function$;

-- ============================================================
-- Step 7 — reeve_reconcile_road_search_region (ambiguity-safe, set-based)
--   A road receives a region ONLY when every associated property has exactly one primary root
--   (settlement → its region, or search_region → itself), all non-null, and all identical.
--   Missing OR conflicting evidence → NULL. Row-locked for concurrency safety.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reeve_reconcile_road_search_region(p_road_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_n        integer;
  v_bad      integer;
  v_distinct integer;
  v_region   uuid;
BEGIN
  -- Lock the road row (also guards kind='road').
  PERFORM 1 FROM public.geo_places WHERE id = p_road_id AND kind = 'road' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  WITH road_props AS (
    SELECT DISTINCT ra.property_id
    FROM public.property_geo_associations ra
    WHERE ra.geo_place_id = p_road_id AND ra.relationship IS NULL
  ),
  per_prop AS (
    SELECT
      rp.property_id,
      (SELECT count(*) FROM public.property_geo_associations pa
         JOIN public.geo_places s ON s.id = pa.geo_place_id
        WHERE pa.property_id = rp.property_id AND pa.is_primary AND pa.relationship IS NULL
          AND s.kind IN ('settlement','search_region')) AS primary_root_count,
      (SELECT CASE WHEN s.kind = 'search_region' THEN s.id ELSE s.search_region_id END
         FROM public.property_geo_associations pa
         JOIN public.geo_places s ON s.id = pa.geo_place_id
        WHERE pa.property_id = rp.property_id AND pa.is_primary AND pa.relationship IS NULL
          AND s.kind IN ('settlement','search_region')
        LIMIT 1) AS region
    FROM road_props rp
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE primary_root_count <> 1 OR region IS NULL),
    count(DISTINCT region),
    -- No max(uuid) aggregate exists; the value is only used when count(DISTINCT region)=1 AND bad=0.
    (array_agg(DISTINCT region) FILTER (WHERE region IS NOT NULL))[1]
  INTO v_n, v_bad, v_distinct, v_region
  FROM per_prop;

  IF v_n > 0 AND v_bad = 0 AND v_distinct = 1 THEN
    UPDATE public.geo_places SET search_region_id = v_region
      WHERE id = p_road_id AND search_region_id IS DISTINCT FROM v_region;
  ELSE
    UPDATE public.geo_places SET search_region_id = NULL
      WHERE id = p_road_id AND search_region_id IS NOT NULL;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.reeve_reconcile_road_search_region(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reeve_reconcile_road_search_region(uuid) TO service_role, postgres;

-- ============================================================
-- Step 8 — Backfill existing roads via the reconciler (same ambiguity-safe rule)
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.geo_places WHERE kind = 'road' LOOP
    PERFORM public.reeve_reconcile_road_search_region(r.id);
  END LOOP;
END $$;

-- ============================================================
-- Step 9 — admin_set_settlement_search_region (minimal admin/system-only maintenance)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_set_settlement_search_region(p_settlement_id uuid, p_search_region_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_kind       text;
  v_current    uuid;
  v_is_service boolean;
  r            record;
BEGIN
  -- Authorization: admin (auth.uid()) OR trusted service_role JWT (request-scoped claims, not current_user).
  v_is_service := coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role',
    false);
  IF NOT (public.is_admin() OR v_is_service) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Validate + lock the source settlement BEFORE reading its region / conflict check.
  SELECT kind, search_region_id INTO v_kind, v_current
    FROM public.geo_places WHERE id = p_settlement_id FOR UPDATE;
  IF NOT FOUND OR v_kind <> 'settlement' THEN RAISE EXCEPTION 'invalid_settlement'; END IF;

  IF p_search_region_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.geo_places WHERE id = p_search_region_id AND kind = 'search_region') THEN
      RAISE EXCEPTION 'invalid_search_region';
    END IF;
  END IF;

  -- No silent overwrite of a conflicting non-null mapping.
  IF v_current IS NOT NULL AND p_search_region_id IS NOT NULL AND v_current <> p_search_region_id THEN
    RAISE EXCEPTION 'region_conflict';
  END IF;

  IF v_current IS DISTINCT FROM p_search_region_id THEN
    UPDATE public.geo_places SET search_region_id = p_search_region_id WHERE id = p_settlement_id;
  END IF;

  -- Re-reconcile roads whose properties are primarily anchored to this settlement.
  FOR r IN
    SELECT DISTINCT ra.geo_place_id AS road_id
    FROM public.property_geo_associations pa
    JOIN public.property_geo_associations ra ON ra.property_id = pa.property_id AND ra.relationship IS NULL
    JOIN public.geo_places rg ON rg.id = ra.geo_place_id AND rg.kind = 'road'
    WHERE pa.geo_place_id = p_settlement_id AND pa.is_primary AND pa.relationship IS NULL
  LOOP
    PERFORM public.reeve_reconcile_road_search_region(r.road_id);
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_settlement_search_region(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_settlement_search_region(uuid, uuid) TO authenticated, service_role, postgres;
