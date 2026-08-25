-- Fix stale OLD.title / NEW.title references left in two trigger functions after
-- properties.title was dropped in 20260824000000_group3_phase1_drop_retired_columns.
--
-- property_activity_log_writer: title appeared in the admin-edit detection condition
--   and changed_field_keys builder. Same-status UPDATEs always reach this IF block,
--   so every PATCH (including draft autosave) returned 42703.
-- enforce_property_owner_transitions: title appeared in the unlisted->unlisted edit
--   freeze check. The BEFORE trigger fires before the AFTER log writer, so unlisted
--   owner UPDATEs hit this stale reference first.
--
-- Both functions keep: SECURITY DEFINER, search_path=public, owner=postgres,
--   ACL=postgres=X/postgres. CREATE OR REPLACE preserves existing ACL.

CREATE OR REPLACE FUNCTION public.property_activity_log_writer()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  actor_role_val      text;
  action_val          text;
  is_public_val       boolean;
  summary_val         text;
  changed_field_keys  jsonb;
BEGIN
  actor_role_val := CASE WHEN public.is_admin() THEN 'admin' ELSE 'owner' END;

  IF TG_OP = 'INSERT' AND NEW.status = 'draft' THEN
    INSERT INTO public.property_activity_log
      (property_id, actor_id, actor_role, action, payload, is_public)
    VALUES
      (NEW.id, (SELECT auth.uid()), actor_role_val, 'listing_started',
       jsonb_build_object('summary', 'You started this listing'), false);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF current_setting('reeve.system_action', true) = 'auto_unlist'
       AND (SELECT auth.uid()) IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.status::text = 'changes_requested' THEN
      RETURN NEW;
    END IF;

    action_val := CASE NEW.status::text
      WHEN 'pending_review'      THEN 'listing_submitted'
      WHEN 'changes_requested'   THEN 'listing_rejected'
      WHEN 'listed'              THEN CASE OLD.status::text
                                        WHEN 'pending_review'      THEN 'listing_approved'
                                        WHEN 'edit_pending_review' THEN 'edit_resolved'
                                        WHEN 'unlisted'            THEN 'relisted'
                                        ELSE 'status_changed'
                                      END
      WHEN 'edit_pending_review' THEN 'edit_submitted'
      WHEN 'unlisted'            THEN 'unlisted'
      WHEN 'archived'            THEN 'archived'
      WHEN 'draft'               THEN CASE OLD.status::text
                                        WHEN 'pending_review' THEN 'listing_withdrawn'
                                        ELSE 'status_changed'
                                      END
      ELSE 'status_changed'
    END;

    is_public_val := (NEW.status::text = 'listed' AND OLD.status::text IN ('pending_review','unlisted'))
                     OR NEW.status::text = 'unlisted';

    summary_val := 'Status changed from ' || OLD.status::text || ' to ' || NEW.status::text;

    INSERT INTO public.property_activity_log
      (property_id, actor_id, actor_role, action, payload, is_public)
    VALUES
      (NEW.id, (SELECT auth.uid()), actor_role_val, action_val,
       jsonb_build_object('summary', summary_val, 'from_status', OLD.status::text, 'to_status', NEW.status::text),
       is_public_val);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = NEW.status
     AND public.is_admin()
     AND (
          OLD.listed_rent                  IS DISTINCT FROM NEW.listed_rent
       OR OLD.security_deposit_amount      IS DISTINCT FROM NEW.security_deposit_amount
       OR OLD.security_deposit_months      IS DISTINCT FROM NEW.security_deposit_months
       OR OLD.society_maintenance_approx   IS DISTINCT FROM NEW.society_maintenance_approx
       OR OLD.maintenance_included_in_rent IS DISTINCT FROM NEW.maintenance_included_in_rent
       OR OLD.description                  IS DISTINCT FROM NEW.description
       OR OLD.furnishing                   IS DISTINCT FROM NEW.furnishing
       OR OLD.furnishing_detail::text      IS DISTINCT FROM NEW.furnishing_detail::text
       OR OLD.amenities::text              IS DISTINCT FROM NEW.amenities::text
       OR OLD.available_from               IS DISTINCT FROM NEW.available_from
       OR OLD.pet_policy                   IS DISTINCT FROM NEW.pet_policy
       OR OLD.building_rules               IS DISTINCT FROM NEW.building_rules
       OR OLD.building_notes               IS DISTINCT FROM NEW.building_notes
       OR OLD.parking_2w                   IS DISTINCT FROM NEW.parking_2w
       OR OLD.parking_4w                   IS DISTINCT FROM NEW.parking_4w
     )
  THEN
    changed_field_keys := '[]'::jsonb;
    IF OLD.listed_rent                  IS DISTINCT FROM NEW.listed_rent                  THEN changed_field_keys := changed_field_keys || '["listed_rent"]'::jsonb; END IF;
    IF OLD.security_deposit_amount      IS DISTINCT FROM NEW.security_deposit_amount      THEN changed_field_keys := changed_field_keys || '["security_deposit_amount"]'::jsonb; END IF;
    IF OLD.security_deposit_months      IS DISTINCT FROM NEW.security_deposit_months      THEN changed_field_keys := changed_field_keys || '["security_deposit_months"]'::jsonb; END IF;
    IF OLD.society_maintenance_approx   IS DISTINCT FROM NEW.society_maintenance_approx   THEN changed_field_keys := changed_field_keys || '["society_maintenance_approx"]'::jsonb; END IF;
    IF OLD.maintenance_included_in_rent IS DISTINCT FROM NEW.maintenance_included_in_rent THEN changed_field_keys := changed_field_keys || '["maintenance_included_in_rent"]'::jsonb; END IF;
    IF OLD.description                  IS DISTINCT FROM NEW.description                  THEN changed_field_keys := changed_field_keys || '["description"]'::jsonb; END IF;
    IF OLD.furnishing                   IS DISTINCT FROM NEW.furnishing                   THEN changed_field_keys := changed_field_keys || '["furnishing"]'::jsonb; END IF;
    IF OLD.furnishing_detail::text      IS DISTINCT FROM NEW.furnishing_detail::text      THEN changed_field_keys := changed_field_keys || '["furnishing_detail"]'::jsonb; END IF;
    IF OLD.amenities::text              IS DISTINCT FROM NEW.amenities::text              THEN changed_field_keys := changed_field_keys || '["amenities"]'::jsonb; END IF;
    IF OLD.available_from               IS DISTINCT FROM NEW.available_from               THEN changed_field_keys := changed_field_keys || '["available_from"]'::jsonb; END IF;
    IF OLD.pet_policy                   IS DISTINCT FROM NEW.pet_policy                   THEN changed_field_keys := changed_field_keys || '["pet_policy"]'::jsonb; END IF;
    IF OLD.building_rules               IS DISTINCT FROM NEW.building_rules               THEN changed_field_keys := changed_field_keys || '["building_rules"]'::jsonb; END IF;
    IF OLD.building_notes               IS DISTINCT FROM NEW.building_notes               THEN changed_field_keys := changed_field_keys || '["building_notes"]'::jsonb; END IF;
    IF OLD.parking_2w                   IS DISTINCT FROM NEW.parking_2w                   THEN changed_field_keys := changed_field_keys || '["parking_2w"]'::jsonb; END IF;
    IF OLD.parking_4w                   IS DISTINCT FROM NEW.parking_4w                   THEN changed_field_keys := changed_field_keys || '["parking_4w"]'::jsonb; END IF;

    INSERT INTO public.property_activity_log
      (property_id, actor_id, actor_role, action, payload, is_public)
    VALUES
      (NEW.id, (SELECT auth.uid()), 'admin', 'admin_edit',
       jsonb_build_object('summary', 'Admin made a direct edit', 'admin_id', (SELECT auth.uid())::text, 'changed_field_keys', changed_field_keys),
       false);
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.enforce_property_owner_transitions()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
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

      -- Building-by-type (single authoritative rule; applies to the FINAL location branch below).
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
$$;
