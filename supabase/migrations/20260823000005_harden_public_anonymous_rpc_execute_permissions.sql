-- Group 4 Phase 4E: revoke broad EXECUTE grants from public/anonymous RPCs.
--
-- Group 1 (5 functions): PUBLIC + service_role revoked; anon + authenticated retained.
-- These are legitimately called by anonymous/public browsing via PostgREST (anon role).
-- PUBLIC is redundant with the explicit anon grant and widens surface to all DB roles.
-- service_role has no call path for any of these five.
--
-- Group 2 (1 function): get_user_rating_summary v1 — dead function, zero live callers.
-- All callers migrated to v2. SECURITY DEFINER on a ratings table with PUBLIC EXECUTE
-- is unnecessary attack surface. Locked to postgres only. NOT dropped (ratings = HOLD).
--
-- Group 3 (4 functions): no PUBLIC grant already; only service_role revoked.
-- anon + authenticated retained for public search/profile browsing.
--
-- Safety: no function bodies, CREATE OR REPLACE, DROP, triggers, event triggers,
-- RLS, search_path, SECURITY modes, or ALTER DEFAULT PRIVILEGES. No CASCADE.

-- ── Group 1: public browsing RPCs — REVOKE PUBLIC + service_role ──────────────

-- ── get_owner_response_rate ───────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_owner_response_rate(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_response_rate(uuid) FROM service_role;

-- ── get_property_comments ─────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_property_comments(uuid, timestamp with time zone, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_property_comments(uuid, timestamp with time zone, integer) FROM service_role;

-- ── get_property_counts ───────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_property_counts(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_property_counts(uuid[]) FROM service_role;

-- ── get_property_public_stats ─────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_property_public_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_property_public_stats(uuid) FROM service_role;

-- ── track_property_view ───────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.track_property_view(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_property_view(uuid, text) FROM service_role;

-- ── Group 2: dead v1 rating function — REVOKE ALL (postgres only) ─────────────

REVOKE ALL ON FUNCTION public.get_user_rating_summary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_rating_summary(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_rating_summary(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_user_rating_summary(uuid) FROM service_role;

-- ── Group 3: existing public RPCs without PUBLIC — REVOKE service_role only ───

-- ── get_user_rating_summary_v2 ────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_user_rating_summary_v2(uuid) FROM service_role;

-- ── reeve_search_geo_by_ids ───────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.reeve_search_geo_by_ids(uuid[]) FROM service_role;

-- ── reeve_search_geo_suggest ──────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.reeve_search_geo_suggest(text, text[], uuid, uuid, integer) FROM service_role;

-- ── search_compact_properties_v3 ─────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.search_compact_properties_v3(
  property_listing_type, text, text[], text[], numeric, numeric, date, integer, integer,
  numeric, integer, integer, numeric, numeric, text[], text[], date, boolean, numeric,
  numeric, numeric, numeric, text[], text[], text[], boolean, numeric, boolean, text,
  timestamp with time zone, uuid, timestamp with time zone, numeric, integer, boolean,
  numeric, numeric, boolean, text[], boolean, uuid[], numeric
) FROM service_role;
