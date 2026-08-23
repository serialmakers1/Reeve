-- Group 3 Phase 1 — Prompt 2: Drop 25 retired/dead public.properties columns.
--
-- Application code (Prompt 1) already cleaned of all references.
-- Prompt 3 (anon SELECT restriction) follows separately.
-- All three prompts deploy together at Phase 1 end.
--
-- Order:
--   1. Drop index that depends on a retiring column (board_qr_code).
--   2. Rewrite trigger functions to remove references to retiring columns.
--   3. Drop the 25 columns.
--   4. Drop the now-unused board_status enum.

-- ── 1. Drop index ─────────────────────────────────────────────────────────────

DROP INDEX public.idx_properties_board_qr_code;

-- ── 2a. Rewrite prevent_owner_updating_admin_fields ───────────────────────────
--
-- Removed guards (retiring columns):
--   flat_number, board_status, flat_number_revealed, auto_accept_enabled,
--   owner_diet_preference, owner_pet_preference, owner_tenant_type_preference
--
-- Preserved (active):
--   current_listed_period_started_at, availability_confirmed_at,
--   sale_listing_confirmed_at, last_public_listed_rent, last_public_sale_price

CREATE OR REPLACE FUNCTION public.prevent_owner_updating_admin_fields()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  m            text    := COALESCE(current_setting('reeve.system_action', true), '');
  fresh_relist boolean := (NEW.status = 'listed' AND OLD.status <> 'listed');
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;

  IF NEW.current_listed_period_started_at IS DISTINCT FROM OLD.current_listed_period_started_at
     AND NOT (m = 'status_change' AND fresh_relist) THEN
    RAISE EXCEPTION 'permission denied: current_listed_period_started_at is server-managed';
  END IF;

  IF NEW.availability_confirmed_at IS DISTINCT FROM OLD.availability_confirmed_at
     AND NOT (m = 'confirm_rent'
              OR (m = 'status_change' AND fresh_relist AND NEW.listing_type = 'rent')) THEN
    RAISE EXCEPTION 'permission denied: availability_confirmed_at is server-managed';
  END IF;

  IF NEW.sale_listing_confirmed_at IS DISTINCT FROM OLD.sale_listing_confirmed_at
     AND NOT (m = 'confirm_sale'
              OR (m = 'status_change' AND fresh_relist AND NEW.listing_type = 'sale')) THEN
    RAISE EXCEPTION 'permission denied: sale_listing_confirmed_at is server-managed';
  END IF;

  IF (NEW.last_public_listed_rent IS DISTINCT FROM OLD.last_public_listed_rent) OR
     (NEW.last_public_sale_price  IS DISTINCT FROM OLD.last_public_sale_price)  THEN
    RAISE EXCEPTION 'permission denied: only admins may update admin-only property fields';
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2b. Rewrite enforce_owner_edit_partition ──────────────────────────────────
--
-- Removed from identity_changed (retiring columns):
--   legal_owner_name, google_maps_url, title
--
-- Removed from live_changed (retiring column):
--   notice_period_months
--
-- Preserved (active): all location/geo/streetview fields, lister_flat_number,
--   description, lister_role, notice_period_days, and all other active fields.

CREATE OR REPLACE FUNCTION public.enforce_owner_edit_partition()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  identity_changed boolean;
  live_changed     boolean;
  review_text_add  boolean;
