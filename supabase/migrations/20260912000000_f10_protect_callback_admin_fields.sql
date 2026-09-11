-- F-10 — protect admin/audit-owned callback columns from non-admin authenticated UPDATEs.
--
-- ROOT CAUSE (confirmed against live state, read-only)
--   `callback_requests` grants column-level UPDATE on every column to `authenticated`, and the owner
--   UPDATE policy `callback_requests_update_own_pending` (USING user_id=auth.uid() AND status='pending')
--   omits WITH CHECK. Postgres reuses that USING clause as the WITH CHECK, so status and user_id are
--   pinned — but admin_notes, called_at and completed_at are not. No trigger pins them either. A normal
--   authenticated owner can therefore PATCH their own PENDING row and inject fake admin notes / call /
--   completion timestamps that staff read in the admin queue. Self-scoped audit-integrity pollution
--   (no status change, no cross-user reach) — LOW, but a real least-privilege gap.
--
-- WHY A TRIGGER (not column grants): admins operate under the SAME `authenticated` DB role
--   (callback_requests_update_admin USING is_admin(); admin SPA calls .update() directly). REVOKE/GRANT
--   at the column level cannot tell admin from non-admin within one role, so it would break admin
--   writes. A BEFORE UPDATE trigger keyed on is_admin() draws the line correctly.
--
-- BEHAVIOR (silent pinning, mirrors pin_callback_created_at):
--   - auth.uid() IS NULL      → trusted/service/system context: leave row unchanged (free).
--   - is_admin() true         → admin path: leave row unchanged (free).
--   - authenticated non-admin → pin admin_notes / called_at / completed_at back to OLD.
--   Only these three columns are touched; the owner's legitimate pending-row edits to their own
--   contact/preference columns are unaffected. status/user_id (RLS), created_at (pin_created_at) and
--   updated_at (shared trigger) are already protected and are NOT touched here.
--
-- search_path is pinned explicitly to keep function_search_path_mutable at zero (CLAUDE.md).
-- SECURITY INVOKER: identity comes from auth.uid(); is_admin() is itself SECURITY DEFINER. The
-- function is trigger-only and REVOKEd from PUBLIC (not directly callable).

CREATE OR REPLACE FUNCTION public.pin_callback_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Trusted/service context (no browser JWT) and admins keep full write access.
  -- Non-admin browser callers cannot mutate admin/audit-owned columns: pin them to OLD.
  IF (SELECT auth.uid()) IS NOT NULL AND NOT public.is_admin() THEN
    NEW.admin_notes  := OLD.admin_notes;
    NEW.called_at    := OLD.called_at;
    NEW.completed_at := OLD.completed_at;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.pin_callback_admin_fields() FROM PUBLIC;

-- BEFORE UPDATE only. Touches columns disjoint from the created_at pin ('p' sibling) and the
-- updated_at trigger, so same-timing trigger order is irrelevant — no trigger can undo another's
-- protection. No interaction with the BEFORE INSERT quota trigger.
CREATE TRIGGER trg_callback_requests_pin_admin_fields
  BEFORE UPDATE ON public.callback_requests
  FOR EACH ROW EXECUTE FUNCTION public.pin_callback_admin_fields();

-- ─── Fail loudly if anything is missing / regressed ──────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.callback_requests'::regclass
      AND tgname = 'trg_callback_requests_pin_admin_fields' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'F-10: admin-field pin trigger missing';
  END IF;

  -- Sibling protections MUST still be present (this migration must not disturb them).
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.callback_requests'::regclass
      AND tgname = 'trg_callback_requests_pin_created_at' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'F-10: trg_callback_requests_pin_created_at unexpectedly missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.callback_requests'::regclass
      AND tgname = 'trg_callback_requests_updated_at' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'F-10: trg_callback_requests_updated_at unexpectedly missing';
  END IF;
END $$;
