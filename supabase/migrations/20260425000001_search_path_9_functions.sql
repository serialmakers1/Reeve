-- Migration: Add SET search_path TO 'public' to 9 SECURITY DEFINER trigger functions
-- Prevents search_path injection attacks on functions that run with elevated privileges.
-- Bodies are byte-identical to current DB state — only the security header changes.
--
-- DOWN:
--   Re-run each CREATE OR REPLACE without the SET search_path line.
--   (No data is modified; rollback is safe at any point before/after apply.)

BEGIN;

-- ── 1. check_application_limits ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_application_limits()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  decided_count integer;
  latest_eligible timestamptz;
  active_count integer;
BEGIN
  -- For draft inserts: only block if an ACTIVE (non-terminal, non-draft) application exists.
  -- The NOT IN list must stay in sync with REAPPLICATION_ALLOWED_STATUSES in NewApplication.tsx.
  IF NEW.status = 'draft' THEN
    SELECT COUNT(*) INTO active_count
    FROM applications
    WHERE tenant_id = NEW.tenant_id
      AND property_id = NEW.property_id
      AND status NOT IN (
        'draft', 'owner_rejected', 'platform_rejected',
        'withdrawn', 'expired'
      );

    IF active_count > 0 THEN
      RAISE EXCEPTION 'Cannot create a new draft — an active application already exists for this property';
    END IF;

    RETURN NEW;
  END IF;

  -- Count attempts where a final decision was made (by owner or platform)
  -- withdrawn and expired are NOT counted — they are free redos
  SELECT COUNT(*) INTO decided_count
  FROM applications
  WHERE tenant_id = NEW.tenant_id
    AND property_id = NEW.property_id
    AND status IN ('owner_rejected', 'platform_rejected', 'owner_accepted');

  IF decided_count >= 3 THEN
    RAISE EXCEPTION 'Maximum applications reached for this property';
  END IF;

  -- Check cooldown from most recent rejection
  SELECT reapplication_eligible_from INTO latest_eligible
  FROM applications
  WHERE tenant_id = NEW.tenant_id
    AND property_id = NEW.property_id
    AND reapplication_eligible_from IS NOT NULL
  ORDER BY created_at DESC LIMIT 1;

  IF latest_eligible IS NOT NULL AND now() < latest_eligible THEN
    RAISE EXCEPTION 'Reapplication not allowed until %', latest_eligible;
  END IF;

  -- Auto-set attempt_number — exclude draft, withdrawn, expired (free redos)
  SELECT COUNT(*) + 1 INTO NEW.attempt_number
  FROM applications
  WHERE tenant_id = NEW.tenant_id
    AND property_id = NEW.property_id
    AND status NOT IN ('draft', 'withdrawn', 'expired');

  -- Auto-set previous_application_id to most recent counted row
  SELECT id INTO NEW.previous_application_id
  FROM applications
  WHERE tenant_id = NEW.tenant_id
    AND property_id = NEW.property_id
    AND status NOT IN ('draft', 'withdrawn', 'expired')
  ORDER BY created_at DESC LIMIT 1;

  RETURN NEW;
END;
$function$;

-- ── 2. check_no_show_limit ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_no_show_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.no_show_count >= 3 THEN
    NEW.visit_scheduling_blocked := true;
  END IF;
  RETURN NEW;
END;
$function$;

-- ── 3. handle_payment_refunded ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_payment_refunded()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_property_id uuid;
BEGIN
  IF NEW.status = 'refunded' AND OLD.status != 'refunded' AND NEW.application_id IS NOT NULL THEN

    SELECT property_id INTO v_property_id
    FROM applications WHERE id = NEW.application_id;

    UPDATE applications
    SET status = 'payment_pending', updated_at = now()
    WHERE id = NEW.application_id;

    UPDATE applications
    SET
      status = pre_hold_status,
      pre_hold_status = NULL,
      updated_at = now()
    WHERE property_id = v_property_id
      AND status = 'on_hold'
      AND pre_hold_status IS NOT NULL;

    UPDATE properties
    SET is_active = true, updated_at = now()
    WHERE id = v_property_id;

  END IF;
  RETURN NEW;
END;
$function$;