BEGIN
  IF public.is_admin() OR COALESCE(current_setting('reeve.system_action', true), '') <> '' THEN
    RETURN NEW;
  END IF;

  identity_changed := (
    NEW.building_name IS DISTINCT FROM OLD.building_name OR NEW.street_address IS DISTINCT FROM OLD.street_address
    OR NEW.locality IS DISTINCT FROM OLD.locality OR NEW.city IS DISTINCT FROM OLD.city
    OR NEW.state IS DISTINCT FROM OLD.state OR NEW.pincode IS DISTINCT FROM OLD.pincode
    OR NEW.latitude IS DISTINCT FROM OLD.latitude OR NEW.longitude IS DISTINCT FROM OLD.longitude
    OR NEW.place_id IS DISTINCT FROM OLD.place_id OR NEW.formatted_address IS DISTINCT FROM OLD.formatted_address
    OR NEW.address_mode IS DISTINCT FROM OLD.address_mode OR NEW.street_number IS DISTINCT FROM OLD.street_number
    OR NEW.route IS DISTINCT FROM OLD.route OR NEW.sublocality_1 IS DISTINCT FROM OLD.sublocality_1
    OR NEW.sublocality_2 IS DISTINCT FROM OLD.sublocality_2 OR NEW.neighborhood IS DISTINCT FROM OLD.neighborhood
    OR NEW.district IS DISTINCT FROM OLD.district OR NEW.country IS DISTINCT FROM OLD.country
    OR NEW.plus_code IS DISTINCT FROM OLD.plus_code
    OR NEW.viewport_ne_lat IS DISTINCT FROM OLD.viewport_ne_lat OR NEW.viewport_ne_lng IS DISTINCT FROM OLD.viewport_ne_lng
    OR NEW.viewport_sw_lat IS DISTINCT FROM OLD.viewport_sw_lat OR NEW.viewport_sw_lng IS DISTINCT FROM OLD.viewport_sw_lng
    OR NEW.landmark IS DISTINCT FROM OLD.landmark
    OR NEW.streetview_available IS DISTINCT FROM OLD.streetview_available
    OR NEW.streetview_pano_id IS DISTINCT FROM OLD.streetview_pano_id
    OR NEW.streetview_checked_at IS DISTINCT FROM OLD.streetview_checked_at
    OR NEW.location_verified_by_owner IS DISTINCT FROM OLD.location_verified_by_owner
    OR NEW.location_verified_at IS DISTINCT FROM OLD.location_verified_at
    OR NEW.listing_type IS DISTINCT FROM OLD.listing_type OR NEW.lister_role IS DISTINCT FROM OLD.lister_role
    OR NEW.lister_flat_number IS DISTINCT FROM OLD.lister_flat_number
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.building_name_source IS DISTINCT FROM OLD.building_name_source
  );

  IF OLD.status NOT IN ('draft', 'changes_requested') AND identity_changed THEN
    RAISE EXCEPTION 'Identity/location and listing-type fields are admin-only after publication';
  END IF;

  IF OLD.status IN ('draft', 'changes_requested') THEN
    RETURN NEW;
  END IF;

  live_changed := (
    NEW.listed_rent IS DISTINCT FROM OLD.listed_rent OR NEW.sale_price IS DISTINCT FROM OLD.sale_price
    OR NEW.price_negotiable IS DISTINCT FROM OLD.price_negotiable
    OR NEW.expected_price_per_sqft IS DISTINCT FROM OLD.expected_price_per_sqft
    OR NEW.security_deposit_amount IS DISTINCT FROM OLD.security_deposit_amount
    OR NEW.security_deposit_months IS DISTINCT FROM OLD.security_deposit_months
    OR NEW.society_maintenance_approx IS DISTINCT FROM OLD.society_maintenance_approx
    OR NEW.maintenance_included_in_rent IS DISTINCT FROM OLD.maintenance_included_in_rent
    OR NEW.move_in_charges_amount IS DISTINCT FROM OLD.move_in_charges_amount
    OR NEW.annual_rent_increase_pct IS DISTINCT FROM OLD.annual_rent_increase_pct
    OR NEW.lock_in_months IS DISTINCT FROM OLD.lock_in_months
    OR NEW.notice_period_days IS DISTINCT FROM OLD.notice_period_days
    OR NEW.sale_brokerage_pct IS DISTINCT FROM OLD.sale_brokerage_pct
    OR NEW.rent_brokerage_fixed_amount IS DISTINCT FROM OLD.rent_brokerage_fixed_amount
    OR NEW.rent_brokerage_months IS DISTINCT FROM OLD.rent_brokerage_months
    OR NEW.rent_brokerage_type IS DISTINCT FROM OLD.rent_brokerage_type
    OR NEW.available_from IS DISTINCT FROM OLD.available_from
    OR NEW.possession_status IS DISTINCT FROM OLD.possession_status
    OR NEW.possession_date IS DISTINCT FROM OLD.possession_date
    OR NEW.floor_number IS DISTINCT FROM OLD.floor_number OR NEW.total_floors IS DISTINCT FROM OLD.total_floors
    OR NEW.square_footage IS DISTINCT FROM OLD.square_footage
    OR NEW.super_built_up_area IS DISTINCT FROM OLD.super_built_up_area
    OR NEW.bathrooms IS DISTINCT FROM OLD.bathrooms OR NEW.balconies IS DISTINCT FROM OLD.balconies
    OR NEW.facing IS DISTINCT FROM OLD.facing OR NEW.building_age_years IS DISTINCT FROM OLD.building_age_years
    OR NEW.khata_type IS DISTINCT FROM OLD.khata_type
    OR NEW.property_tax_paid_upto IS DISTINCT FROM OLD.property_tax_paid_upto
    OR NEW.parking_2w IS DISTINCT FROM OLD.parking_2w OR NEW.parking_4w IS DISTINCT FROM OLD.parking_4w
    OR NEW.parking_2w_count IS DISTINCT FROM OLD.parking_2w_count
    OR NEW.parking_4w_count IS DISTINCT FROM OLD.parking_4w_count
    OR NEW.utility_water_included IS DISTINCT FROM OLD.utility_water_included
    OR NEW.utility_gas_included IS DISTINCT FROM OLD.utility_gas_included
    OR NEW.utility_electricity_included IS DISTINCT FROM OLD.utility_electricity_included
    OR NEW.gas_type IS DISTINCT FROM OLD.gas_type OR NEW.water_source IS DISTINCT FROM OLD.water_source
    OR NEW.water_storage IS DISTINCT FROM OLD.water_storage
    OR NEW.main_door_lock_type IS DISTINCT FROM OLD.main_door_lock_type
    OR NEW.furnishing IS DISTINCT FROM OLD.furnishing OR NEW.pet_policy IS DISTINCT FROM OLD.pet_policy
    OR NEW.streetview_show_in_listing IS DISTINCT FROM OLD.streetview_show_in_listing
  );

  review_text_add := (
    (NEW.building_notes IS DISTINCT FROM OLD.building_notes AND btrim(COALESCE(NEW.building_notes,'')) <> '')
    OR (NEW.building_rules IS DISTINCT FROM OLD.building_rules AND btrim(COALESCE(NEW.building_rules,'')) <> '')
    OR (NEW.parking_notes IS DISTINCT FROM OLD.parking_notes AND btrim(COALESCE(NEW.parking_notes,'')) <> '')
    OR (NEW.rera_registration_number IS DISTINCT FROM OLD.rera_registration_number AND btrim(COALESCE(NEW.rera_registration_number,'')) <> '')
    OR (NEW.youtube_walkthrough_url IS DISTINCT FROM OLD.youtube_walkthrough_url AND btrim(COALESCE(NEW.youtube_walkthrough_url,'')) <> '')
  );

  IF OLD.status IN ('pending_review', 'unlisted', 'archived') THEN
    IF OLD.status = NEW.status AND (
      live_changed
      OR NEW.building_notes IS DISTINCT FROM OLD.building_notes
      OR NEW.building_rules IS DISTINCT FROM OLD.building_rules
      OR NEW.parking_notes IS DISTINCT FROM OLD.parking_notes
      OR NEW.rera_registration_number IS DISTINCT FROM OLD.rera_registration_number
      OR NEW.youtube_walkthrough_url IS DISTINCT FROM OLD.youtube_walkthrough_url
      OR NEW.bhk IS DISTINCT FROM OLD.bhk OR NEW.property_type IS DISTINCT FROM OLD.property_type
      OR NEW.amenities IS DISTINCT FROM OLD.amenities
      OR NEW.furnishing_detail IS DISTINCT FROM OLD.furnishing_detail
    ) THEN
      RAISE EXCEPTION 'Property content is frozen in % status', OLD.status;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('listed', 'edit_pending_review') THEN
    IF review_text_add THEN
      RAISE EXCEPTION 'This field requires review — submit it via submit_property_edit_request';
    END IF;
    IF NEW.bhk IS DISTINCT FROM OLD.bhk OR NEW.property_type IS DISTINCT FROM OLD.property_type THEN
      RAISE EXCEPTION 'BHK / property type corrections require review';
    END IF;
    IF public.reeve_introduces_new_custom(OLD.furnishing_detail, NEW.furnishing_detail, OLD.amenities, NEW.amenities) THEN
      RAISE EXCEPTION 'New custom furnishing/amenity items require review';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Drop the 25 retired columns ────────────────────────────────────────────
