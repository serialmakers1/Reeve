-- Group 3 Phase 2 — Migration B: Restrict authenticated SELECT on public.properties.
--
-- Before: authenticated holds table-level SELECT on public.properties
--         (granting all ~107 columns) plus 34 surviving column-level grants.
--         Any signed-in user could query private columns via PostgREST.
--
-- After:  authenticated matches anon exactly — only the 65 approved public
--         columns. Private columns (lister_flat_number, street_address, etc.)
--         are accessible only through the scoped SECURITY DEFINER RPCs added
--         in Migration A.
--
-- DEPLOY AFTER:
--   1. Migration A (RPCs) deployed
--   2. Types regenerated
--   3. Application code updated and deployed
-- Deploying this migration before the app update will break owner/admin flows.
--
-- INSERT/UPDATE/DELETE privileges for authenticated are unchanged.
-- RLS (properties_select policy) is unchanged.
-- anon privileges are unchanged.
-- service_role and postgres are unchanged.

-- ── Step 1: Revoke table-level SELECT ────────────────────────────────────────
--
-- This revokes the broad "all columns" grant. Does NOT revoke separately-granted
-- column-level privileges — those require explicit REVOKE (Steps 2 below).

REVOKE SELECT ON TABLE public.properties FROM authenticated;

-- ── Step 2: Revoke 7 surviving column-level grants outside the public 65 ─────
--
-- The baseline granted 39 column-level SELECTs to authenticated. Phase 1 auto-
-- dropped 5 (with their columns). 34 survive. 7 of the 34 are NOT in the
-- public-65 set and must be revoked explicitly before re-granting the allow-list.
--
--   street_address  — raw geocoder field, never shown publicly
--   state           — raw address component
--   pincode         — raw address component
--   is_active       — internal flag (RLS uses server-side)
--   created_at      — internal timestamp
--   updated_at      — internal timestamp
--   description     — not in public allow-list

REVOKE SELECT (
  street_address,
  state,
  pincode,
  is_active,
  created_at,
  updated_at,
  description
) ON TABLE public.properties FROM authenticated;

-- ── Step 3: Grant exactly the same 65 public columns as anon ─────────────────
--
-- Matches the anon grant in 20260824000010 exactly.
-- Future columns added to properties are NOT automatically visible to authenticated.
-- Each new public-facing column requires an explicit GRANT in both this migration
-- and the anon grant migration.

GRANT SELECT (
  -- Identity / lifecycle
  id,
  owner_id,
  status,
  listing_type,
  lister_role,
  listed_at,

  -- Location (public)
  locality,
  city,
  formatted_address,
  latitude,
  longitude,
  streetview_available,
  streetview_show_in_listing,
  streetview_pano_id,

  -- Property attributes
  building_name,
  building_notes,
  property_type,
  bhk,
  floor_number,
  total_floors,
  square_footage,
  super_built_up_area,
  furnishing,
  furnishing_detail,
  amenities,
  bathrooms,
  balconies,
  facing,
  building_age_years,
  landmark,

  -- Pricing
  listed_rent,
  sale_price,
  price_negotiable,
  expected_price_per_sqft,
  security_deposit_months,
  security_deposit_amount,
  maintenance_included_in_rent,
  society_maintenance_approx,
  move_in_charges_amount,
  rent_brokerage_fixed_amount,
  sale_brokerage_pct,
  annual_rent_increase_pct,

  -- Availability / tenure
  notice_period_days,
  lock_in_months,
  available_from,
  possession_status,
  possession_date,

  -- Policies / utilities
  building_rules,
  pet_policy,
  main_door_lock_type,
  gas_type,
  utility_water_included,
  utility_electricity_included,
  utility_gas_included,
  water_storage,
  water_source,

  -- Parking
  parking_4w,
  parking_2w,
  parking_4w_count,
  parking_2w_count,
  parking_notes,

  -- Legal / documentation
  rera_registration_number,
  khata_type,
  property_tax_paid_upto,

  -- Media
  youtube_walkthrough_url
)
ON TABLE public.properties
TO authenticated;
