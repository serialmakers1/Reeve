-- Migration: cancel_visits_on_rejection — add SET search_path + log visit_events rows
--
-- Two changes combined because they touch the same function:
--   (a) SET search_path TO 'public' — closes search_path injection vector (same as Migration A)
--   (b) CTE logs a visit_events row for each cancelled visit so the tenant timeline
--       shows the cancellation. Previously the function silently cancelled visits
--       with no audit trail in visit_events.
--
-- CTE form chosen over two-statement form for atomicity: a concurrent INSERT of a
-- 'scheduled' visit between two statements would produce an orphaned event row.
-- The WITH ... UPDATE ... RETURNING pattern eliminates that window.
--
-- Event field choices:
--   event_type  = 'cancelled'  — matches visit_events.event_type CHECK constraint
--   initiated_by = 'admin'     — platform-side auto-cancel; tenant did not initiate
--   notes       = NULL         — visits.cancellation_reason already carries the reason;
--                                duplicating it in events would create two sources of truth
--
-- DOWN:
--   Recreate without SET search_path and without the CTE (body reverts to diagnostic dump).
--   No data is modified; the visit_events rows already inserted remain — they are
--   accurate audit records and should not be deleted.

BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_visits_on_rejection()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('owner_rejected', 'platform_rejected')
     AND OLD.status NOT IN ('owner_rejected', 'platform_rejected') THEN

    -- CTE: cancel matching visits and capture their IDs + FK fields atomically.
    -- The INSERT ... SELECT reads only from the CTE result — no TOCTOU window.
    WITH cancelled AS (
      UPDATE visits
      SET
        status             = 'cancelled',
        cancelled_at       = now(),
        cancelled_by       = 'admin',
        cancellation_reason = 'Application rejected — visits auto-cancelled',
        updated_at         = now()
      WHERE property_id = NEW.property_id
        AND tenant_id   = NEW.tenant_id
        AND status IN ('scheduled', 'rescheduled', 'confirmed')
      RETURNING id AS visit_id, tenant_id, property_id
    )
    INSERT INTO visit_events (visit_id, tenant_id, property_id, event_type, initiated_by)
    SELECT visit_id, tenant_id, property_id, 'cancelled', 'admin'
    FROM cancelled;

  END IF;
  RETURN NEW;
END;
$function$;

-- ── Verification ──────────────────────────────────────────────────────────────
-- Expected: 1 row — cancel_visits_on_rejection with search_path=public and prosecdef=true
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'cancel_visits_on_rejection'
  AND 'search_path=public' = ANY(proconfig);

-- Expected: trigger still ENABLED on applications table
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'auto_cancel_visits_on_rejection';

COMMIT;
