-- Stale-listing system (3b/6): null-safety fix for the freshness-field guard.
-- With no marker, current_setting(...) returns NULL; `m = 'confirm_rent'` then
-- yields NULL (not FALSE), so `NOT (m = '…' OR …)` collapses to NULL and the
-- IF silently passes — allowing a direct owner tamper of availability_confirmed_at
-- / sale_listing_confirmed_at. COALESCE the marker to '' so comparisons are
-- proper booleans. (current_listed_period_started_at was unaffected because its
-- `AND fresh_relist` short-circuited to FALSE, but it is fixed here for clarity.)

CREATE OR REPLACE FUNCTION public.prevent_owner_updating_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m            text := COALESCE(current_setting('reeve.system_action', true), '');
  fresh_relist boolean := (NEW.status = 'listed' AND OLD.status <> 'listed');
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

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
