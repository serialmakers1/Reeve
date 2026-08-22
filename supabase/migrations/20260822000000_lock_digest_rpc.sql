-- Group 1: Make get_pending_requests_for_digest() backend-only.
-- Revoke the default PUBLIC grant AND any explicit anon/authenticated grants
-- (live DB confirmed all three have EXECUTE). service_role retains EXECUTE
-- for the digest-pending-requests Edge Function's internal call.
-- postgres (function owner) retains access implicitly.
--
-- Safe to deploy before n8n cutover: the current Daily Digest workflow calls
-- this RPC with service_role, which keeps EXECUTE throughout.
--
-- Rollback: if the Edge Function path fails, switch n8n back to the old
-- PostgREST URL with service_role credentials. Do NOT re-grant to PUBLIC.

REVOKE EXECUTE ON FUNCTION public.get_pending_requests_for_digest()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_pending_requests_for_digest()
  TO service_role;

-- Verification (run after applying in Supabase SQL editor):
-- SELECT
--   has_function_privilege('anon', 'public.get_pending_requests_for_digest()', 'EXECUTE') AS anon_expect_false,
--   has_function_privilege('authenticated', 'public.get_pending_requests_for_digest()', 'EXECUTE') AS auth_expect_false,
--   has_function_privilege('service_role', 'public.get_pending_requests_for_digest()', 'EXECUTE') AS svc_expect_true;
