-- Stale-listing system (4/6): suppress the generic owner-attributed 'unlisted'
-- log row when the trusted scheduled sweep unlists a property. Requires BOTH the
-- 'auto_unlist' marker AND a null JWT (a logged-in owner always has a non-null
-- auth.uid(), so cannot trip this). The sweep writes its own 'auto_unlisted'
-- system row, so there is exactly one event and no duplicate.

CREATE OR REPLACE FUNCTION public.property_activity_log_writer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      (NEW.id,
       (SELECT auth.uid()),
       actor_role_val,
       'listing_started',
       jsonb_build_object('summary', 'You started this listing'),
       false);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Trusted scheduled sweep: skip the generic status log; the sweep writes its
    -- own 'auto_unlisted' system row.
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
      (NEW.id,
       (SELECT auth.uid()),
       actor_role_val,
       action_val,
       jsonb_build_object(
         'summary',     summary_val,
         'from_status', OLD.status::text,
         'to_status',   NEW.status::text
       ),
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
       OR OLD.title                        IS DISTINCT FROM NEW.title
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
    IF OLD.title                        IS DISTINCT FROM NEW.title                        THEN changed_field_keys := changed_field_keys || '["title"]'::jsonb; END IF;
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
      (NEW.id,
       (SELECT auth.uid()),
       'admin',
       'admin_edit',
       jsonb_build_object(
         'summary',            'Admin made a direct edit',
         'admin_id',           (SELECT auth.uid())::text,
         'changed_field_keys', changed_field_keys
       ),
       false);
  END IF;

  RETURN NEW;
END;
$function$;
