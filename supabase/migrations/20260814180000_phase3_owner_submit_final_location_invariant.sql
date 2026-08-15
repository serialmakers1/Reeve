-- Phase 3 · Prompt 2 — Owner submit location invariant (transitional FINAL_OK OR LEGACY_OK).
--
-- Replaces ONLY the pending_review LOCATION contract inside enforce_property_owner_transitions.
-- Every other check (draft cap, transition matrix, bhk, rent/sale required fields, >=3 photos,
-- unlisted-edit guard), plus SECURITY DEFINER / search_path / ownership, is preserved verbatim
-- from the live definition captured on 2026-08-14.
--
-- WHY: Phase 2 shipped the final pin/discovery engine (apply_final_property_location + final
-- associations + discovery_confirmed_at) but the owner submit guard still required the LEGACY
-- shape (address_mode='google_place' + place_id + one relationship='primary_city'). This migration
-- accepts EITHER the final model OR the legacy model so:
--   * new drafts confirmed through the new Owner UI (final associations, manual/rural pins, no
--     Google building place_id) can submit; AND
--   * existing drafts confirmed under the old flow are NOT stranded during cutover.
-- The legacy branch is transitional; a later M3 removes it after audit. Do NOT loosen either branch.
--
-- Building-by-type requirement is the SINGLE authoritative rule for Phase 3: a building/society name
-- is required ONLY for apartment / duplex_apartment. Mirrors BUILDING_REQUIRED_TYPES in
-- src/lib/location/isLocationReadyForSubmit.ts — keep the two in sync.

