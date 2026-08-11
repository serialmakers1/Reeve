-- Prompt 3 — canonical Search location helper (single source of truth for list + map).
--
-- reeve_search_property_ids returns the DEDUPED set of property ids matching the location
-- contract, from property_geo_associations (canonical city/area membership) + earthdistance
-- (explicit distance / Auto safety-net). Owner-only EXECUTE — called by the v2 SECURITY
-- DEFINER search RPCs (which run as owner). Anchors carry {place_id, lat, lng}: place_ids
-- drive association matching; lat/lng drive distance anchoring only.

-- Safety-net threshold (ONE constant). Empirically chosen from real Google-Maps centers via
-- earthdistance: Whitefield↔Brookefield = 3520 m and ↔Kadugodi = 3129 m (adjacent naming
-- neighbours — must be captured); ↔Marathahalli = 5829 m, ↔Indiranagar = 11.8 km, ↔HSR =
-- 13.1 km (distinct areas — must be excluded). 4000 m is the smallest round value that
-- captures the intended neighbours with margin while excluding the next distinct area.
CREATE OR REPLACE FUNCTION public.reeve_search_safety_net_m()
  RETURNS double precision LANGUAGE sql IMMUTABLE AS $$ SELECT 4000.0::double precision $$;

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
  -- Explicit distance: geographic radius that MAY cross city boundaries (city gate dropped).
  -- Anchors = area anchors if any, else city anchors. Union of per-anchor circles, deduped.
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

  -- Auto + areas: (exact area_road association OR within safety-net of an area anchor),
  -- gated by city association when a city is selected.
  IF v_has_area THEN
    RETURN QUERY
      SELECT DISTINCT cand.property_id FROM (
        SELECT a.property_id FROM public.property_geo_associations a
          JOIN public.geo_places g ON g.id=a.geo_place_id
          WHERE a.relationship='area_road' AND g.place_id = ANY(v_area_ids)
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
          WHERE a.relationship IN ('primary_city','secondary_city') AND g.place_id = ANY(v_city_ids)
      );
    RETURN;
  END IF;

  -- Auto, city only: canonical primary/secondary city association membership.
  IF v_has_city THEN
    RETURN QUERY
      SELECT DISTINCT a.property_id FROM public.property_geo_associations a
        JOIN public.geo_places g ON g.id=a.geo_place_id
        WHERE a.relationship IN ('primary_city','secondary_city') AND g.place_id = ANY(v_city_ids);
    RETURN;
  END IF;

  -- No usable geo filter: return nothing (the v2 RPCs bypass this helper entirely in that case).
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.reeve_search_safety_net_m() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reeve_search_property_ids(jsonb,jsonb,numeric) FROM PUBLIC, anon, authenticated;
