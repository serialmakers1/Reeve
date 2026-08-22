-- Group 4 Phase 4B: revoke broad EXECUTE grants from backend/helper functions.
--
-- get_tenant_daily_request_count: retains service_role (called by submit-contact-request
-- edge function). All other callers removed; anon/authenticated/PUBLIC revoked.
--
-- Remaining six are internal helpers with zero legitimate non-postgres callers:
-- rls_auto_enable() is invoked only by the ensure_rls DDL event trigger mechanism.
-- _build_rating_side_v2, generate_pseudonym, reeve_custom_* are called exclusively
-- from SECURITY DEFINER functions that run as postgres.
--
-- Safety: no function bodies, triggers, event triggers, RLS, search_path, or SECURITY
-- modes change. No ALTER DEFAULT PRIVILEGES.

-- ── get_tenant_daily_request_count — postgres + service_role ─────────────────

REVOKE ALL ON FUNCTION public.get_tenant_daily_request_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_tenant_daily_request_count(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_tenant_daily_request_count(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_daily_request_count(uuid) TO service_role;

-- ── rls_auto_enable — postgres only ──────────────────────────────────────────

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM service_role;

-- ── _build_rating_side_v2 — postgres only ────────────────────────────────────

REVOKE ALL ON FUNCTION public._build_rating_side_v2(bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._build_rating_side_v2(bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint) FROM anon;
REVOKE ALL ON FUNCTION public._build_rating_side_v2(bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint) FROM authenticated;
REVOKE ALL ON FUNCTION public._build_rating_side_v2(bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint) FROM service_role;

-- ── generate_pseudonym — postgres only ───────────────────────────────────────

REVOKE ALL ON FUNCTION public.generate_pseudonym() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_pseudonym() FROM anon;
REVOKE ALL ON FUNCTION public.generate_pseudonym() FROM authenticated;
REVOKE ALL ON FUNCTION public.generate_pseudonym() FROM service_role;

-- ── reeve_custom_building_amenities — postgres only ──────────────────────────

REVOKE ALL ON FUNCTION public.reeve_custom_building_amenities(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reeve_custom_building_amenities(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.reeve_custom_building_amenities(jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.reeve_custom_building_amenities(jsonb) FROM service_role;

-- ── reeve_custom_furnishing_names — postgres only ────────────────────────────

REVOKE ALL ON FUNCTION public.reeve_custom_furnishing_names(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reeve_custom_furnishing_names(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.reeve_custom_furnishing_names(jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.reeve_custom_furnishing_names(jsonb) FROM service_role;

-- ── reeve_introduces_new_custom — postgres only ──────────────────────────────

REVOKE ALL ON FUNCTION public.reeve_introduces_new_custom(jsonb,jsonb,jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reeve_introduces_new_custom(jsonb,jsonb,jsonb,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.reeve_introduces_new_custom(jsonb,jsonb,jsonb,jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.reeve_introduces_new_custom(jsonb,jsonb,jsonb,jsonb) FROM service_role;
