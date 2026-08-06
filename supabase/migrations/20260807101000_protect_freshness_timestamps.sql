-- Stale-listing system (3/6): protect server-managed freshness timestamps from
-- direct owner writes. Each transaction marker permits ONLY its intended
-- field(s); any other freshness-field change raises. Legitimate writers
-- (handle_property_status_change, confirm_availability_of_rental,
-- confirm_sale_listing) set the marker before touching the columns. A direct
-- PostgREST .update() cannot set the marker, so owner tampering is blocked.
-- Admins bypass at the top. Existing admin-only-field protection preserved.

CREATE OR REPLACE FUNCTION public.prevent_owner_updating_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m            text := COALESCE(current_setting('reeve.system_action', true), '');  -- see 20260807101200 (null-safety)
  fresh_relist boolean := (NEW.status = 'listed' AND OLD.status <> 'listed');
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- ── Server-managed freshness timestamps (marker + field specific) ──────────
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

  -- `status` REMOVED from this guard list (2026-07-11): Commons owner flow
  -- requires owners to transition status through valid states. Status changes
  -- are validated by enforce_property_owner_transitions_trigger which fires
  -- alphabetically before this trigger.
  IF (NEW.flat_number                   IS DISTINCT FROM OLD.flat_number)                   OR
     (NEW.board_status                  IS DISTINCT FROM OLD.board_status)                  OR
     (NEW.flat_number_revealed          IS DISTINCT FROM OLD.flat_number_revealed)          OR
     (NEW.auto_accept_enabled           IS DISTINCT FROM OLD.auto_accept_enabled)           OR
     (NEW.owner_diet_preference         IS DISTINCT FROM OLD.owner_diet_preference)         OR
     (NEW.owner_pet_preference          IS DISTINCT FROM OLD.owner_pet_preference)          OR
     (NEW.owner_tenant_type_preference  IS DISTINCT FROM OLD.owner_tenant_type_preference)  THEN
    RAISE EXCEPTION 'permission denied: only admins may update admin-only property fields';
  END IF;

  RETURN NEW;
END;
$function$;
