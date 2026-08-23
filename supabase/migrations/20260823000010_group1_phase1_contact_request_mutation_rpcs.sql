-- Group 1 (Phase 1 + Phase 2, combined release): secure contact-request
-- mutation paths and permanently close generic client writes.
--
-- Purpose (diagnosis references SEC-001 / SEC-006 / SEC-010):
--   * Introduce purpose-scoped RPCs for the two legitimate client-driven status
--     transitions so the frontend no longer relies on generic direct UPDATE:
--       - withdraw_contact_request(uuid)                 tenant: pending -> withdrawn
--       - decline_contact_request(uuid, decline_reason)  owner:  pending -> declined
--   * Close unnecessary direct client INSERT into contact_requests (the trusted
--     path is the submit-contact-request Edge Function running as service_role).
--   * Tighten the INSERT RLS policy with an owner_id <-> property_id ownership
--     binding as defense-in-depth (SEC-006), so the gap cannot silently reopen
--     if INSERT privilege were ever re-granted.
--
-- Phase 2 (section E below, same migration — combined release): generic UPDATE
-- is revoked from anon/authenticated and the broad contact_requests_update
-- policy is dropped, permanently closing SEC-001. service_role (edge functions,
-- auto-cancel) and postgres (the SECURITY DEFINER RPC owner) retain UPDATE, so
-- every trusted mutation path keeps working. After this migration the client
-- mutation surface is: SELECT (read), submit-contact-request (submit),
-- reveal-contact (approve), decline_contact_request RPC, withdraw_contact_request
-- RPC, resend-reveal (resend). Direct client INSERT/UPDATE/DELETE are all blocked.
--
-- RPCs are SECURITY DEFINER (owner postgres) specifically so they keep working
-- after Phase 2 revokes UPDATE from authenticated; a SECURITY INVOKER function
-- would break then. search_path is pinned empty with every object fully
-- qualified. The transition is a single conditional UPDATE guarded on
-- status = 'pending', making it atomic and race-safe; FOUND distinguishes the
-- allowed vs not-allowed outcome without leaking row existence/ownership.

-- ── A. withdraw_contact_request — tenant only, pending -> withdrawn ──────────
CREATE OR REPLACE FUNCTION public.withdraw_contact_request(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.contact_requests
     SET status = 'withdrawn'
   WHERE id = p_id
     AND tenant_id = (SELECT auth.uid())
     AND status = 'pending';

  IF NOT FOUND THEN
    -- Generic error: do not reveal whether the row exists, belongs to another
    -- user, or is already in a terminal state.
    RAISE EXCEPTION 'not_allowed';
  END IF;
END;
$$;

ALTER FUNCTION public.withdraw_contact_request(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.withdraw_contact_request(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_contact_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.withdraw_contact_request(uuid) IS
  'Group 1 Phase 1. Tenant-only pending->withdrawn transition. SECURITY DEFINER so it survives Phase 2 UPDATE revocation. Atomic conditional UPDATE guarded on status=pending; existing triggers set withdrawn_at/updated_at. authenticated-only EXECUTE.';

-- ── B. decline_contact_request — owner only, pending -> declined ─────────────
CREATE OR REPLACE FUNCTION public.decline_contact_request(
  p_id uuid,
  p_reason public.contact_request_decline_reason
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.contact_requests
     SET status = 'declined',
         decline_reason = p_reason
   WHERE id = p_id
     AND owner_id = (SELECT auth.uid())
     AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
END;
$$;

ALTER FUNCTION public.decline_contact_request(uuid, public.contact_request_decline_reason) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.decline_contact_request(uuid, public.contact_request_decline_reason)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_contact_request(uuid, public.contact_request_decline_reason) TO authenticated;

COMMENT ON FUNCTION public.decline_contact_request(uuid, public.contact_request_decline_reason) IS
  'Group 1 Phase 1. Owner-only pending->declined transition. p_reason is the templated decline_reason enum (Postgres rejects non-templated values at the boundary; no free text). SECURITY DEFINER so it survives Phase 2 UPDATE revocation. Atomic conditional UPDATE guarded on status=pending; existing triggers set declined_at/updated_at. authenticated-only EXECUTE.';

-- ── C. Close direct client INSERT ───────────────────────────────────────────
-- The trusted insertion path is the submit-contact-request Edge Function
-- (service_role, which bypasses grants + RLS). No browser role needs INSERT.
-- SELECT is left untouched; UPDATE is revoked in section E below.
REVOKE INSERT ON public.contact_requests FROM anon, authenticated;

-- ── D. Tighten INSERT RLS policy (defense-in-depth, SEC-006) ────────────────
-- Even with the grant revoked, keep a correctly-constrained policy so the
-- owner_id <-> property_id binding cannot silently regress if INSERT were ever
-- re-granted. service_role is unaffected (bypasses RLS). Wrapped auth.uid()
-- preserved to avoid an auth_rls_initplan regression.
DROP POLICY IF EXISTS contact_requests_insert ON public.contact_requests;

CREATE POLICY contact_requests_insert ON public.contact_requests
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND tenant_id = (SELECT auth.uid())
    AND owner_id <> (SELECT auth.uid())
    AND owner_id = (SELECT p.owner_id FROM public.properties p WHERE p.id = property_id)
  );

-- ── E. Close generic client UPDATE (Phase 2 — permanently closes SEC-001) ────
-- No browser role should directly UPDATE contact_requests: the two RPCs above,
-- reveal-contact, submit-contact-request, and the system auto-cancel path own
-- every legitimate transition. service_role (edge functions, auto-cancel) and
-- postgres (SECURITY DEFINER RPC owner) bypass this revocation and keep working.
REVOKE UPDATE ON public.contact_requests FROM anon, authenticated;

-- The broad participant UPDATE policy is obsolete once no client role can UPDATE.
-- Not replaced (and no state-machine trigger added) — each trusted path already
-- governs its own transition; a general trigger would only add risk around
-- service-role/internal writes.
DROP POLICY IF EXISTS contact_requests_update ON public.contact_requests;
