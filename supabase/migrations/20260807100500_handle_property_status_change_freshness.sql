-- Stale-listing system (2/6): reset the listing-period + confirmation clock on a
-- fresh listing (first-list or relist), but NOT on an edit_pending_review return.
-- Sets the 'status_change' marker so the freshness-field guard (see migration 3)
-- permits the trigger-generated reset.

CREATE OR REPLACE FUNCTION public.handle_property_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When status changes to 'listed': make active and visible on search.
  IF NEW.status = 'listed' AND OLD.status != 'listed' THEN
    NEW.is_active := true;
    IF NEW.listed_at IS NULL THEN
      NEW.listed_at := now();
    END IF;

    -- Fresh continuously-public listing period. Excludes edit_pending_review→listed
    -- (that is a review round-trip; the clock must continue). Counts as an
    -- immediate confirmation and resets the type-matching clock.
    IF OLD.status <> 'edit_pending_review' THEN
      PERFORM set_config('reeve.system_action', 'status_change', true);
      NEW.current_listed_period_started_at := now();
      IF NEW.listing_type = 'rent' THEN
        NEW.availability_confirmed_at := now();
      ELSIF NEW.listing_type = 'sale' THEN
        NEW.sale_listing_confirmed_at := now();
      END IF;
    END IF;
  END IF;

  -- When status changes to 'edit_pending_review': keep active (live listing stays
  -- live). No listed_at / period / confirmation change — the clock continues.
  IF NEW.status = 'edit_pending_review' AND OLD.status != 'edit_pending_review' THEN
    NEW.is_active := true;
  END IF;

  -- When status changes to 'occupied': remove from search, record timestamp.
  IF NEW.status = 'occupied' AND OLD.status != 'occupied' THEN
    NEW.is_active := false;
    IF NEW.occupied_at IS NULL THEN
      NEW.occupied_at := now();
    END IF;
    NEW.last_leased_at := now();
  END IF;

  -- When status changes away from 'listed' (off_market, inactive, unlisted, archived, etc): hide from search.
  -- edit_pending_review is EXCLUDED here — it keeps is_active=true (set above).
  IF OLD.status = 'listed' AND NEW.status NOT IN ('listed', 'occupied', 'edit_pending_review') THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$function$;
