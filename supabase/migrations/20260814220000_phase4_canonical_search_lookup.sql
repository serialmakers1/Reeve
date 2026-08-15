-- Phase 4 · Prompt 2 (Migration A) — public canonical Search lookup.
--
-- Anonymous Search visitors must be able to search/hydrate Reeve canonical geography WITHOUT direct
-- SELECT on geo_places/geo_place_aliases (RLS = auth.uid() IS NOT NULL). These two narrow
-- SECURITY DEFINER RPCs are the ONLY public surface; no table grants / RLS are widened.
-- Returned fields are the public Search taxonomy only — no provider/google ids, no coordinates,
-- no evidence/confidence, no property associations. Only the four FINAL kinds are ever returned.

-- ── Suggestion: search canonical names + aliases, one row per canonical UUID ──
CREATE OR REPLACE FUNCTION public.reeve_search_geo_suggest(
  p_query text,
  p_kinds text[] DEFAULT NULL,
  p_parent_geo_place_id uuid DEFAULT NULL,
  p_search_region_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid, display_name text, kind text, settlement_subtype text,
  parent_geo_place_id uuid, parent_display_name text,
  search_region_id uuid, search_region_display_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q     text := lower(btrim(coalesce(p_query, '')));
  v_lim   integer := least(greatest(coalesce(p_limit, 10), 1), 20);
  v_kinds text[];
BEGIN
  -- Blank query never dumps geography.
  IF v_q = '' THEN RETURN; END IF;

  -- Restrict to the FINAL Search kinds; a caller may narrow further but never widen to legacy kinds.
  v_kinds := ARRAY(
    SELECT k FROM unnest(coalesce(p_kinds, ARRAY['search_region','settlement','locality','road'])) AS k
    WHERE k IN ('search_region','settlement','locality','road')
  );
  IF array_length(v_kinds, 1) IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH matched AS (
    SELECT g.id, g.display_name, g.kind, g.settlement_subtype,
           g.parent_geo_place_id, g.search_region_id,
           CASE WHEN g.normalized_name = v_q THEN 0
                WHEN g.normalized_name LIKE v_q || '%' THEN 1
                ELSE 2 END AS rank
    FROM public.geo_places g
    WHERE g.kind = ANY(v_kinds)
      AND (p_parent_geo_place_id IS NULL OR g.parent_geo_place_id = p_parent_geo_place_id)
      AND (p_search_region_id IS NULL OR g.search_region_id = p_search_region_id)
      AND (
        g.normalized_name LIKE '%' || v_q || '%'
        OR EXISTS (
          SELECT 1 FROM public.geo_place_aliases al
          WHERE al.geo_place_id = g.id AND al.normalized_alias LIKE '%' || v_q || '%'
        )
      )
  ),
  deduped AS (
    -- One row per canonical UUID, keeping its best (lowest) rank.
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
  ORDER BY d.rank, d.display_name
  LIMIT v_lim;
END;
$function$;

-- ── Hydration: resolve canonical UUIDs back to public tokens (URL restore). Never text→canonical. ──
CREATE OR REPLACE FUNCTION public.reeve_search_geo_by_ids(p_ids uuid[])
RETURNS TABLE(
  id uuid, display_name text, kind text, settlement_subtype text,
  parent_geo_place_id uuid, parent_display_name text,
  search_region_id uuid, search_region_display_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT g.id, g.display_name, g.kind, g.settlement_subtype,
         g.parent_geo_place_id, par.display_name AS parent_display_name,
         g.search_region_id, sr.display_name AS search_region_display_name
  FROM public.geo_places g
  LEFT JOIN public.geo_places par ON par.id = g.parent_geo_place_id
  LEFT JOIN public.geo_places sr  ON sr.id  = g.search_region_id
  WHERE g.id = ANY(coalesce(p_ids, '{}'::uuid[]))
    AND g.kind IN ('search_region','settlement','locality','road');
END;
$function$;

-- Public Search surface: anon + authenticated may EXECUTE; canonical tables stay locked.
REVOKE ALL ON FUNCTION public.reeve_search_geo_suggest(text, text[], uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reeve_search_geo_suggest(text, text[], uuid, uuid, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.reeve_search_geo_by_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reeve_search_geo_by_ids(uuid[]) TO anon, authenticated, service_role;
