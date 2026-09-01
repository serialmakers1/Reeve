-- Phase 3: inventory-aware, mode-aware geography availability
--
-- reeve_geo_ids_with_inventory returns the subset of candidate geo_place UUIDs that have >=1
-- PUBLIC property for the requested listing type, reusing the Phase-2 geography matcher
-- reeve_search_property_ids_v2 as the SOLE semantic (no second algorithm to drift):
--   * root / Popular candidate  -> anchor [candidate]            (v2 root-only branch)
--   * Area detail under a root   -> anchor [root, candidate]     (v2 root+detail branch => "root AND detail")
--
-- Public inventory = status IN ('listed','edit_pending_review') AND is_active=true.
-- Availability ignores price/BHK/furnishing/type and every other filter.
-- Returns geo UUIDs only (no property PII); does not widen the public property allow-list/RLS.
-- reeve_search_geo_suggest / reeve_search_geo_by_ids stay inventory-INDEPENDENT (unchanged).
--
-- search_path: kept 'public' for consistency with the sibling SECURITY DEFINER geo functions
-- (reeve_search_geo_suggest, reeve_reconcile_road_search_region, admin_set_settlement_search_region)
-- AND every object + the enum type is schema-qualified (untrusted roles cannot CREATE in public on
-- Supabase). Deliberately NOT set to '' (project convention forbids setting it mechanically).

CREATE OR REPLACE FUNCTION public.reeve_geo_ids_with_inventory(
  p_geo_place_ids uuid[],
  p_listing_type public.property_listing_type,
  p_root_geo_place_id uuid DEFAULT NULL
)
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_root uuid;
BEGIN
  -- Abuse guard: this RPC is anon/authenticated-callable; never trust the frontend suggest limit.
  -- 50 covers typed suggestions (<=20) plus Recent/Popular batches with headroom. UI fail-opens.
  IF cardinality(coalesce(p_geo_place_ids, '{}'::uuid[])) > 50 THEN
    RAISE EXCEPTION 'too_many_candidates';
  END IF;

  -- Optional root: must be a real settlement/search_region when supplied. Do NOT downgrade an
  -- invalid root to a detail-only [detail] test (that would report "available somewhere" and break
  -- the root AND detail guarantee). Raise a stable error; the UI fail-opens on it.
  IF p_root_geo_place_id IS NOT NULL THEN
    SELECT g.id INTO v_root
      FROM public.geo_places g
     WHERE g.id = p_root_geo_place_id AND g.kind IN ('settlement','search_region');
    IF v_root IS NULL THEN RAISE EXCEPTION 'invalid_root'; END IF;
  END IF;

  RETURN QUERY
  SELECT c.cid
  FROM (
    -- Pre-validate candidates to final geography kinds; bad/nonexistent ids are dropped so a
    -- single bad id can never make reeve_search_property_ids_v2 raise invalid_anchor.
    SELECT DISTINCT g.id AS cid, g.kind
    FROM public.geo_places g
    WHERE g.id = ANY(coalesce(p_geo_place_ids, '{}'::uuid[]))
      AND g.kind IN ('search_region','settlement','locality','road')
  ) c
  WHERE EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.status IN ('listed','edit_pending_review')
      AND p.is_active
      AND p.listing_type = p_listing_type
      AND p.id IN (
        SELECT public.reeve_search_property_ids_v2(
          CASE
            WHEN v_root IS NOT NULL AND c.kind IN ('locality','road')
              THEN ARRAY[v_root, c.cid]
            ELSE ARRAY[c.cid]
          END,
          NULL)
      )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reeve_geo_ids_with_inventory(uuid[], public.property_listing_type, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reeve_geo_ids_with_inventory(uuid[], public.property_listing_type, uuid)
  TO anon, authenticated, service_role;
