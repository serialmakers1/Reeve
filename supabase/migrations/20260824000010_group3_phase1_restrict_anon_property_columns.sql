-- Group 3 Phase 1 — Prompt 3: Restrict anon SELECT on public.properties.
--
-- Before: anon holds table-level SELECT + 40 individual column-level SELECTs
--         (from baseline). In PostgreSQL, revoking the table-level grant does
--         NOT revoke separately-granted column-level privileges — both must be
--         cleared explicitly.
--
-- After:  all prior anon SELECT privileges cleared; exact 65-column allow-list
--         replaces them — covering only what the public PropertyDetail page needs.
--
-- Of the 40 baseline column-level anon grants, 5 are on columns dropped by
-- Prompt 2 (flat_number_revealed, board_status, board_qr_code, auto_accept_enabled,
-- title) — PostgreSQL removes those automatically with the column drop. The
-- remaining 35 survive; 7 of them are not in the new allow-list and are
-- revoked explicitly in Step 2.
--
-- Authenticated, service_role, and postgres privileges are unchanged.
-- RLS (properties_select policy) is unchanged — it continues to filter rows.
-- Applied after 20260824000000 (25-column drop).
--
-- Future columns added to properties are NOT automatically visible to anon.
-- Each new public-facing column requires an explicit GRANT here.

-- ── Step 1: Revoke table-level SELECT ────────────────────────────────────────

REVOKE SELECT ON TABLE public.properties FROM anon;

-- ── Step 2: Revoke surviving column-level grants not in the new allow-list ───
--
-- These 7 columns survive the Prompt 2 column drop but must not remain
-- accessible to anon:
--   street_address  — raw geocoder field, never shown publicly
--   state           — raw address component
--   pincode         — raw address component
--   is_active       — internal active flag (RLS uses it server-side)
--   created_at      — internal timestamp
--   updated_at      — internal timestamp
--   description     — not fetched by PropertyDetail, not in allow-list

REVOKE SELECT (
  street_address,
  state,
  pincode,
  is_active,
  created_at,
  updated_at,
  description
) ON TABLE public.properties FROM anon;

-- ── Step 3: Grant exactly the 65 approved public columns ─────────────────────
--
-- These match the explicit column list in PropertyDetail.tsx (line 455).
-- lister_flat_number is intentionally absent — it is a private unit identifier.

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
TO anon;
