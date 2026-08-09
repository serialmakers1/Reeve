-- M1 — Repo/live drift capture (no behavior change).
--
-- The deployed `enforce_property_owner_transitions` is the listing_type-branched
-- (rent/sale) version, applied historically via MCP (D-160) and never committed as a
-- migration. The repo's only definition (20260710120600) is the OLDER non-branched body,
-- so a fresh replay would regress sale required-field validation. This migration captures
-- the currently-deployed body verbatim so the repository reproduces the intended behavior.
--
-- Reversible: this is an idempotent CREATE OR REPLACE; to revert, replay 20260710120600.

BEGIN;

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
  -- Admin bypass
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  ----------------------------------------------------------------------------
  -- INSERT: enforce draft cap
  ----------------------------------------------------------------------------
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

  ----------------------------------------------------------------------------
  -- UPDATE with status change: validate transition
  ----------------------------------------------------------------------------
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

    -- On → pending_review: required-fields + min-photos check, branched on listing_type.
    IF NEW.status = 'pending_review' THEN
      -- Common required fields for both listing types
      IF NEW.locality IS NULL
         OR NEW.building_name IS NULL
         OR NEW.bhk IS NULL
      THEN
        RAISE EXCEPTION 'Cannot submit for review: required fields missing (locality, building_name, bhk)';
      END IF;

      IF NEW.listing_type = 'sale' THEN
        -- Sale-specific required fields
        IF NEW.sale_price IS NULL
           OR NEW.possession_status IS NULL
        THEN
          RAISE EXCEPTION 'Cannot submit for review (sale): required fields missing (sale_price, possession_status)';
        END IF;
        -- Conditional: possession_date required when under_construction
        IF NEW.possession_status = 'under_construction' AND NEW.possession_date IS NULL THEN
          RAISE EXCEPTION 'Cannot submit for review (sale): possession_date required when possession_status is under_construction';
        END IF;
      ELSE
        -- Rent required fields (existing rules preserved)
        IF NEW.listed_rent IS NULL
           OR NEW.security_deposit_amount IS NULL
           OR NEW.furnishing IS NULL
           OR NEW.available_from IS NULL
        THEN
          RAISE EXCEPTION 'Cannot submit for review (rent): required fields missing (listed_rent, security_deposit_amount, furnishing, available_from)';
        END IF;
      END IF;

      -- Photo min-3 rule applies to both rent and sale
      SELECT COUNT(*) INTO photo_count
        FROM public.property_images
       WHERE property_id = NEW.id;
      IF photo_count < 3 THEN
        RAISE EXCEPTION 'Cannot submit for review: at least 3 photos required';
      END IF;
    END IF;
  END IF;

  ----------------------------------------------------------------------------
  -- Block owner field edits while in unlisted state (no status change involved).
  -- Branched on listing_type so sale-specific fields are also protected.
  ----------------------------------------------------------------------------
  IF OLD.status = 'unlisted' AND NEW.status = 'unlisted' THEN
    -- Common edit-locked fields for both types
    IF NEW.description             IS DISTINCT FROM OLD.description
       OR NEW.title                IS DISTINCT FROM OLD.title
       OR NEW.building_rules       IS DISTINCT FROM OLD.building_rules
       OR NEW.building_notes       IS DISTINCT FROM OLD.building_notes
       OR NEW.amenities            IS DISTINCT FROM OLD.amenities
    THEN
      RAISE EXCEPTION 'Cannot edit properties in unlisted state — re-list first';
    END IF;

    IF OLD.listing_type = 'sale' THEN
      IF NEW.sale_price               IS DISTINCT FROM OLD.sale_price
         OR NEW.price_negotiable      IS DISTINCT FROM OLD.price_negotiable
         OR NEW.expected_price_per_sqft IS DISTINCT FROM OLD.expected_price_per_sqft
         OR NEW.possession_status     IS DISTINCT FROM OLD.possession_status
         OR NEW.possession_date       IS DISTINCT FROM OLD.possession_date
         OR NEW.rera_registration_number IS DISTINCT FROM OLD.rera_registration_number
         OR NEW.khata_type            IS DISTINCT FROM OLD.khata_type
         OR NEW.property_tax_paid_upto IS DISTINCT FROM OLD.property_tax_paid_upto
      THEN
        RAISE EXCEPTION 'Cannot edit properties in unlisted state — re-list first';
      END IF;
    ELSE
      -- Rent edit-lock (existing rules preserved)
      IF NEW.listed_rent               IS DISTINCT FROM OLD.listed_rent
         OR NEW.security_deposit_amount IS DISTINCT FROM OLD.security_deposit_amount
         OR NEW.security_deposit_months IS DISTINCT FROM OLD.security_deposit_months
         OR NEW.furnishing              IS DISTINCT FROM OLD.furnishing
         OR NEW.available_from          IS DISTINCT FROM OLD.available_from
         OR NEW.pet_policy              IS DISTINCT FROM OLD.pet_policy
         OR NEW.furnishing_detail       IS DISTINCT FROM OLD.furnishing_detail
      THEN
        RAISE EXCEPTION 'Cannot edit properties in unlisted state — re-list first';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
