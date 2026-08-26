-- Group 1 · Phase 1: search_compact_properties_v4
-- Removes from v3: total_count window function, p_min_response_rate filter,
-- p_has_experience_feedback filter + interaction_ratings lateral subquery.
-- v3 is NOT dropped — it remains available for rollback.

CREATE OR REPLACE FUNCTION public.search_compact_properties_v4(
  p_listing_type property_listing_type,
  p_property_type text DEFAULT NULL::text,
  p_bhk text[] DEFAULT '{}'::text[],
  p_furnishing text[] DEFAULT '{}'::text[],
  p_min_price numeric DEFAULT NULL::numeric,
  p_max_price numeric DEFAULT NULL::numeric,
  p_available_by date DEFAULT NULL::date,
  p_listed_within_days integer DEFAULT NULL::integer,
  p_availability_confirmed_within_days integer DEFAULT NULL::integer,
  p_max_deposit numeric DEFAULT NULL::numeric,
  p_max_lock_in_months integer DEFAULT NULL::integer,
  p_max_notice_days integer DEFAULT NULL::integer,
  p_max_annual_increase numeric DEFAULT NULL::numeric,
  p_max_move_in_charges numeric DEFAULT NULL::numeric,
  p_pet_policy text[] DEFAULT '{}'::text[],
  p_possession_status text[] DEFAULT '{}'::text[],
  p_possession_before date DEFAULT NULL::date,
  p_negotiable boolean DEFAULT NULL::boolean,
  p_min_carpet_area numeric DEFAULT NULL::numeric,
  p_max_carpet_area numeric DEFAULT NULL::numeric,
  p_min_super_built_up numeric DEFAULT NULL::numeric,
  p_max_super_built_up numeric DEFAULT NULL::numeric,
  p_parking_4w text[] DEFAULT '{}'::text[],
  p_parking_2w text[] DEFAULT '{}'::text[],
  p_amenities text[] DEFAULT '{}'::text[],
  p_has_video_walkthrough boolean DEFAULT NULL::boolean,
  p_sort text DEFAULT 'newest'::text,
  p_cursor_listed_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_cursor_id uuid DEFAULT NULL::uuid,
  p_cursor_availability_confirmed_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_cursor_price_amount numeric DEFAULT NULL::numeric,
  p_limit integer DEFAULT 20,
  p_zero_rent_brokerage boolean DEFAULT NULL::boolean,
  p_max_rent_brokerage_fixed numeric DEFAULT NULL::numeric,
  p_max_sale_brokerage_pct numeric DEFAULT NULL::numeric,
  p_rera_disclosed boolean DEFAULT NULL::boolean,
  p_khata_type text[] DEFAULT '{}'::text[],
  p_property_tax_paid boolean DEFAULT NULL::boolean,
  p_geo_place_ids uuid[] DEFAULT '{}'::uuid[],
  p_distance_km numeric DEFAULT NULL::numeric
)
RETURNS TABLE(
  property_id uuid,
  listing_type text,
  property_type text,
  bhk text,
  owner_id uuid,
  primary_image_url text,
  photo_count integer,
  price_kind text,
  price_amount numeric,
  building_name text,
  locality text,
  city text,
  location_mode text,
  latitude numeric,
  longitude numeric,
  carpet_area_sqft numeric,
  super_built_up_sqft numeric,
  furnishing text,
  bathrooms smallint,
  floor_number smallint,
  total_floors smallint,
  parking_4w text,
  parking_2w text,
  parking_4w_count integer,
  parking_2w_count integer,
  building_age_years smallint,
  possession_status text,
  possession_date date,
  lister_role text,
  response_handled_count integer,
  response_rate_pct numeric,
  listed_at timestamp with time zone,
  availability_confirmed_at timestamp with time zone,
  rent_brokerage_type text,
  rent_brokerage_fixed_amount numeric,
  rent_brokerage_months numeric,
  sale_brokerage_pct numeric,
  security_deposit_amount numeric,
  lock_in_months integer,
  notice_period_days integer,
  pet_policy text,
  youtube_walkthrough_url text,
  price_negotiable boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_sort NOT IN ('newest','availability_confirmed','price_asc','price_desc') THEN
    RAISE EXCEPTION 'invalid_sort' USING DETAIL = format('Unknown sort value: %s', p_sort);
  END IF;
  -- Allow up to 21: client sends SEARCH_PAGE_SIZE+1 (21) as the hasNextPage lookahead row.
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 21 THEN p_limit := 20; END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id AS property_id, p.listing_type::text AS listing_type, p.property_type::text AS property_type,
      p.bhk::text AS bhk, p.owner_id AS owner_id, p.building_name::text AS building_name,
      p.locality::text AS locality, p.city::text AS city, p.latitude AS latitude, p.longitude AS longitude,
      p.square_footage AS carpet_area_sqft, p.super_built_up_area AS super_built_up_sqft,
      p.furnishing::text AS furnishing, p.bathrooms AS bathrooms, p.floor_number AS floor_number,
      p.total_floors AS total_floors, p.parking_4w::text AS parking_4w, p.parking_2w::text AS parking_2w,
      p.parking_4w_count AS parking_4w_count, p.parking_2w_count AS parking_2w_count,
      p.building_age_years AS building_age_years, p.possession_status AS possession_status,
      p.possession_date AS possession_date, p.lister_role AS lister_role,
      p.listed_at AS listed_at, p.availability_confirmed_at AS availability_confirmed_at,
      p.rent_brokerage_type AS rent_brokerage_type, p.rent_brokerage_fixed_amount AS rent_brokerage_fixed_amount,
      p.rent_brokerage_months AS rent_brokerage_months, p.sale_brokerage_pct AS sale_brokerage_pct,
      p.security_deposit_amount AS security_deposit_amount, p.lock_in_months AS lock_in_months,
      p.notice_period_days AS notice_period_days, p.pet_policy AS pet_policy,
      p.youtube_walkthrough_url AS youtube_walkthrough_url, p.price_negotiable AS price_negotiable,
      CASE WHEN p.listing_type='rent' AND p.listed_rent=0 THEN NULL
           WHEN p.listing_type='rent' AND p.maintenance_included_in_rent=true THEN 'rent_total'
           WHEN p.listing_type='rent' AND p.maintenance_included_in_rent=false AND p.society_maintenance_approx IS NOT NULL THEN 'rent_total'
           WHEN p.listing_type='rent' THEN 'rent_monthly'
           WHEN p.listing_type='sale' AND p.sale_price IS NOT NULL THEN 'sale'
           ELSE NULL END AS resolved_price_kind,
      CASE WHEN p.listing_type='rent' AND p.listed_rent=0 THEN NULL
           WHEN p.listing_type='rent' AND p.maintenance_included_in_rent=true THEN p.listed_rent
           WHEN p.listing_type='rent' AND p.maintenance_included_in_rent=false AND p.society_maintenance_approx IS NOT NULL THEN p.listed_rent+p.society_maintenance_approx
           WHEN p.listing_type='rent' THEN p.listed_rent
           WHEN p.listing_type='sale' THEN p.sale_price
           ELSE NULL END AS resolved_price_amount,
      CASE WHEN p.address_mode='google_place' THEN 'exact'
           WHEN p.address_mode='manual' THEN 'approximate'
           ELSE NULL END AS resolved_location_mode,
      (SELECT pi.url FROM public.property_images pi WHERE pi.property_id=p.id AND pi.is_primary=true AND pi.is_floor_plan=false LIMIT 1) AS primary_image_url,
      (SELECT COUNT(*)::integer FROM public.property_images pi WHERE pi.property_id=p.id AND pi.is_floor_plan=false) AS photo_count,
      (SELECT COUNT(*)::integer FROM public.contact_requests cr WHERE cr.owner_id=p.owner_id AND cr.status NOT IN ('withdrawn','auto_cancelled')) AS response_handled_count,
      (SELECT ROUND(COUNT(*) FILTER (WHERE cr.status IN ('approved','declined'))::numeric/NULLIF(COUNT(*) FILTER (WHERE cr.status NOT IN ('withdrawn','auto_cancelled')),0)*100) FROM public.contact_requests cr WHERE cr.owner_id=p.owner_id) AS response_rate_pct
    FROM public.properties p
    WHERE p.status IN ('listed','edit_pending_review') AND p.is_active=true AND p.listing_type=p_listing_type
      AND ((coalesce(array_length(p_geo_place_ids,1),0)=0 AND p_distance_km IS NULL)
           OR p.id IN (SELECT public.reeve_search_property_ids_v2(p_geo_place_ids, p_distance_km)))
      AND (p_property_type IS NULL OR (btrim(coalesce(p_property_type,'')) = '' OR p.property_type::text = ANY(string_to_array(p_property_type, ','))))
      AND (array_length(p_bhk,1) IS NULL OR p.bhk::text=ANY(p_bhk))
      AND (array_length(p_furnishing,1) IS NULL OR p.furnishing::text=ANY(p_furnishing))
      AND (p_available_by IS NULL OR p.available_from IS NULL OR p.available_from<=p_available_by)
      AND (p_listed_within_days IS NULL OR p.listed_at>=now()-(p_listed_within_days*interval '1 day'))
      AND (p_availability_confirmed_within_days IS NULL OR p.availability_confirmed_at>=now()-(p_availability_confirmed_within_days*interval '1 day'))
      AND (p_max_deposit IS NULL OR p.security_deposit_amount IS NULL OR p.security_deposit_amount<=p_max_deposit)
      AND (p_max_lock_in_months IS NULL OR p.lock_in_months IS NULL OR p.lock_in_months<=p_max_lock_in_months)
      AND (p_max_notice_days IS NULL OR p.notice_period_days IS NULL OR p.notice_period_days<=p_max_notice_days)
      AND (p_max_annual_increase IS NULL OR p.annual_rent_increase_pct IS NULL OR p.annual_rent_increase_pct<=p_max_annual_increase)
      AND (p_max_move_in_charges IS NULL OR p.move_in_charges_amount IS NULL OR p.move_in_charges_amount<=p_max_move_in_charges)
      AND (array_length(p_pet_policy,1) IS NULL OR p.pet_policy=ANY(p_pet_policy))
      AND (array_length(p_possession_status,1) IS NULL OR p.possession_status=ANY(p_possession_status))
      AND (p_possession_before IS NULL OR p.possession_date IS NULL OR p.possession_date<=p_possession_before)
      AND (p_negotiable IS NULL OR p.price_negotiable=p_negotiable)
      AND (p_min_carpet_area IS NULL OR p.square_footage IS NULL OR p.square_footage>=p_min_carpet_area)
      AND (p_max_carpet_area IS NULL OR p.square_footage IS NULL OR p.square_footage<=p_max_carpet_area)
      AND (p_min_super_built_up IS NULL OR p.super_built_up_area IS NULL OR p.super_built_up_area>=p_min_super_built_up)
      AND (p_max_super_built_up IS NULL OR p.super_built_up_area IS NULL OR p.super_built_up_area<=p_max_super_built_up)
      AND (array_length(p_parking_4w,1) IS NULL OR p.parking_4w::text=ANY(p_parking_4w))
      AND (array_length(p_parking_2w,1) IS NULL OR p.parking_2w::text=ANY(p_parking_2w))
      AND (array_length(p_amenities,1) IS NULL OR (SELECT bool_and(p.amenities ? elem) FROM unnest(p_amenities) AS elem))
      AND (p_has_video_walkthrough IS NULL OR (p_has_video_walkthrough=true AND p.youtube_walkthrough_url IS NOT NULL) OR (p_has_video_walkthrough=false AND p.youtube_walkthrough_url IS NULL))
      AND (p_listing_type <> 'rent' OR p_zero_rent_brokerage IS DISTINCT FROM TRUE OR p.rent_brokerage_type = 'none')
      AND (p_listing_type <> 'rent' OR p_max_rent_brokerage_fixed IS NULL OR (p.rent_brokerage_fixed_amount IS NOT NULL AND p.rent_brokerage_fixed_amount <= p_max_rent_brokerage_fixed))
      AND (p_listing_type <> 'sale' OR p_max_sale_brokerage_pct IS NULL OR (p.sale_brokerage_pct IS NOT NULL AND p.sale_brokerage_pct <= p_max_sale_brokerage_pct))
      AND (p_listing_type <> 'sale' OR p_rera_disclosed IS DISTINCT FROM TRUE OR NULLIF(btrim(p.rera_registration_number), '') IS NOT NULL)
      AND (p_listing_type <> 'sale' OR array_length(p_khata_type,1) IS NULL OR p.khata_type = ANY(p_khata_type))
      AND (p_listing_type <> 'sale' OR p_property_tax_paid IS DISTINCT FROM TRUE OR p.property_tax_paid_upto IS NOT NULL)
  ),
  filtered AS (
    SELECT base.*
    FROM base
    WHERE (p_min_price IS NULL OR base.resolved_price_amount>=p_min_price)
      AND (p_max_price IS NULL OR base.resolved_price_amount<=p_max_price)
  )
  SELECT
    filtered.property_id, filtered.listing_type, filtered.property_type, filtered.bhk, filtered.owner_id,
    filtered.primary_image_url, filtered.photo_count, filtered.resolved_price_kind, filtered.resolved_price_amount,
    filtered.building_name, filtered.locality, filtered.city, filtered.resolved_location_mode,
    filtered.latitude, filtered.longitude, filtered.carpet_area_sqft, filtered.super_built_up_sqft,
    filtered.furnishing, filtered.bathrooms, filtered.floor_number, filtered.total_floors,
    filtered.parking_4w, filtered.parking_2w, filtered.parking_4w_count, filtered.parking_2w_count,
    filtered.building_age_years, filtered.possession_status, filtered.possession_date,
    filtered.lister_role, filtered.response_handled_count, filtered.response_rate_pct,
    filtered.listed_at, filtered.availability_confirmed_at,
    filtered.rent_brokerage_type, filtered.rent_brokerage_fixed_amount, filtered.rent_brokerage_months,
    filtered.sale_brokerage_pct, filtered.security_deposit_amount, filtered.lock_in_months,
    filtered.notice_period_days, filtered.pet_policy, filtered.youtube_walkthrough_url, filtered.price_negotiable
  FROM filtered
  WHERE p_cursor_id IS NULL
    OR (p_sort='newest' AND (
        (p_cursor_listed_at IS NOT NULL AND (filtered.listed_at<p_cursor_listed_at OR (filtered.listed_at=p_cursor_listed_at AND filtered.property_id<p_cursor_id) OR filtered.listed_at IS NULL))
        OR (p_cursor_listed_at IS NULL AND filtered.listed_at IS NULL AND filtered.property_id<p_cursor_id)))
    OR (p_sort='availability_confirmed' AND (
        (p_cursor_availability_confirmed_at IS NOT NULL AND (filtered.availability_confirmed_at<p_cursor_availability_confirmed_at OR (filtered.availability_confirmed_at=p_cursor_availability_confirmed_at AND (filtered.listed_at<p_cursor_listed_at OR (filtered.listed_at=p_cursor_listed_at AND filtered.property_id<p_cursor_id) OR filtered.listed_at IS NULL)) OR filtered.availability_confirmed_at IS NULL))
        OR (p_cursor_availability_confirmed_at IS NULL AND filtered.availability_confirmed_at IS NULL AND (filtered.listed_at<p_cursor_listed_at OR (filtered.listed_at=p_cursor_listed_at AND filtered.property_id<p_cursor_id) OR filtered.listed_at IS NULL))))
    OR (p_sort='price_asc' AND (
        (p_cursor_price_amount IS NOT NULL AND (filtered.resolved_price_amount>p_cursor_price_amount OR (filtered.resolved_price_amount=p_cursor_price_amount AND (filtered.listed_at<p_cursor_listed_at OR (filtered.listed_at=p_cursor_listed_at AND filtered.property_id<p_cursor_id) OR filtered.listed_at IS NULL)) OR filtered.resolved_price_amount IS NULL))
        OR (p_cursor_price_amount IS NULL AND filtered.resolved_price_amount IS NULL AND (filtered.listed_at<p_cursor_listed_at OR (filtered.listed_at=p_cursor_listed_at AND filtered.property_id<p_cursor_id)))))
    OR (p_sort='price_desc' AND (
        (p_cursor_price_amount IS NOT NULL AND (filtered.resolved_price_amount<p_cursor_price_amount OR (filtered.resolved_price_amount=p_cursor_price_amount AND (filtered.listed_at<p_cursor_listed_at OR (filtered.listed_at=p_cursor_listed_at AND filtered.property_id<p_cursor_id) OR filtered.listed_at IS NULL)) OR filtered.resolved_price_amount IS NULL))
        OR (p_cursor_price_amount IS NULL AND filtered.resolved_price_amount IS NULL AND (filtered.listed_at<p_cursor_listed_at OR (filtered.listed_at=p_cursor_listed_at AND filtered.property_id<p_cursor_id)))))
  ORDER BY
    CASE WHEN p_sort='availability_confirmed' THEN filtered.availability_confirmed_at END DESC NULLS LAST,
    CASE WHEN p_sort='price_asc' THEN filtered.resolved_price_amount END ASC NULLS LAST,
    CASE WHEN p_sort='price_desc' THEN filtered.resolved_price_amount END DESC NULLS LAST,
    filtered.listed_at DESC NULLS LAST,
    filtered.property_id DESC
  LIMIT p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.search_compact_properties_v4(
  property_listing_type, text, text[], text[], numeric, numeric, date, integer, integer,
  numeric, integer, integer, numeric, numeric, text[], text[], date, boolean,
  numeric, numeric, numeric, numeric, text[], text[], text[], boolean,
  text, timestamptz, uuid, timestamptz, numeric, integer,
  boolean, numeric, numeric, boolean, text[], boolean, uuid[], numeric
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_compact_properties_v4(
  property_listing_type, text, text[], text[], numeric, numeric, date, integer, integer,
  numeric, integer, integer, numeric, numeric, text[], text[], date, boolean,
  numeric, numeric, numeric, numeric, text[], text[], text[], boolean,
  text, timestamptz, uuid, timestamptz, numeric, integer,
  boolean, numeric, numeric, boolean, text[], boolean, uuid[], numeric
) TO anon;

GRANT EXECUTE ON FUNCTION public.search_compact_properties_v4(
  property_listing_type, text, text[], text[], numeric, numeric, date, integer, integer,
  numeric, integer, integer, numeric, numeric, text[], text[], date, boolean,
  numeric, numeric, numeric, numeric, text[], text[], text[], boolean,
  text, timestamptz, uuid, timestamptz, numeric, integer,
  boolean, numeric, numeric, boolean, text[], boolean, uuid[], numeric
) TO authenticated;
