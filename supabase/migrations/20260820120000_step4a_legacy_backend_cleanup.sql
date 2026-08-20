-- Step 4A — Final Legacy Backend Cleanup
-- Rewrites three retained functions, drops the legacy PM-era subsystem
-- (view, triggers, functions, tables, columns, enums).
-- DO NOT APPLY until external prerequisites are complete:
--   1. Pause/delete n8n workflows for /webhook/applications and /webhook/visits
--   2. Disable Razorpay dashboard webhook for verify-razorpay-payment
--   3. Run: supabase functions delete create-razorpay-order
--   4. Run: supabase functions delete verify-razorpay-payment
--   5. Verify complete_visit / reschedule_visit live signatures match DROP FUNCTION lines below.

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION A: Rewrite retained functions
-- Must come FIRST — the current bodies reference tables we are about to drop.
-- ─────────────────────────────────────────────────────────────────────────────

-- A1: admin_delete_draft_property — remove applications+visits COUNT guards.
-- Exact live body with only v_apps, v_visits, their COUNTs/RAISEs, and
-- obsolete comments removed. All else preserved exactly.
CREATE OR REPLACE FUNCTION public.admin_delete_draft_property(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO v_status
  FROM public.properties
  WHERE id = p_property_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft properties can be deleted (current status: %)', v_status;
  END IF;

  DELETE FROM public.properties WHERE id = p_property_id;
END;
$$;

-- A2: handle_property_status_change — remove occupied_at and last_leased_at
-- assignments from the occupied transition. Keep is_active := false and all
-- other status-change behaviors exactly.
CREATE OR REPLACE FUNCTION public.handle_property_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When status changes to 'listed': make active and visible on search.
  IF NEW.status = 'listed' AND OLD.status != 'listed' THEN
    NEW.is_active := true;
    IF NEW.listed_at IS NULL THEN
      NEW.listed_at := now();
    END IF;

    -- Fresh continuously-public listing period. Excludes edit_pending_review→listed
    -- (that is a review round-trip; the clock must continue). Counts as an
    -- immediate confirmation and resets the type-matching clock.
    IF OLD.status <> 'edit_pending_review' THEN
      PERFORM set_config('reeve.system_action', 'status_change', true);
      NEW.current_listed_period_started_at := now();
      IF NEW.listing_type = 'rent' THEN
        NEW.availability_confirmed_at := now();
      ELSIF NEW.listing_type = 'sale' THEN
        NEW.sale_listing_confirmed_at := now();
      END IF;
    END IF;
  END IF;

  -- When status changes to 'edit_pending_review': keep active (live listing stays
  -- live). No listed_at / period / confirmation change — the clock continues.
  IF NEW.status = 'edit_pending_review' AND OLD.status != 'edit_pending_review' THEN
    NEW.is_active := true;
  END IF;

  -- When status changes to 'occupied': remove from search.
  IF NEW.status = 'occupied' AND OLD.status != 'occupied' THEN
    NEW.is_active := false;
  END IF;

  -- When status changes away from 'listed' (off_market, inactive, unlisted, archived, etc): hide from search.
  -- edit_pending_review is EXCLUDED here — it keeps is_active=true (set above).
  IF OLD.status = 'listed' AND NEW.status NOT IN ('listed', 'occupied', 'edit_pending_review') THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$function$;

-- A3: enforce_owner_edit_partition — remove map_pin_url from identity_changed
-- (column is being dropped). All other identity protections preserved exactly.
CREATE OR REPLACE FUNCTION public.enforce_owner_edit_partition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    OR NEW.legal_owner_name IS DISTINCT FROM OLD.legal_owner_name
    OR NEW.streetview_available IS DISTINCT FROM OLD.streetview_available
    OR NEW.streetview_pano_id IS DISTINCT FROM OLD.streetview_pano_id
    OR NEW.streetview_checked_at IS DISTINCT FROM OLD.streetview_checked_at
    OR NEW.location_verified_by_owner IS DISTINCT FROM OLD.location_verified_by_owner
    OR NEW.location_verified_at IS DISTINCT FROM OLD.location_verified_at
    OR NEW.listing_type IS DISTINCT FROM OLD.listing_type OR NEW.lister_role IS DISTINCT FROM OLD.lister_role
    OR NEW.lister_flat_number IS DISTINCT FROM OLD.lister_flat_number
    OR NEW.google_maps_url IS DISTINCT FROM OLD.google_maps_url
    OR NEW.title IS DISTINCT FROM OLD.title OR NEW.description IS DISTINCT FROM OLD.description
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
    OR NEW.notice_period_months IS DISTINCT FROM OLD.notice_period_months
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
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION B: Drop properties_with_flat_number view
-- Must precede all table drops (view depends on applications, payments, visits).
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.properties_with_flat_number;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION C: Drop legacy triggers (exact live names)
-- Drop before dropping their functions and before dropping their parent tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- applications
DROP TRIGGER IF EXISTS "n8n-applications" ON public.applications;
DROP TRIGGER IF EXISTS auto_cancel_visits_on_rejection ON public.applications;
DROP TRIGGER IF EXISTS enforce_application_limits ON public.applications;
DROP TRIGGER IF EXISTS enforce_no_self_application ON public.applications;
DROP TRIGGER IF EXISTS enforce_terminal_immutability ON public.applications;
DROP TRIGGER IF EXISTS on_payment_received_hold_others ON public.applications;
DROP TRIGGER IF EXISTS recalculate_attempt_on_submit ON public.applications;
DROP TRIGGER IF EXISTS set_rejection_cooldown_trigger ON public.applications;
DROP TRIGGER IF EXISTS trg_protect_monthly_income ON public.applications;

-- visits
DROP TRIGGER IF EXISTS "n8n-visits" ON public.visits;
DROP TRIGGER IF EXISTS enforce_eligibility_before_visit ON public.visits;
DROP TRIGGER IF EXISTS enforce_visit_status_transitions ON public.visits;

-- payments
DROP TRIGGER IF EXISTS on_payment_refunded_restore ON public.payments;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION D: Drop legacy functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger functions (no parameters)
DROP FUNCTION IF EXISTS public.check_application_limits();
DROP FUNCTION IF EXISTS public.handle_payment_refunded();
DROP FUNCTION IF EXISTS public.handle_token_payment_received();
DROP FUNCTION IF EXISTS public.recalculate_attempt_on_submit();
DROP FUNCTION IF EXISTS public.check_eligibility_before_visit();
DROP FUNCTION IF EXISTS public.cancel_visits_on_rejection();
DROP FUNCTION IF EXISTS public.enforce_visit_status_transitions();
DROP FUNCTION IF EXISTS public.prevent_self_application();
DROP FUNCTION IF EXISTS public.prevent_terminal_overwrite();
DROP FUNCTION IF EXISTS public.set_rejection_cooldown();
DROP FUNCTION IF EXISTS public.prevent_tenant_updating_monthly_income();

-- RPC functions
-- VERIFY before applying: SELECT p.proname, pg_get_function_identity_arguments(p.oid)
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.proname IN ('complete_visit','reschedule_visit');
DROP FUNCTION IF EXISTS public.complete_visit(uuid, text, text);
DROP FUNCTION IF EXISTS public.reschedule_visit(uuid, timestamp with time zone, text);

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION E: Drop properties.service_agreement_id column
-- Drops fk_properties_service_agreement FK automatically.
-- Must precede dropping agreements.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.properties DROP COLUMN IF EXISTS service_agreement_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION F: Drop agreements
-- Now safe — its only retained-table FK (fk_properties_service_agreement) is gone.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.agreements;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION G: Break documents/leases FK cycle
-- documents.lease_id → leases ↔ leases.agreement_id → documents (ON DELETE SET NULL)
-- Drop the weaker leg first. No CASCADE.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS fk_leases_agreement_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION H: Drop dead properties columns (14, after service_agreement_id above)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.properties
  DROP COLUMN IF EXISTS map_pin_url,
  DROP COLUMN IF EXISTS occupied_at,
  DROP COLUMN IF EXISTS off_market_at,
  DROP COLUMN IF EXISTS last_leased_at,
  DROP COLUMN IF EXISTS agreement_pending_at,
  DROP COLUMN IF EXISTS floor_plan_url,
  DROP COLUMN IF EXISTS inspected_at,
  DROP COLUMN IF EXISTS inspection_accepted_at,
  DROP COLUMN IF EXISTS inspection_date,
  DROP COLUMN IF EXISTS inspection_end_time,
  DROP COLUMN IF EXISTS inspection_notes,
  DROP COLUMN IF EXISTS inspection_proposed_at,
  DROP COLUMN IF EXISTS inspection_scheduled_at,
  DROP COLUMN IF EXISTS inspection_start_time;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION I-PRE: Drop RLS policies that reference applications
-- Both policies depend on public.applications; Postgres will refuse to drop the
-- table while they exist. Neither is recreated — the applications subsystem is
-- permanently removed.
--   eligibility_owner_read: grants owners access to eligibility rows joined via
--     applications — moot once applications is gone.
--   users_owner_read_tenant_name: grants owners read on tenant names via approved
--     applications — moot once applications is gone.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS eligibility_owner_read ON public.eligibility;
DROP POLICY IF EXISTS users_owner_read_tenant_name ON public.users;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION I: Drop legacy tables (FK-safe topological order — children first)
-- ─────────────────────────────────────────────────────────────────────────────

-- Leaf children
DROP TABLE IF EXISTS public.visit_events;           -- child of visits
DROP TABLE IF EXISTS public.application_notes;      -- child of applications
DROP TABLE IF EXISTS public.application_residents;  -- child of applications
DROP TABLE IF EXISTS public.payments;               -- child of applications
DROP TABLE IF EXISTS public.property_condition_reports; -- child of leases+properties
DROP TABLE IF EXISTS public.owner_action_log;       -- child of properties+users
DROP TABLE IF EXISTS public.keys_tracking;          -- child of maintenance_requests+properties (must precede maintenance_requests)
DROP TABLE IF EXISTS public.maintenance_requests;   -- parent of keys_tracking via keys_tracking.maintenance_id
DROP TABLE IF EXISTS public.leads;                  -- child of properties+users

-- Cluster (cycle broken in Section G, service_agreement_id dropped in Section E)
DROP TABLE IF EXISTS public.documents;    -- child of leases+applications (cycle broken)
DROP TABLE IF EXISTS public.leases;       -- child of applications (fk_leases_agreement_id dropped)
DROP TABLE IF EXISTS public.applications; -- child of visits; parent of eligibility FK
DROP TABLE IF EXISTS public.visits;       -- after applications dropped
DROP TABLE IF EXISTS public.eligibility;  -- parent of applications (drop after applications)

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION J: Drop enum types exclusive to deleted tables
-- KEEP: bhk_type, diet_type, gender_type, marital_status, occupation_type
-- ─────────────────────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS public.agreement_status;
DROP TYPE IF EXISTS public.agreement_type;
DROP TYPE IF EXISTS public.application_status;
DROP TYPE IF EXISTS public.bill_compliance_status;
DROP TYPE IF EXISTS public.cibil_range_type;
DROP TYPE IF EXISTS public.condition_report_type;
DROP TYPE IF EXISTS public.document_category;
DROP TYPE IF EXISTS public.document_type;
DROP TYPE IF EXISTS public.eligibility_status;
DROP TYPE IF EXISTS public.key_event_type;
DROP TYPE IF EXISTS public.key_holder_type;
DROP TYPE IF EXISTS public.lead_status;
DROP TYPE IF EXISTS public.lease_status;
DROP TYPE IF EXISTS public.maintenance_category;
DROP TYPE IF EXISTS public.maintenance_status;
DROP TYPE IF EXISTS public.payment_method;
DROP TYPE IF EXISTS public.payment_status;
DROP TYPE IF EXISTS public.payment_type;
DROP TYPE IF EXISTS public.pet_type;
DROP TYPE IF EXISTS public.stay_duration_type;
DROP TYPE IF EXISTS public.visit_status;
