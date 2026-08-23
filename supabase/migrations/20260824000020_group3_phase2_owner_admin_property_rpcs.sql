-- Group 3 Phase 2 — Migration A: Owner + Admin scoped reader RPCs for public.properties.
--
-- Problem: authenticated holds table-level SELECT on public.properties, so any
-- signed-in user can query private columns (lister_flat_number, street_address, etc.)
-- via PostgREST on publicly listed rows. RLS restricts rows but not columns.
--
-- Solution: Four SECURITY DEFINER RPCs give owners and admins authorized access
-- to the private columns they legitimately need. Migration B (separate) then
-- restricts the authenticated role to the same 65 public columns as anon.
--
-- Deployment: Deploy this migration FIRST, regenerate types, update app code,
-- deploy the app, THEN deploy Migration B.
--
-- All RPCs:
--   - SECURITY DEFINER (bypass per-column grants; run as function owner)
--   - SET search_path TO 'public' (prevent search-path injection)
--   - STABLE (read-only; no side effects)
--   - No SELECT *, no p.*, no u.*
--   - EXECUTE revoked from PUBLIC and anon, granted to authenticated
--
-- RLS and write privileges are unchanged.

-- ── RPC 1: get_owner_property(p_property_id uuid) ────────────────────────────
--
-- Full property data for the calling owner's own property.
-- Returns empty (zero rows) if caller is not the owner — no error.
-- Consumers: ListProperty.tsx (edit + resume), OwnerPropertyManagement.tsx,
--            OwnerDashboard.tsx (post-relist re-fetch).

