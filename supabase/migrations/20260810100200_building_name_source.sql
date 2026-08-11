-- Prompt 1 (geographic foundation) — building-name provenance.
--
-- building_name_source describes WHO supplied the building name (google/owner/admin),
-- orthogonal to address_mode (which describes geographic precision). Owners may only
-- ever set it to 'owner' or NULL — 'google'/'admin' require the trusted path
-- (reeve.system_action GUC) or an admin — in EVERY status (incl. draft), and it is
-- admin-only post-publication like the other identity/location fields.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS building_name_source text
  CHECK (building_name_source IN ('google', 'owner', 'admin'));

COMMENT ON COLUMN public.properties.building_name_source IS
  'Provenance of building_name: google | owner | admin | NULL. Owner may set only owner/NULL; google/admin via trusted path.';

-- Provenance guard: ordinary owner writes may set building_name_source only to 'owner'/NULL.
CREATE OR REPLACE FUNCTION public.enforce_building_name_source_provenance()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_admin() OR COALESCE(current_setting('reeve.system_action', true), '') <> '' THEN
    RETURN NEW;
  END IF;
  IF NEW.building_name_source IS NOT NULL AND NEW.building_name_source <> 'owner' THEN
    -- Block only an actual owner-initiated set to google/admin (no-ops on a
    -- trusted-set value pass via IS DISTINCT FROM).
    IF TG_OP = 'INSERT' OR NEW.building_name_source IS DISTINCT FROM OLD.building_name_source THEN
      RAISE EXCEPTION 'building_name_source % requires the trusted/admin path', NEW.building_name_source;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_building_name_source ON public.properties;
CREATE TRIGGER trg_enforce_building_name_source
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_building_name_source_provenance();

-- Add building_name_source to the post-publication identity/admin-only set so owners
-- cannot change provenance after publication. Body is the current deployed definition
-- with exactly one added disjunct in identity_changed.
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
    OR NEW.map_pin_url IS DISTINCT FROM OLD.map_pin_url OR NEW.landmark IS DISTINCT FROM OLD.landmark
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
