-- Group 4 Phase 4C: revoke broad EXECUTE grants from admin-only RPC functions.
--
-- All four are SECURITY DEFINER functions called exclusively by the authenticated
-- admin frontend. They call is_admin() as their first statement before any data
-- access or mutation. No Edge Function, pg_cron, n8n, or backend service calls
-- any of them, so service_role is unnecessary.
--
-- Target ACL for all four: postgres (owner, implicit) + authenticated only.
--
-- Safety: no function bodies, triggers, RLS, search_path, or SECURITY modes change.
-- No ALTER DEFAULT PRIVILEGES. No CASCADE.

-- ── admin_delete_draft_property ───────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.admin_delete_draft_property(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_draft_property(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_delete_draft_property(uuid) FROM service_role;

-- ── approve_edit_request ──────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.approve_edit_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_edit_request(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.approve_edit_request(uuid) FROM service_role;

-- ── reject_edit_request ───────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.reject_edit_request(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_edit_request(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.reject_edit_request(uuid, text, text) FROM service_role;

-- ── reject_property_listing ───────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.reject_property_listing(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_property_listing(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.reject_property_listing(uuid, text, text) FROM service_role;
