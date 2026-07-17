-- Phase 3 Prompt 2 — tenant daily rate-limit helper functions.
-- Applied via MCP on 2026-07-17. Not to be re-run against production; this file
-- is a documentation-only mirror so a fresh `supabase db reset` in dev converges.
--
-- Both functions anchor "today" to Asia/Kolkata (IST) calendar day, matching
-- check_contact_request_limits()'s enforcement window (D-P3-006).

-- ── get_tenant_daily_request_count ───────────────────────────────────────────
-- Server-side / edge-function callable. Returns how many contact_requests the
-- given tenant has submitted so far today (IST). auto_cancelled excluded — those
-- represent property-side teardown, not tenant activity that should count.
CREATE OR REPLACE FUNCTION public.get_tenant_daily_request_count(p_tenant_id uuid)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.contact_requests
  WHERE tenant_id = p_tenant_id
    AND status <> 'auto_cancelled'
    AND (created_at AT TIME ZONE 'Asia/Kolkata')::date
        = (now() AT TIME ZONE 'Asia/Kolkata')::date;
$function$;

GRANT EXECUTE ON FUNCTION public.get_tenant_daily_request_count(uuid) TO service_role;

-- ── get_my_daily_request_remaining ───────────────────────────────────────────
-- Client-callable. Uses auth.uid() internally so authenticated tenants can poll
-- their own remaining quota without exposing anyone else's count. Returns
-- GREATEST(0, 10 - today's count) — the 10/day cap lives in D-P3-006.
CREATE OR REPLACE FUNCTION public.get_my_daily_request_remaining()
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT GREATEST(
    0,
    10 - COUNT(*)::integer
  )
  FROM public.contact_requests
  WHERE tenant_id = auth.uid()
    AND status <> 'auto_cancelled'
    AND (created_at AT TIME ZONE 'Asia/Kolkata')::date
        = (now() AT TIME ZONE 'Asia/Kolkata')::date;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_daily_request_remaining() TO authenticated;