CREATE OR REPLACE FUNCTION public.enforce_property_owner_transitions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  photo_count integer;
  draft_count integer;
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'draft' THEN
      SELECT COUNT(*) INTO draft_count
        FROM public.properties
       WHERE owner_id = NEW.owner_id AND status = 'draft';
      IF draft_count >= 20 THEN
        RAISE EXCEPTION 'Draft limit reached: 20 properties in draft status per owner';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'draft'               AND NEW.status IN ('pending_review', 'archived'))
      OR (OLD.status = 'pending_review'   AND NEW.status IN ('draft', 'archived'))
      OR (OLD.status = 'changes_requested' AND NEW.status IN ('pending_review', 'archived'))
      OR (OLD.status = 'listed'           AND NEW.status IN ('edit_pending_review', 'unlisted', 'archived'))
      OR (OLD.status = 'edit_pending_review' AND NEW.status IN ('listed', 'archived'))
      OR (OLD.status = 'unlisted'         AND NEW.status IN ('listed', 'archived'))
    ) THEN
      RAISE EXCEPTION 'Owner cannot transition property from % to %', OLD.status, NEW.status;
    END IF;

    IF NEW.status = 'pending_review' THEN
      IF NEW.bhk IS NULL THEN
        RAISE EXCEPTION 'location_not_ready:bhk_missing';
      END IF;

      -- Building-by-type (single authoritative rule; applies to BOTH location branches below).
      IF NEW.property_type IN ('apartment','duplex_apartment')
         AND NULLIF(btrim(COALESCE(NEW.building_name,'')),'') IS NULL THEN
        RAISE EXCEPTION 'location_not_ready:building_name_required';
      END IF;

      -- Transitional location contract: FINAL_OK OR LEGACY_OK.
      IF NOT (
        (
          -- FINAL_OK — confirmed exact pin + India + owner verification + owner Discovery
          -- confirmation + exactly one valid final root (settlement OR search_region).
          -- place_id is NOT required: manual/rural pins pass. Locality/road not required.
          NEW.geom_exact IS NOT NULL
          AND NEW.location_confirmed_at IS NOT NULL
          AND NEW.country_code = 'IN'
          AND NEW.location_verified_by_owner IS TRUE
          AND NEW.discovery_confirmed_at IS NOT NULL
          AND NEW.address_mode IN ('google_place','manual')
          AND (
            SELECT count(*)
              FROM public.property_geo_associations a
              JOIN public.geo_places g ON g.id = a.geo_place_id
             WHERE a.property_id = NEW.id
               AND a.is_primary IS TRUE
               AND a.relationship IS NULL          -- final rows, not legacy
               AND g.kind IN ('settlement','search_region')
          ) = 1
        )
        OR
        (
          -- LEGACY_OK — the prior contract, verbatim (not loosened). Transitional only.
          NEW.address_mode = 'google_place'
          AND NULLIF(btrim(COALESCE(NEW.place_id,'')),'') IS NOT NULL
          AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL
          AND NEW.location_verified_by_owner IS TRUE
          AND (
            SELECT count(*) FROM public.property_geo_associations
             WHERE property_id = NEW.id AND relationship = 'primary_city'
          ) = 1
        )
      ) THEN
        RAISE EXCEPTION 'location_not_ready:location_incomplete';
      END IF;

      IF NEW.listing_type = 'sale' THEN
        IF NEW.sale_price IS NULL OR NEW.possession_status IS NULL THEN
          RAISE EXCEPTION 'Cannot submit for review (sale): required fields missing (sale_price, possession_status)';
        END IF;
        IF NEW.possession_status = 'under_construction' AND NEW.possession_date IS NULL THEN
          RAISE EXCEPTION 'Cannot submit for review (sale): possession_date required when possession_status is under_construction';
        END IF;
      ELSE
        IF NEW.listed_rent IS NULL OR NEW.security_deposit_amount IS NULL OR NEW.furnishing IS NULL OR NEW.available_from IS NULL THEN
          RAISE EXCEPTION 'Cannot submit for review (rent): required fields missing (listed_rent, security_deposit_amount, furnishing, available_from)';
        END IF;
      END IF;

      SELECT COUNT(*) INTO photo_count FROM public.property_images WHERE property_id = NEW.id;
      IF photo_count < 3 THEN
        RAISE EXCEPTION 'Cannot submit for review: at least 3 photos required';
      END IF;
    END IF;
  END IF;

  IF OLD.status = 'unlisted' AND NEW.status = 'unlisted' THEN
    IF NEW.description IS DISTINCT FROM OLD.description
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.building_rules IS DISTINCT FROM OLD.building_rules
       OR NEW.building_notes IS DISTINCT FROM OLD.building_notes
       OR NEW.amenities IS DISTINCT FROM OLD.amenities
    THEN
      RAISE EXCEPTION 'Cannot edit properties in unlisted state — re-list first';
    END IF;

    IF OLD.listing_type = 'sale' THEN
      IF NEW.sale_price IS DISTINCT FROM OLD.sale_price
         OR NEW.price_negotiable IS DISTINCT FROM OLD.price_negotiable
         OR NEW.expected_price_per_sqft IS DISTINCT FROM OLD.expected_price_per_sqft
         OR NEW.possession_status IS DISTINCT FROM OLD.possession_status
         OR NEW.possession_date IS DISTINCT FROM OLD.possession_date
         OR NEW.rera_registration_number IS DISTINCT FROM OLD.rera_registration_number
         OR NEW.khata_type IS DISTINCT FROM OLD.khata_type
         OR NEW.property_tax_paid_upto IS DISTINCT FROM OLD.property_tax_paid_upto
      THEN
        RAISE EXCEPTION 'Cannot edit properties in unlisted state — re-list first';
      END IF;
    ELSE
      IF NEW.listed_rent IS DISTINCT FROM OLD.listed_rent
         OR NEW.security_deposit_amount IS DISTINCT FROM OLD.security_deposit_amount
         OR NEW.security_deposit_months IS DISTINCT FROM OLD.security_deposit_months
         OR NEW.furnishing IS DISTINCT FROM OLD.furnishing
         OR NEW.available_from IS DISTINCT FROM OLD.available_from
         OR NEW.pet_policy IS DISTINCT FROM OLD.pet_policy
         OR NEW.furnishing_detail IS DISTINCT FROM OLD.furnishing_detail
      THEN
        RAISE EXCEPTION 'Cannot edit properties in unlisted state — re-list first';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
