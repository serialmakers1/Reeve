-- Prompt 1 (geographic foundation) — canonical Google place entities.
--
-- geo_places holds verified Google entities (cities, areas, roads) referenced by
-- property_geo_associations. Rows are minted ONLY by the trusted server path
-- (Prompt-2 Edge Function → upsert_geo_place via service role). Owners can never
-- write here. Additive; nothing in the current app reads/writes this yet.

CREATE TABLE IF NOT EXISTS public.geo_places (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id     text NOT NULL UNIQUE,
  display_name text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('city', 'area', 'road')),
  center_lat   double precision NOT NULL,
  center_lng   double precision NOT NULL,
  bbox_ne_lat  double precision,
  bbox_ne_lng  double precision,
  bbox_sw_lat  double precision,
  bbox_sw_lng  double precision,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Coordinate validity.
  CONSTRAINT geo_places_center_range CHECK (
    center_lat >= -90 AND center_lat <= 90 AND center_lng >= -180 AND center_lng <= 180
  ),
  -- bbox is all-or-nothing, and south/west must not exceed north/east.
  CONSTRAINT geo_places_bbox_complete CHECK (
    num_nonnulls(bbox_ne_lat, bbox_ne_lng, bbox_sw_lat, bbox_sw_lng) IN (0, 4)
  ),
  CONSTRAINT geo_places_bbox_ordered CHECK (
    bbox_ne_lat IS NULL OR (
      bbox_sw_lat <= bbox_ne_lat AND bbox_sw_lng <= bbox_ne_lng
      AND bbox_ne_lat >= -90 AND bbox_ne_lat <= 90 AND bbox_sw_lat >= -90 AND bbox_sw_lat <= 90
      AND bbox_ne_lng >= -180 AND bbox_ne_lng <= 180 AND bbox_sw_lng >= -180 AND bbox_sw_lng <= 180
    )
  )
);

COMMENT ON TABLE public.geo_places IS
  'Canonical Google place entities (city/area/road). Minted only via trusted upsert_geo_place (service role). Never owner-writable.';

-- Reference data: authenticated may READ (search RPC is SECURITY DEFINER and reads regardless).
-- All DML is service-role only.
ALTER TABLE public.geo_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS geo_places_select ON public.geo_places;
CREATE POLICY geo_places_select ON public.geo_places
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- No INSERT/UPDATE/DELETE policies → authenticated/anon cannot write (RLS default-deny).
-- Belt-and-suspenders: revoke table DML from PUBLIC/anon/authenticated; service_role bypasses RLS.
REVOKE ALL ON TABLE public.geo_places FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.geo_places FROM anon, authenticated;
GRANT SELECT ON TABLE public.geo_places TO authenticated;
