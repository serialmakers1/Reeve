-- Git-sync migration for 2026-07-11 SQL editor fix (D-124).
-- Removes `status` from prevent_owner_updating_admin_fields guard list to allow
-- Commons owner status transitions. Status transitions still validated by
-- enforce_property_owner_transitions_trigger which fires alphabetically first.
-- This migration is idempotent (CREATE OR REPLACE FUNCTION).

CREATE OR REPLACE FUNCTION public.prevent_owner_updating_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
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
$$;