CREATE OR REPLACE FUNCTION public.get_owner_property(p_property_id uuid)
RETURNS TABLE(
  -- Identity / lifecycle (public 65)
  id                              uuid,
  owner_id                        uuid,
  status                          text,
  listing_type                    text,
  lister_role                     text,
  listed_at                       timestamptz,
  -- Location (public 65)
  locality                        text,
  city                            text,
  formatted_address               text,
  latitude                        numeric,
  longitude                       numeric,
  streetview_available            boolean,
  streetview_show_in_listing      boolean,
  streetview_pano_id              text,
  -- Property attributes (public 65)
  building_name                   text,
  building_notes                  text,
  property_type                   text,
  bhk                             text,
  floor_number                    integer,
  total_floors                    integer,
  square_footage                  numeric,
  super_built_up_area             numeric,
  furnishing                      text,
  furnishing_detail               jsonb,
  amenities                       jsonb,
  bathrooms                       integer,
  balconies                       integer,
  facing                          text,
  building_age_years              integer,
  landmark                        text,
  -- Pricing (public 65)
  listed_rent                     integer,
  sale_price                      integer,
  price_negotiable                boolean,
  expected_price_per_sqft         numeric,
  security_deposit_months         integer,
  security_deposit_amount         integer,
  maintenance_included_in_rent    boolean,
  society_maintenance_approx      integer,
  move_in_charges_amount          integer,
  rent_brokerage_fixed_amount     integer,
  sale_brokerage_pct              numeric,
  annual_rent_increase_pct        numeric,
  -- Availability / tenure (public 65)
  notice_period_days              integer,
  lock_in_months                  integer,
  available_from                  date,
  possession_status               text,
  possession_date                 date,
  -- Policies / utilities (public 65)
  building_rules                  text,
  pet_policy                      text,
  main_door_lock_type             text,
  gas_type                        text,
  utility_water_included          boolean,
  utility_electricity_included    boolean,
  utility_gas_included            boolean,
  water_storage                   text,
  water_source                    text[],
  -- Parking (public 65)
  parking_4w                      text,
  parking_2w                      text,
  parking_4w_count                integer,
  parking_2w_count                integer,
  parking_notes                   text,
  -- Legal / media (public 65)
  rera_registration_number        text,
  khata_type                      text,
  property_tax_paid_upto          date,
  youtube_walkthrough_url         text,
  -- Owner-private: status flags
  is_active                       boolean,
  description                     text,
  -- Owner-private: geo internals (prefillFormFromRow + loadLocationReadiness)
  street_address                  text,
  state                           text,
  pincode                         text,
  place_id                        text,
  address_mode                    text,
  building_name_source            text,
  street_number                   text,
  route                           text,
  sublocality_1                   text,
  sublocality_2                   text,
  neighborhood                    text,
  district                        text,
  country                         text,
  plus_code                       text,
  viewport_ne_lat                 numeric,
  viewport_ne_lng                 numeric,
  viewport_sw_lat                 numeric,
  viewport_sw_lng                 numeric,
  streetview_checked_at           timestamptz,
  location_verified_by_owner      boolean,
  location_verified_at            timestamptz,
  location_confirmed_at           timestamptz,
  discovery_confirmed_at          timestamptz,
  -- Owner-private: unit identifier
  lister_flat_number              text,
  -- Owner-private: server-managed lifecycle fields
  availability_confirmed_at           timestamptz,
  sale_listing_confirmed_at           timestamptz,
  current_listed_period_started_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.owner_id,
    p.status::text,
    p.listing_type::text,
    p.lister_role::text,
    p.listed_at,
    p.locality,
    p.city,
    p.formatted_address,
    p.latitude,
    p.longitude,
    p.streetview_available,
    p.streetview_show_in_listing,
    p.streetview_pano_id,
    p.building_name,
    p.building_notes,
    p.property_type::text,
    p.bhk::text,
    p.floor_number,
    p.total_floors,
    p.square_footage,
    p.super_built_up_area,
    p.furnishing::text,
    p.furnishing_detail,
    p.amenities,
    p.bathrooms,
    p.balconies,
    p.facing::text,
    p.building_age_years,
    p.landmark,
    p.listed_rent,
    p.sale_price,
    p.price_negotiable,
    p.expected_price_per_sqft,
    p.security_deposit_months,
    p.security_deposit_amount,
    p.maintenance_included_in_rent,
    p.society_maintenance_approx,
    p.move_in_charges_amount,
    p.rent_brokerage_fixed_amount,
    p.sale_brokerage_pct,
    p.annual_rent_increase_pct,
    p.notice_period_days,
    p.lock_in_months,
    p.available_from,
    p.possession_status::text,
    p.possession_date,
    p.building_rules,
    p.pet_policy::text,
    p.main_door_lock_type::text,
    p.gas_type::text,
    p.utility_water_included,
    p.utility_electricity_included,
    p.utility_gas_included,
    p.water_storage::text,
    p.water_source,
    p.parking_4w::text,
    p.parking_2w::text,
    p.parking_4w_count,
    p.parking_2w_count,
    p.parking_notes,
    p.rera_registration_number,
    p.khata_type::text,
    p.property_tax_paid_upto,
    p.youtube_walkthrough_url,
    p.is_active,
    p.description,
    p.street_address,
    p.state,
    p.pincode,
    p.place_id,
    p.address_mode::text,
    p.building_name_source::text,
    p.street_number,
    p.route,
    p.sublocality_1,
    p.sublocality_2,
    p.neighborhood,
    p.district,
    p.country,
    p.plus_code,
    p.viewport_ne_lat,
    p.viewport_ne_lng,
    p.viewport_sw_lat,
    p.viewport_sw_lng,
    p.streetview_checked_at,
    p.location_verified_by_owner,
    p.location_verified_at,
    p.location_confirmed_at,
    p.discovery_confirmed_at,
    p.lister_flat_number,
    p.availability_confirmed_at,
    p.sale_listing_confirmed_at,
    p.current_listed_period_started_at
  FROM public.properties p
  WHERE p.id = p_property_id
    AND p.owner_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_owner_property(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_property(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_owner_property(uuid) TO authenticated;

-- ── RPC 2: get_owner_property_list() ─────────────────────────────────────────
--
-- Dashboard card list for the calling owner — all their properties with the
-- columns OwnerDashboard.tsx needs, ordered by created_at DESC.
-- Auth: owner_id = (SELECT auth.uid())

CREATE OR REPLACE FUNCTION public.get_owner_property_list()
RETURNS TABLE(
  id                                  uuid,
  building_name                       text,
  locality                            text,
  city                                text,
  bhk                                 text,
  listed_rent                         integer,
  sale_price                          integer,
  status                              text,
  is_active                           boolean,
  created_at                          timestamptz,
  listing_type                        text,
  availability_confirmed_at           timestamptz,
  sale_listing_confirmed_at           timestamptz,
  current_listed_period_started_at    timestamptz,
  listed_at                           timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.building_name,
    p.locality,
    p.city,
    p.bhk::text,
    p.listed_rent,
    p.sale_price,
    p.status::text,
    p.is_active,
    p.created_at,
    p.listing_type::text,
    p.availability_confirmed_at,
    p.sale_listing_confirmed_at,
    p.current_listed_period_started_at,
    p.listed_at
  FROM public.properties p
  WHERE p.owner_id = (SELECT auth.uid())
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_owner_property_list() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_property_list() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_owner_property_list() TO authenticated;

-- ── RPC 3: get_admin_property(p_property_id uuid) ────────────────────────────
--
-- Full admin view of a property including all internal/geo columns and flat
-- owner user fields. Requires is_admin() — raises 'permission denied' otherwise.
-- Consumers: PropertyEdit.tsx, ListingReviewDetail.tsx, InspectionForm.tsx,
--            AdminLocationPanel.tsx.

CREATE OR REPLACE FUNCTION public.get_admin_property(p_property_id uuid)
RETURNS TABLE(
  -- Identity / lifecycle (public 65)
  id                              uuid,
  owner_id                        uuid,
  status                          text,
  listing_type                    text,
  lister_role                     text,
  listed_at                       timestamptz,
  -- Location (public 65)
  locality                        text,
  city                            text,
  formatted_address               text,
  latitude                        numeric,
  longitude                       numeric,
  streetview_available            boolean,
  streetview_show_in_listing      boolean,
  streetview_pano_id              text,
  -- Property attributes (public 65)
  building_name                   text,
  building_notes                  text,
  property_type                   text,
  bhk                             text,
  floor_number                    integer,
  total_floors                    integer,
  square_footage                  numeric,
  super_built_up_area             numeric,
  furnishing                      text,
  furnishing_detail               jsonb,
  amenities                       jsonb,
  bathrooms                       integer,
  balconies                       integer,
  facing                          text,
  building_age_years              integer,
  landmark                        text,
  -- Pricing (public 65)
  listed_rent                     integer,
  sale_price                      integer,
  price_negotiable                boolean,
  expected_price_per_sqft         numeric,
  security_deposit_months         integer,
  security_deposit_amount         integer,
  maintenance_included_in_rent    boolean,
  society_maintenance_approx      integer,
  move_in_charges_amount          integer,
  rent_brokerage_fixed_amount     integer,
  sale_brokerage_pct              numeric,
  annual_rent_increase_pct        numeric,
  -- Availability / tenure (public 65)
  notice_period_days              integer,
  lock_in_months                  integer,
  available_from                  date,
  possession_status               text,
  possession_date                 date,
  -- Policies / utilities (public 65)
  building_rules                  text,
  pet_policy                      text,
  main_door_lock_type             text,
  gas_type                        text,
  utility_water_included          boolean,
  utility_electricity_included    boolean,
  utility_gas_included            boolean,
  water_storage                   text,
  water_source                    text[],
  -- Parking (public 65)
  parking_4w                      text,
  parking_2w                      text,
  parking_4w_count                integer,
  parking_2w_count                integer,
  parking_notes                   text,
  -- Legal / media (public 65)
  rera_registration_number        text,
  khata_type                      text,
  property_tax_paid_upto          date,
  youtube_walkthrough_url         text,
  -- Admin/internal: status flags
  is_active                       boolean,
  created_at                      timestamptz,
  description                     text,
  -- Admin/internal: geo
  street_address                  text,
  state                           text,
  pincode                         text,
  place_id                        text,
  address_mode                    text,
  building_name_source            text,
  street_number                   text,
  route                           text,
  sublocality_1                   text,
  sublocality_2                   text,
  neighborhood                    text,
  district                        text,
  country                         text,
  plus_code                       text,
  viewport_ne_lat                 numeric,
  viewport_ne_lng                 numeric,
  viewport_sw_lat                 numeric,
  viewport_sw_lng                 numeric,
  streetview_checked_at           timestamptz,
  location_verified_by_owner      boolean,
  location_verified_at            timestamptz,
  location_confirmed_at           timestamptz,
  discovery_confirmed_at          timestamptz,
  discovery_finalized_at          timestamptz,
  owner_pin_adjusted_at           timestamptz,
  owner_pin_adjustment_distance_m numeric,
  -- Private unit identifier
  lister_flat_number              text,
  -- Flat owner fields (from users join)
  owner_full_name                 text,
  owner_email                     text,
  owner_phone                     text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.owner_id,
    p.status::text,
    p.listing_type::text,
    p.lister_role::text,
    p.listed_at,
    p.locality,
    p.city,
    p.formatted_address,
    p.latitude,
    p.longitude,
    p.streetview_available,
    p.streetview_show_in_listing,
    p.streetview_pano_id,
    p.building_name,
    p.building_notes,
    p.property_type::text,
    p.bhk::text,
    p.floor_number,
    p.total_floors,
    p.square_footage,
    p.super_built_up_area,
    p.furnishing::text,
    p.furnishing_detail,
    p.amenities,
    p.bathrooms,
    p.balconies,
    p.facing::text,
    p.building_age_years,
    p.landmark,
    p.listed_rent,
    p.sale_price,
    p.price_negotiable,
    p.expected_price_per_sqft,
    p.security_deposit_months,
    p.security_deposit_amount,
    p.maintenance_included_in_rent,
    p.society_maintenance_approx,
    p.move_in_charges_amount,
    p.rent_brokerage_fixed_amount,
    p.sale_brokerage_pct,
    p.annual_rent_increase_pct,
    p.notice_period_days,
    p.lock_in_months,
    p.available_from,
    p.possession_status::text,
    p.possession_date,
    p.building_rules,
    p.pet_policy::text,
    p.main_door_lock_type::text,
    p.gas_type::text,
    p.utility_water_included,
    p.utility_electricity_included,
    p.utility_gas_included,
    p.water_storage::text,
    p.water_source,
    p.parking_4w::text,
    p.parking_2w::text,
    p.parking_4w_count,
    p.parking_2w_count,
    p.parking_notes,
    p.rera_registration_number,
    p.khata_type::text,
    p.property_tax_paid_upto,
    p.youtube_walkthrough_url,
    p.is_active,
    p.created_at,
    p.description,
    p.street_address,
    p.state,
    p.pincode,
    p.place_id,
    p.address_mode::text,
    p.building_name_source::text,
    p.street_number,
    p.route,
    p.sublocality_1,
    p.sublocality_2,
    p.neighborhood,
    p.district,
    p.country,
    p.plus_code,
    p.viewport_ne_lat,
    p.viewport_ne_lng,
    p.viewport_sw_lat,
    p.viewport_sw_lng,
    p.streetview_checked_at,
    p.location_verified_by_owner,
    p.location_verified_at,
    p.location_confirmed_at,
    p.discovery_confirmed_at,
    p.discovery_finalized_at,
    p.owner_pin_adjusted_at,
    p.owner_pin_adjustment_distance_m,
    p.lister_flat_number,
    u.full_name,
    u.email,
    u.phone
  FROM public.properties p
  LEFT JOIN public.users u ON u.id = p.owner_id
  WHERE p.id = p_property_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_property(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_property(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_property(uuid) TO authenticated;

-- ── RPC 4: get_admin_pending_review_properties() ─────────────────────────────
--
-- Narrow list of pending-review properties for ListingReviewQueue.tsx.
-- Returns created_at which is NOT in the public-65 column set — this RPC is
-- the only authorized path to that field for authenticated users.
-- Requires is_admin() — raises 'permission denied' otherwise.

CREATE OR REPLACE FUNCTION public.get_admin_pending_review_properties()
RETURNS TABLE(
  id            uuid,
  owner_id      uuid,
  building_name text,
  bhk           text,
  locality      text,
  city          text,
  listed_rent   integer,
  created_at    timestamptz,
  listing_type  text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.owner_id,
    p.building_name,
    p.bhk::text,
    p.locality,
    p.city,
    p.listed_rent,
    p.created_at,
    p.listing_type::text
  FROM public.properties p
  WHERE p.status = 'pending_review'
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_pending_review_properties() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_pending_review_properties() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_pending_review_properties() TO authenticated;
