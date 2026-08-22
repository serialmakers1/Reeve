-- Group 4 Phase 4D: revoke broad EXECUTE grants from authenticated-user RPCs.
--
-- All seven are called exclusively by the authenticated frontend or an Edge
-- Function using the caller's own JWT (authenticated role). No Edge Function,
-- pg_cron, n8n, or backend service calls any of these with service_role.
-- All seven verify auth.uid() and/or ownership before privileged data access.
--
-- Target ACL for all seven: postgres (owner, implicit) + authenticated only.
--
-- Safety: no function bodies, triggers, RLS, search_path, or SECURITY modes
-- change. No ALTER DEFAULT PRIVILEGES. No CASCADE.

-- ── cancel_pending_edit_request ───────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.cancel_pending_edit_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_pending_edit_request(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_pending_edit_request(uuid) FROM service_role;

-- ── delete_property_photo ─────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.delete_property_photo(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_property_photo(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_property_photo(uuid) FROM service_role;

-- ── get_my_daily_request_remaining ───────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_my_daily_request_remaining() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_daily_request_remaining() FROM anon;
REVOKE ALL ON FUNCTION public.get_my_daily_request_remaining() FROM service_role;

-- ── get_pending_ratings_for_me ────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.get_pending_ratings_for_me() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_ratings_for_me() FROM anon;
REVOKE ALL ON FUNCTION public.get_pending_ratings_for_me() FROM service_role;

-- ── set_primary_property_photo ────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.set_primary_property_photo(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_primary_property_photo(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.set_primary_property_photo(uuid) FROM service_role;

-- ── submit_property_edit_request ─────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.submit_property_edit_request(uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_property_edit_request(uuid, jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.submit_property_edit_request(uuid, jsonb, jsonb) FROM service_role;

-- ── toggle_comment_like ───────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.toggle_comment_like(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_comment_like(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.toggle_comment_like(uuid) FROM service_role;
