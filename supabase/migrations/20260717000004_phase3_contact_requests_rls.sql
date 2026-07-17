-- Phase 3 Prompt 1 — contact_requests + email_send_log RLS + response-rate function.
-- Applied via Supabase MCP on 2026-07-17; documentation only.

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log   ENABLE ROW LEVEL SECURITY;

-- ── contact_requests policies ────────────────────────────────────────────────
-- Deliberate deviation from applications_select: NO `status <> 'draft'` clause.
-- contact_requests has no draft state, so nothing to exclude.
DROP POLICY IF EXISTS "contact_requests_select" ON public.contact_requests;
CREATE POLICY "contact_requests_select" ON public.contact_requests
  AS PERMISSIVE FOR SELECT
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR (owner_id = (SELECT auth.uid()))
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "contact_requests_insert" ON public.contact_requests;
CREATE POLICY "contact_requests_insert" ON public.contact_requests
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT auth.uid())
    AND owner_id <> (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "contact_requests_update" ON public.contact_requests;
CREATE POLICY "contact_requests_update" ON public.contact_requests
  AS PERMISSIVE FOR UPDATE
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR (owner_id = (SELECT auth.uid()))
    OR (SELECT public.is_admin())
  );

-- No DELETE policy: contact_requests are immutable audit records.

-- ── email_send_log policies ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "email_send_log_admin_select" ON public.email_send_log;
CREATE POLICY "email_send_log_admin_select" ON public.email_send_log
  AS PERMISSIVE FOR SELECT
  USING ((SELECT public.is_admin()));

-- No INSERT/UPDATE/DELETE policies: service_role bypasses RLS for webhook writes.

-- ── get_owner_response_rate ──────────────────────────────────────────────────
-- "Responded" = approved OR declined. pending / withdrawn / auto_cancelled are
-- excluded from the denominator (they represent no owner action).
CREATE OR REPLACE FUNCTION public.get_owner_response_rate(p_owner_id uuid)
  RETURNS TABLE (
    all_time_total       integer,
    all_time_responded   integer,
    all_time_rate        numeric,
    last_7d_total        integer,
    last_7d_responded    integer,
    last_7d_rate         numeric
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT status, created_at
    FROM public.contact_requests
    WHERE owner_id = p_owner_id
  ),
  all_time AS (
    SELECT
      COUNT(*)::integer                                                      AS total,
      COUNT(*) FILTER (WHERE status IN ('approved','declined'))::integer     AS responded
    FROM base
  ),
  last_7d AS (
    SELECT
      COUNT(*)::integer                                                      AS total,
      COUNT(*) FILTER (WHERE status IN ('approved','declined'))::integer     AS responded
    FROM base
    WHERE created_at >= now() - interval '7 days'
  )
  SELECT
    a.total,
    a.responded,
    CASE WHEN a.total = 0 THEN 0 ELSE ROUND((a.responded::numeric / a.total) * 100, 1) END,
    w.total,
    w.responded,
    CASE WHEN w.total = 0 THEN 0 ELSE ROUND((w.responded::numeric / w.total) * 100, 1) END
  FROM all_time a CROSS JOIN last_7d w;
$function$;

GRANT EXECUTE ON FUNCTION public.get_owner_response_rate(uuid) TO authenticated, anon;
