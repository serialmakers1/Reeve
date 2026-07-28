BEGIN;

DROP FUNCTION IF EXISTS public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric,
  text[], numeric, numeric, integer
);

CREATE OR REPLACE FUNCTION public.get_map_markers(
  p_listing_type property_listing_type,
  p_city text,
  p_sw_lat numeric,
  p_sw_lng numeric,
  p_ne_lat numeric,
  p_ne_lng numeric,
  p_bhk text[] DEFAULT '{}'::text[],
  p_min_price numeric DEFAULT NULL::numeric,
  p_max_price numeric DEFAULT NULL::numeric,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  property_id uuid,
  latitude numeric,
  longitude numeric,
  location_mode text,
  price_kind text,
  price_amount numeric,
  listing_type text,
  building_name text,
  match_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_center_lat float8 := ((p_sw_lat + p_ne_lat) / 2.0)::float8;
  v_center_lng float8 := ((p_sw_lng + p_ne_lng) / 2.0)::float8;
  v_radius_m   float8;
BEGIN
  IF p_city IS NULL OR trim(p_city) = '' THEN
    RAISE EXCEPTION 'invalid_input'
      USING DETAIL = 'p_city is required.';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN
    p_limit := 200;
  END IF;

  v_radius_m := GREATEST(
    earth_distance(
      ll_to_earth(v_center_lat, v_center_lng),
      ll_to_earth(p_sw_lat::float8, p_sw_lng::float8)
    ),
    earth_distance(
      ll_to_earth(v_center_lat, v_center_lng),
      ll_to_earth(p_sw_lat::float8, p_ne_lng::float8)
    ),
    earth_distance(
      ll_to_earth(v_center_lat, v_center_lng),
      ll_to_earth(p_ne_lat::float8, p_sw_lng::float8)
    ),
    earth_distance(
      ll_to_earth(v_center_lat, v_center_lng),
      ll_to_earth(p_ne_lat::float8, p_ne_lng::float8)
    )
  );

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id,
      p.latitude,
      p.longitude,
      p.listing_type::text,
      p.building_name::text,
      CASE
        WHEN p.address_mode = 'google_place' THEN 'exact'
        WHEN p.address_mode = 'manual' THEN 'approximate'
        ELSE NULL
      END AS resolved_location_mode,
      CASE
        WHEN p.listing_type = 'rent' AND p.listed_rent = 0
          THEN NULL
        WHEN p.listing_type = 'rent'
             AND p.maintenance_included_in_rent = true
          THEN 'rent_total'
        WHEN p.listing_type = 'rent'
             AND p.maintenance_included_in_rent = false
             AND p.society_maintenance_approx IS NOT NULL
          THEN 'rent_total'
        WHEN p.listing_type = 'rent'
          THEN 'rent_monthly'
        WHEN p.listing_type = 'sale'
             AND p.sale_price IS NOT NULL
          THEN 'sale'
        ELSE NULL
      END AS resolved_price_kind,
      CASE
        WHEN p.listing_type = 'rent' AND p.listed_rent = 0
          THEN NULL
        WHEN p.listing_type = 'rent'
             AND p.maintenance_included_in_rent = true
          THEN p.listed_rent
        WHEN p.listing_type = 'rent'
             AND p.maintenance_included_in_rent = false
             AND p.society_maintenance_approx IS NOT NULL
          THEN p.listed_rent + p.society_maintenance_approx
        WHEN p.listing_type = 'rent'
          THEN p.listed_rent
        WHEN p.listing_type = 'sale'
          THEN p.sale_price
        ELSE NULL
      END AS resolved_price_amount
    FROM public.properties p
    WHERE
      p.status IN ('listed', 'edit_pending_review')
      AND p.is_active = true
      AND p.listing_type = p_listing_type
      AND lower(p.city) = lower(p_city)
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL

      AND earth_box(
        ll_to_earth(v_center_lat, v_center_lng),
        v_radius_m
      ) @> ll_to_earth(
        p.latitude::float8,
        p.longitude::float8
      )

      AND p.latitude BETWEEN p_sw_lat AND p_ne_lat
      AND p.longitude BETWEEN p_sw_lng AND p_ne_lng

      AND (
        array_length(p_bhk, 1) IS NULL
        OR p.bhk::text = ANY(p_bhk)
      )
  )
  SELECT
    base.id,
    base.latitude,
    base.longitude,
    base.resolved_location_mode,
    base.resolved_price_kind,
    base.resolved_price_amount,
    base.listing_type,
    base.building_name,
    1::integer AS match_count
  FROM base
  WHERE
    (
      p_min_price IS NULL
      OR base.resolved_price_amount >= p_min_price
    )
    AND (
      p_max_price IS NULL
      OR base.resolved_price_amount <= p_max_price
    )
  LIMIT p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric,
  text[], numeric, numeric, integer
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric,
  text[], numeric, numeric, integer
) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric,
  text[], numeric, numeric, integer
) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