--
-- No CASCADE. Column-owned constraints (e.g. board_status NOT NULL DEFAULT)
-- are dropped automatically by PostgreSQL with their owning column.

ALTER TABLE public.properties
  DROP COLUMN legal_owner_name,
  DROP COLUMN owner_rep_name,
  DROP COLUMN owner_rep_phone,
  DROP COLUMN flat_number,
  DROP COLUMN flat_number_revealed,
  DROP COLUMN board_qr_code,
  DROP COLUMN board_status,
  DROP COLUMN board_installed_at,
  DROP COLUMN board_removed_at,
  DROP COLUMN title,
  DROP COLUMN auto_accept_enabled,
  DROP COLUMN owner_diet_preference,
  DROP COLUMN owner_pet_preference,
  DROP COLUMN owner_tenant_type_preference,
  DROP COLUMN owner_committed_12_months,
  DROP COLUMN owner_income_dependent,
  DROP COLUMN owner_has_local_rep,
  DROP COLUMN owner_lives_in_same_city,
  DROP COLUMN owner_only_rental_property,
  DROP COLUMN owner_prefers_phone_calls,
  DROP COLUMN google_maps_url,
  DROP COLUMN draft_at,
  DROP COLUMN vacancy_review_day14_at,
  DROP COLUMN vacancy_review_day21_at,
  DROP COLUMN notice_period_months;

-- ── 4. Drop board_status enum ─────────────────────────────────────────────────
--
-- Baseline confirms all usages were: the board_status column (step 3 above),
-- its column-level grants (removed with column), and one guard in
-- prevent_owner_updating_admin_fields (step 2a above). No remaining dependents.

DROP TYPE public.board_status;
