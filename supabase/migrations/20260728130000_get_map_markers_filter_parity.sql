-- Migration: get_map_markers filter parity (Phase 10 Final)
-- Drops the old 10-argument overload and replaces with the 41-argument live definition.
-- DO NOT APPLY FROM CLAUDE CODE — already live in Supabase.

BEGIN;

-- ── Drop old 10-arg overload ──────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_map_markers(
  property_listing_type,
  text,
  numeric, numeric, numeric, numeric,
  text[],
  numeric, numeric,
  integer
);

-- ── Create 41-arg function (verbatim from pg_get_functiondef()) ───────────────
CREATE OR REPLACE FUNCTION public.get_map_markers(
  p_listing_type                      property_listing_type,
  p_city                              text,
  p_sw_lat                            numeric,
  p_sw_lng                            numeric,
  p_ne_lat                            numeric,
  p_ne_lng                            numeric,
  p_bhk                               text[]    DEFAULT '{}'::text[],
  p_min_price                         numeric   DEFAULT NULL::numeric,
  p_max_price                         numeric   DEFAULT NULL::numeric,
  p_limit                             integer   DEFAULT 200,
  p_location_ids                      text[]    DEFAULT '{}'::text[],
  p_property_type                     text      DEFAULT NULL::text,
  p_furnishing                        text[]    DEFAULT '{}'::text[],
  p_available_by                      date      DEFAULT NULL::date,
  p_listed_within_days                integer   DEFAULT NULL::integer,
  p_availability_confirmed_within_days integer  DEFAULT NULL::integer,
  p_max_deposit                       numeric   DEFAULT NULL::numeric,
  p_max_lock_in_months                integer   DEFAULT NULL::integer,
  p_max_notice_days                   integer   DEFAULT NULL::integer,
  p_max_annual_increase               numeric   DEFAULT NULL::numeric,
  p_max_move_in_charges               numeric   DEFAULT NULL::numeric,
  p_pet_policy                        text[]    DEFAULT '{}'::text[],
  p_possession_status                 text[]    DEFAULT '{}'::text[],
  p_possession_before                 date      DEFAULT NULL::date,
  p_negotiable                        boolean   DEFAULT NULL::boolean,
  p_min_carpet_area                   numeric   DEFAULT NULL::numeric,
  p_max_carpet_area                   numeric   DEFAULT NULL::numeric,
  p_min_super_built_up                numeric   DEFAULT NULL::numeric,
  p_max_super_built_up                numeric   DEFAULT NULL::numeric,
  p_parking_4w                        text[]    DEFAULT '{}'::text[],
  p_parking_2w                        text[]    DEFAULT '{}'::text[],
  p_amenities                         text[]    DEFAULT '{}'::text[],
  p_has_video_walkthrough             boolean   DEFAULT NULL::boolean,
  p_min_response_rate                 numeric   DEFAULT NULL::numeric,
  p_has_experience_feedback           boolean   DEFAULT NULL::boolean,
  p_zero_rent_brokerage               boolean   DEFAULT NULL::boolean,
  p_max_rent_brokerage_fixed          numeric   DEFAULT NULL::numeric,
  p_max_sale_brokerage_pct            numeric   DEFAULT NULL::numeric,
  p_rera_disclosed                    boolean   DEFAULT NULL::boolean,
  p_khata_type                        text[]    DEFAULT '{}'::text[],
  p_property_tax_paid                 boolean   DEFAULT NULL::boolean
)
RETURNS TABLE(
  property_id   uuid,
  latitude      numeric,
  longitude     numeric,
  location_mode text,
  price_kind    text,
  price_amount  numeric,
  listing_type  text,
  building_name text,
  match_count   integer
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
    RAISE EXCEPTION 'invalid_input' USING DETAIL = 'p_city is required.';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN p_limit := 200; END IF;

  v_radius_m := GREATEST(
    earth_distance(ll_to_earth(v_center_lat,v_center_lng),ll_to_earth(p_sw_lat::float8,p_sw_lng::float8)),
    earth_distance(ll_to_earth(v_center_lat,v_center_lng),ll_to_earth(p_sw_lat::float8,p_ne_lng::float8)),
    earth_distance(ll_to_earth(v_center_lat,v_center_lng),ll_to_earth(p_ne_lat::float8,p_sw_lng::float8)),
    earth_distance(ll_to_earth(v_center_lat,v_center_lng),ll_to_earth(p_ne_lat::float8,p_ne_lng::float8))
  );

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id,
      p.latitude,
      p.longitude,
      p.listing_type::text,
      p.building_name::text,
      p.owner_id,
      CASE
        WHEN p.address_mode = 'google_place' THEN 'exact'
        WHEN p.address_mode = 'manual'       THEN 'approximate'
        ELSE NULL
      END AS resolved_location_mode,
      CASE
        WHEN p.listing_type = 'rent' AND p.listed_rent = 0                                                              THEN NULL
        WHEN p.listing_type = 'rent' AND p.maintenance_included_in_rent = true                                          THEN 'rent_total'
        WHEN p.listing_type = 'rent' AND p.maintenance_included_in_rent = false AND p.society_maintenance_approx IS NOT NULL THEN 'rent_total'
        WHEN p.listing_type = 'rent'                                                                                    THEN 'rent_monthly'
        WHEN p.listing_type = 'sale' AND p.sale_price IS NOT NULL                                                      THEN 'sale'
        ELSE NULL
      END AS resolved_price_kind,
      CASE
        WHEN p.listing_type = 'rent' AND p.listed_rent = 0                                                              THEN NULL
        WHEN p.listing_type = 'rent' AND p.maintenance_included_in_rent = true                                          THEN p.listed_rent
        WHEN p.listing_type = 'rent' AND p.maintenance_included_in_rent = false AND p.society_maintenance_approx IS NOT NULL THEN p.listed_rent + p.society_maintenance_approx
        WHEN p.listing_type = 'rent'                                                                                    THEN p.listed_rent
        WHEN p.listing_type = 'sale'                                                                                    THEN p.sale_price
        ELSE NULL
      END AS resolved_price_amount,
      (
        SELECT ROUND(
          COUNT(*) FILTER (WHERE cr.status IN ('approved','declined'))::numeric
          / NULLIF(COUNT(*) FILTER (WHERE cr.status NOT IN ('withdrawn','auto_cancelled')), 0)
          * 100
        )
        FROM public.contact_requests cr
        WHERE cr.owner_id = p.owner_id
      ) AS response_rate_pct,
      (
        SELECT CASE
          WHEN COUNT(*) FILTER (WHERE ir.t_q3_deal_again IS NOT NULL) >= 3 THEN true
          ELSE NULL
        END
        FROM public.interaction_ratings ir
        WHERE ir.owner_id = p.owner_id
          AND ((ir.t_submitted_at IS NOT NULL AND ir.o_submitted_at IS NOT NULL)
               OR now() > ir.window_closes_at)
      ) AS has_experience_feedback
    FROM public.properties p
    WHERE
      p.status IN ('listed', 'edit_pending_review')
      AND p.is_active = true
      AND p.listing_type = p_listing_type
      AND lower(p.city) = lower(p_city)
      AND p.latitude  IS NOT NULL
      AND p.longitude IS NOT NULL
      AND earth_box(ll_to_earth(v_center_lat, v_center_lng), v_radius_m)
            @> ll_to_earth(p.latitude::float8, p.longitude::float8)
      AND p.latitude  BETWEEN p_sw_lat AND p_ne_lat
      AND p.longitude BETWEEN p_sw_lng AND p_ne_lng
      -- BHK
      AND (array_length(p_bhk, 1) IS NULL OR p.bhk::text = ANY(p_bhk))
      -- Location IDs (place_id)
      AND (array_length(p_location_ids, 1) IS NULL OR p.place_id = ANY(p_location_ids))
      -- Property type
      AND (p_property_type IS NULL OR p.property_type::text = p_property_type)
      -- Furnishing
      AND (array_length(p_furnishing, 1) IS NULL OR p.furnishing::text = ANY(p_furnishing))
      -- Available by
      AND (p_available_by IS NULL OR p.available_from IS NULL OR p.available_from <= p_available_by)
      -- Listed within N days
      AND (p_listed_within_days IS NULL OR p.listed_at >= now() - (p_listed_within_days * interval '1 day'))
      -- Availability confirmed within N days
      AND (p_availability_confirmed_within_days IS NULL
           OR p.availability_confirmed_at >= now() - (p_availability_confirmed_within_days * interval '1 day'))
      -- Deposit cap
      AND (p_max_deposit IS NULL OR p.security_deposit_amount IS NULL OR p.security_deposit_amount <= p_max_deposit)
      -- Lock-in cap
      AND (p_max_lock_in_months IS NULL OR p.lock_in_months IS NULL OR p.lock_in_months <= p_max_lock_in_months)
      -- Notice period cap
      AND (p_max_notice_days IS NULL OR p.notice_period_days IS NULL OR p.notice_period_days <= p_max_notice_days)
      -- Annual increase cap
      AND (p_max_annual_increase IS NULL OR p.annual_rent_increase_pct IS NULL OR p.annual_rent_increase_pct <= p_max_annual_increase)
      -- Move-in charges cap
      AND (p_max_move_in_charges IS NULL OR p.move_in_charges_amount IS NULL OR p.move_in_charges_amount <= p_max_move_in_charges)
      -- Pet policy
      AND (array_length(p_pet_policy, 1) IS NULL OR p.pet_policy = ANY(p_pet_policy))
      -- Possession status (buy)
      AND (array_length(p_possession_status, 1) IS NULL OR p.possession_status = ANY(p_possession_status))
      -- Possession before (buy)
      AND (p_possession_before IS NULL OR p.possession_date IS NULL OR p.possession_date <= p_possession_before)
      -- Negotiable (buy)
      AND (p_negotiable IS NULL OR p.price_negotiable = p_negotiable)
      -- Carpet area
      AND (p_min_carpet_area IS NULL OR p.square_footage IS NULL OR p.square_footage >= p_min_carpet_area)
      AND (p_max_carpet_area IS NULL OR p.square_footage IS NULL OR p.square_footage <= p_max_carpet_area)
      -- Super built-up area
      AND (p_min_super_built_up IS NULL OR p.super_built_up_area IS NULL OR p.super_built_up_area >= p_min_super_built_up)
      AND (p_max_super_built_up IS NULL OR p.super_built_up_area IS NULL OR p.super_built_up_area <= p_max_super_built_up)
      -- Parking
      AND (array_length(p_parking_4w, 1) IS NULL OR p.parking_4w::text = ANY(p_parking_4w))
      AND (array_length(p_parking_2w, 1) IS NULL OR p.parking_2w::text = ANY(p_parking_2w))
      -- Amenities (all must match)
      AND (array_length(p_amenities, 1) IS NULL
           OR (SELECT bool_and(p.amenities ? elem) FROM unnest(p_amenities) AS elem))
      -- Video walkthrough
      AND (p_has_video_walkthrough IS NULL
           OR (p_has_video_walkthrough = true  AND p.youtube_walkthrough_url IS NOT NULL)
           OR (p_has_video_walkthrough = false AND p.youtube_walkthrough_url IS NULL))
      -- Zero brokerage (rent)
      AND (p_zero_rent_brokerage IS NULL
           OR (p_zero_rent_brokerage = true AND p.rent_brokerage_type = 'none'))
      -- Max rent brokerage fixed (rent)
      AND (p_max_rent_brokerage_fixed IS NULL
           OR (p.rent_brokerage_fixed_amount IS NOT NULL AND p.rent_brokerage_fixed_amount <= p_max_rent_brokerage_fixed))
      -- Max sale brokerage pct (buy)
      AND (p_max_sale_brokerage_pct IS NULL
           OR (p.sale_brokerage_pct IS NOT NULL AND p.sale_brokerage_pct <= p_max_sale_brokerage_pct))
      -- RERA disclosed (buy)
      AND (p_rera_disclosed IS NULL
           OR (p_rera_disclosed = true AND p.rera_registration_number IS NOT NULL AND p.rera_registration_number != ''))
      -- Khata type (buy)
      AND (array_length(p_khata_type, 1) IS NULL OR p.khata_type = ANY(p_khata_type))
      -- Property tax paid (buy)
      AND (p_property_tax_paid IS NULL
           OR (p_property_tax_paid = true AND p.property_tax_paid_upto IS NOT NULL))
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
    (p_min_price IS NULL OR base.resolved_price_amount >= p_min_price)
    AND (p_max_price IS NULL OR base.resolved_price_amount <= p_max_price)
    AND (p_min_response_rate IS NULL OR base.response_rate_pct >= p_min_response_rate)
    AND (p_has_experience_feedback IS NULL
         OR (p_has_experience_feedback = true  AND base.has_experience_feedback IS NOT NULL)
         OR (p_has_experience_feedback = false AND base.has_experience_feedback IS NULL))
  LIMIT p_limit;
END;
$function$;

-- ── Permissions ───────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric,
  text[], numeric, numeric, integer,
  text[], text, text[], date, integer, integer,
  numeric, integer, integer, numeric, numeric,
  text[], text[], date, boolean,
  numeric, numeric, numeric, numeric,
  text[], text[], text[],
  boolean, numeric, boolean,
  boolean, numeric, numeric,
  boolean, text[], boolean
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric,
  text[], numeric, numeric, integer,
  text[], text, text[], date, integer, integer,
  numeric, integer, integer, numeric, numeric,
  text[], text[], date, boolean,
  numeric, numeric, numeric, numeric,
  text[], text[], text[],
  boolean, numeric, boolean,
  boolean, numeric, numeric,
  boolean, text[], boolean
) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_map_markers(
  property_listing_type, text, numeric, numeric, numeric, numeric,
  text[], numeric, numeric, integer,
  text[], text, text[], date, integer, integer,
  numeric, integer, integer, numeric, numeric,
  text[], text[], date, boolean,
  numeric, numeric, numeric, numeric,
  text[], text[], text[],
  boolean, numeric, boolean,
  boolean, numeric, numeric,
  boolean, text[], boolean
) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
