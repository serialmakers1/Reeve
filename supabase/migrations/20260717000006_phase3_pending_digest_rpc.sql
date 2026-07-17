-- Applied via MCP on 2026-07-17. Not to be re-run against production.
-- Phase 3: Scoped digest RPC for n8n Contact Daily Digest workflow.
-- SECURITY DEFINER + fixed shape = safe to grant to anon.
-- No service_role key in n8n — this RPC is the secure alternative.

CREATE OR REPLACE FUNCTION public.get_pending_requests_for_digest()
RETURNS TABLE (
  owner_user_id     uuid,
  owner_email       varchar,
  owner_name        varchar,
  new_request_count bigint,
  new_requests      jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    u.id                                 AS owner_user_id,
    u.email                              AS owner_email,
    u.full_name                          AS owner_name,
    COUNT(cr.id)                         AS new_request_count,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'building_name',   p.building_name,
        'locality',        p.locality,
        'tenant_display',  COALESCE(prof.display_name, tenant_u.full_name),
        'attempt_number',  cr.attempt_number,
        'created_at',      cr.created_at
      )
      ORDER BY cr.created_at DESC
    )                                    AS new_requests
  FROM public.contact_requests cr
  JOIN public.properties p         ON p.id = cr.property_id
  JOIN public.users u              ON u.id = cr.owner_id
  JOIN public.users tenant_u       ON tenant_u.id = cr.tenant_id
  LEFT JOIN public.profiles prof   ON prof.user_id = cr.tenant_id
  WHERE cr.status = 'pending'
    AND cr.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY u.id, u.email, u.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_requests_for_digest() TO anon, authenticated;
