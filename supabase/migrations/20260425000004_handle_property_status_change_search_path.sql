-- Migration: handle_property_status_change — add SET search_path TO 'public'
--
-- Option (a): SET search_path only. SECURITY INVOKER preserved intentionally.
-- Rationale: the function only writes NEW.* (BEFORE trigger on the same row).
-- It never accesses cross-table data, so SECURITY DEFINER is unnecessary and
-- would silently suppress RLS errors if the body ever gains table access.
-- SECURITY INVOKER + SET search_path is the correct minimal posture here.
--
-- Body is byte-identical to the current DB state — only the security header changes.
--
-- DOWN:
--   Recreate without SET search_path (SECURITY INVOKER is already the default;
--   no keyword needed in the DOWN form).

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_property_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  -- When status changes to 'listed': make active and visible on search
  IF NEW.status = 'listed' AND OLD.status != 'listed' THEN
    NEW.is_active := true;
    IF NEW.listed_at IS NULL THEN
      NEW.listed_at := now();
    END IF;
  END IF;

  -- When status changes to 'occupied': remove from search, record timestamp
  IF NEW.status = 'occupied' AND OLD.status != 'occupied' THEN
    NEW.is_active := false;
    IF NEW.occupied_at IS NULL THEN
      NEW.occupied_at := now();
    END IF;
    NEW.last_leased_at := now();
  END IF;

  -- When status changes away from 'listed' (off_market, inactive etc): hide from search
  IF OLD.status = 'listed' AND NEW.status NOT IN ('listed', 'occupied') THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$function$;

-- ── Verification ──────────────────────────────────────────────────────────────
-- Expected: 1 row — prosecdef=false (SECURITY INVOKER), proconfig contains search_path=public
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'handle_property_status_change'
  AND 'search_path=public' = ANY(proconfig);

-- Expected: trigger still ENABLED on properties table
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_property_status_change';

COMMIT;
