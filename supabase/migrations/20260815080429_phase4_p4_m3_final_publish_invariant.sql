-- Phase 4 · Prompt 4 — Migration C (M3): FINAL-only publish invariant.
-- Rebuilt verbatim from the exact live definitions; the ONLY change in each function is the removal
-- of the legacy OR-branch (LEGACY_OK / legacy primary_city). The FINAL branch — including its
-- `relationship IS NULL` discriminator and the `relationship/confidence` non-final count — is kept
-- verbatim (those columns are retained final-system deps; see Migration B). SECURITY DEFINER,
-- search_path, signature, and all unrelated status/building/photo/field rules are preserved.

CREATE OR REPLACE FUNCTION public.enforce_publish_location_invariant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total       int;
  v_non_final   int;
  v_primary     int;
  v_bad_primary int;
  final_ok  boolean;
BEGIN
  IF NOT (NEW.status = 'listed' AND OLD.status IS DISTINCT FROM 'listed') THEN
    RETURN NEW;
  END IF;

  IF NEW.property_type IN ('apartment','duplex_apartment')
     AND NULLIF(btrim(COALESCE(NEW.building_name,'')),'') IS NULL THEN
    RAISE EXCEPTION 'location_not_ready:publish_location_incomplete';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE a.relationship IS NOT NULL OR a.confidence IS NOT NULL),
         count(*) FILTER (WHERE a.is_primary),
         count(*) FILTER (WHERE a.is_primary AND g.kind NOT IN ('settlement','search_region'))
    INTO v_total, v_non_final, v_primary, v_bad_primary
    FROM public.property_geo_associations a
    JOIN public.geo_places g ON g.id = a.geo_place_id
   WHERE a.property_id = NEW.id;

  final_ok := (
    NEW.geom_exact IS NOT NULL
    AND NEW.location_confirmed_at IS NOT NULL
    AND NEW.country_code = 'IN'
    AND NEW.address_mode IN ('google_place','manual')
    AND NEW.discovery_finalized_at IS NOT NULL
    AND v_total > 0
    AND v_non_final = 0
    AND v_primary = 1
    AND v_bad_primary = 0
  );

  IF NOT final_ok THEN
    RAISE EXCEPTION 'location_not_ready:publish_location_incomplete';
  END IF;

  RETURN NEW;
END;
$function$;

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

      IF NEW.property_type IN ('apartment','duplex_apartment')
         AND NULLIF(btrim(COALESCE(NEW.building_name,'')),'') IS NULL THEN
        RAISE EXCEPTION 'location_not_ready:building_name_required';
      END IF;

      -- FINAL canonical location contract (legacy branch removed — M3).
      IF NOT (
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
             AND a.relationship IS NULL
             AND g.kind IN ('settlement','search_region')
        ) = 1
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