-- ── 4. handle_token_payment_received ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_token_payment_received()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'payment_received' AND OLD.status != 'payment_received' THEN

    UPDATE applications
    SET
      pre_hold_status = status,
      status = 'on_hold',
      updated_at = now()
    WHERE property_id = NEW.property_id
      AND id != NEW.id
      AND status NOT IN ('withdrawn', 'owner_rejected', 'platform_rejected', 'expired', 'on_hold', 'lease_active', 'draft');

    UPDATE properties
    SET is_active = false, updated_at = now()
    WHERE id = NEW.property_id;

  END IF;
  RETURN NEW;
END;
$function$;

-- ── 5. prevent_self_application ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_self_application()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM properties
    WHERE id = NEW.property_id
    AND owner_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'You cannot apply to your own listed property';
  END IF;
  RETURN NEW;
END;
$function$;

-- ── 6. prevent_tenant_updating_monthly_income ────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_tenant_updating_monthly_income()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins may update freely
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Block any non-admin attempt to change monthly_income
  IF (NEW.monthly_income IS DISTINCT FROM OLD.monthly_income) THEN
    RAISE EXCEPTION 'permission denied: monthly_income can only be updated by Reeve staff after income verification';
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 7. prevent_terminal_overwrite ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_terminal_overwrite()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('withdrawn', 'owner_rejected', 'platform_rejected', 'expired')
     AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'Cannot modify application % — status is terminal (%)', OLD.id, OLD.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- ── 8. recalculate_attempt_on_submit ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalculate_attempt_on_submit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only fire when a draft is being submitted
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN

    -- Recalculate attempt_number based on all decided/active rows excluding self and withdrawn/expired
    -- withdrawn = user-initiated redo, no attempt cost
    -- expired = system expiry, no attempt cost
    SELECT COUNT(*) + 1 INTO NEW.attempt_number
    FROM applications
    WHERE tenant_id = NEW.tenant_id
      AND property_id = NEW.property_id
      AND status NOT IN ('draft', 'withdrawn', 'expired')
      AND id != NEW.id;

    -- Recalculate previous_application_id to most recent non-draft, non-withdrawn, non-expired row
    SELECT id INTO NEW.previous_application_id
    FROM applications
    WHERE tenant_id = NEW.tenant_id
      AND property_id = NEW.property_id
      AND status NOT IN ('draft', 'withdrawn', 'expired')
      AND id != NEW.id
    ORDER BY created_at DESC LIMIT 1;

  END IF;
  RETURN NEW;
END;
$function$;

-- ── 9. set_rejection_cooldown ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_rejection_cooldown()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only fire when status changes TO a rejection status
  IF NEW.status IN ('owner_rejected', 'platform_rejected')
     AND OLD.status NOT IN ('owner_rejected', 'platform_rejected') THEN

    IF NEW.attempt_number = 1 THEN
      NEW.reapplication_eligible_from := now() + interval '2 days';
    ELSIF NEW.attempt_number = 2 THEN
      NEW.reapplication_eligible_from := now() + interval '7 days';
    -- attempt 3 rejection: no cooldown needed, trigger will block permanently
    END IF;

    -- Stamp the rejection timestamp
    IF NEW.status = 'platform_rejected' THEN
      NEW.platform_rejected_at := now();
    END IF;

  END IF;

  -- Stamp withdrawn_at when status changes to withdrawn
  IF NEW.status = 'withdrawn' AND OLD.status != 'withdrawn' THEN
    NEW.withdrawn_at := now();
  END IF;

  -- Stamp expired_at when status changes to expired
  IF NEW.status = 'expired' AND OLD.status != 'expired' THEN
    NEW.expired_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

-- ── Verification ──────────────────────────────────────────────────────────────
-- Expected: 9 rows with search_path=public in proconfig
SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'check_application_limits',
    'check_no_show_limit',
    'handle_payment_refunded',
    'handle_token_payment_received',
    'prevent_self_application',
    'prevent_tenant_updating_monthly_income',
    'prevent_terminal_overwrite',
    'recalculate_attempt_on_submit',
    'set_rejection_cooldown'
  )
  AND 'search_path=public' = ANY(proconfig)
ORDER BY proname;

COMMIT;
