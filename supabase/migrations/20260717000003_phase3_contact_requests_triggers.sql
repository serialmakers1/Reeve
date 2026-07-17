-- Phase 3 Prompt 1 — contact_requests triggers + supporting functions.
-- Applied via Supabase MCP on 2026-07-17; documentation only.

-- ── 1. check_contact_request_limits ──────────────────────────────────────────
-- Adapted from check_application_limits() with 4 documented divergences:
--   (1) only 'declined' burns an attempt — 'withdrawn' and 'auto_cancelled' are free retries
--   (2) flat 24h cooldown after each decline (not PM's escalating 2d/7d/permanent ladder)
--   (3) no previous_request_id FK — attempts linked by (tenant_id, property_id, attempt_number)
--   (4) no draft state — no draft guard clause
-- Additional Phase-3 rule: 10 requests/calendar-day IST per tenant global rate limit.
CREATE OR REPLACE FUNCTION public.check_contact_request_limits()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  declined_count       integer;
  latest_decline_at    timestamptz;
  today_ist_count      integer;
BEGIN
  -- Per-property cap: max 3 attempts, counting only owner declines.
  SELECT COUNT(*) INTO declined_count
  FROM contact_requests
  WHERE tenant_id = NEW.tenant_id
    AND property_id = NEW.property_id
    AND status = 'declined';

  IF declined_count >= 3 THEN
    RAISE EXCEPTION 'Maximum contact requests reached for this property';
  END IF;

  -- Per-property cooldown: flat 24h after most recent decline.
  SELECT MAX(declined_at) INTO latest_decline_at
  FROM contact_requests
  WHERE tenant_id = NEW.tenant_id
    AND property_id = NEW.property_id
    AND status = 'declined';

  IF latest_decline_at IS NOT NULL AND now() < latest_decline_at + interval '24 hours' THEN
    RAISE EXCEPTION 'Contact request cooldown active until %', latest_decline_at + interval '24 hours';
  END IF;

  -- Global daily rate limit: 10 requests / calendar day IST per tenant.
  SELECT COUNT(*) INTO today_ist_count
  FROM contact_requests
  WHERE tenant_id = NEW.tenant_id
    AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date;

  IF today_ist_count >= 10 THEN
    RAISE EXCEPTION 'Daily contact request limit (10) reached';
  END IF;

  -- Auto-set attempt_number: number of prior (tenant, property) rows + 1.
  -- No exclusion list — every prior row (declined, withdrawn, auto_cancelled, etc.)
  -- consumes an attempt-number slot even though only 'declined' counts toward the 3-cap.
  -- If we ever want withdrawn/auto_cancelled to not increment attempt_number, revisit here.
  SELECT COUNT(*) + 1 INTO NEW.attempt_number
  FROM contact_requests
  WHERE tenant_id = NEW.tenant_id
    AND property_id = NEW.property_id;

  IF NEW.attempt_number > 3 THEN
    RAISE EXCEPTION 'Attempt number exceeds cap of 3';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contact_request_limits ON public.contact_requests;
CREATE TRIGGER trg_contact_request_limits
  BEFORE INSERT ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_contact_request_limits();

-- ── 2. auto_cancel_requests_on_archive ───────────────────────────────────────
-- Fires only on transition INTO 'archived'. Sets all pending requests for the
-- property to auto_cancelled. unlisted / changes_requested / edit_pending_review
-- do NOT trigger this — those states keep requests alive with contextual UI.
CREATE OR REPLACE FUNCTION public.auto_cancel_requests_on_archive()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived' THEN
    UPDATE public.contact_requests
       SET status = 'auto_cancelled',
           auto_cancelled_at = now()
     WHERE property_id = NEW.id
       AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_cancel_requests_on_archive ON public.properties;
CREATE TRIGGER trg_auto_cancel_requests_on_archive
  AFTER UPDATE OF status ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.auto_cancel_requests_on_archive();

-- ── 3. set_contact_request_event_timestamps ──────────────────────────────────
-- Sets declined_at / approved_at / withdrawn_at / auto_cancelled_at on the
-- first transition into each state. Guarded by OLD.status check so each
-- timestamp is written exactly once and never overwritten.
CREATE OR REPLACE FUNCTION public.set_contact_request_event_timestamps()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'declined'      AND OLD.status IS DISTINCT FROM 'declined'      AND NEW.declined_at IS NULL      THEN NEW.declined_at      := now(); END IF;
  IF NEW.status = 'approved'      AND OLD.status IS DISTINCT FROM 'approved'      AND NEW.approved_at IS NULL      THEN NEW.approved_at      := now(); END IF;
  IF NEW.status = 'withdrawn'     AND OLD.status IS DISTINCT FROM 'withdrawn'     AND NEW.withdrawn_at IS NULL     THEN NEW.withdrawn_at     := now(); END IF;
  IF NEW.status = 'auto_cancelled' AND OLD.status IS DISTINCT FROM 'auto_cancelled' AND NEW.auto_cancelled_at IS NULL THEN NEW.auto_cancelled_at := now(); END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contact_request_event_timestamps ON public.contact_requests;
CREATE TRIGGER trg_contact_request_event_timestamps
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_contact_request_event_timestamps();

-- ── 4. set_contact_requests_updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_contact_requests_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contact_requests_updated_at ON public.contact_requests;
CREATE TRIGGER trg_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_contact_requests_updated_at();
