-- Group 5 Follow-Up: fix one remaining bare auth.uid() in contact_requests_insert.
--
-- Migration 20260823000006 resolved all 42 originally identified auth_rls_initplan
-- findings. A subsequent raw pg_policies scan found one partially-optimized policy
-- that predated Group 5 and was not in its scope:
--
--   contact_requests_insert WITH CHECK:
--     (auth.uid() IS NOT NULL)               ← bare — this is the only change
--     AND (tenant_id = (SELECT auth.uid()))   ← already wrapped
--     AND (owner_id <> (SELECT auth.uid()))   ← already wrapped
--
-- The single change: wrap the IS NOT NULL guard to match the other two occurrences.
-- Security semantics are identical — auth.uid() is statement-constant; the NULL
-- branch (unauthenticated callers) evaluates identically in both forms.
--
-- Mechanism: ALTER POLICY only. No DROP/CREATE. No other policy, table, or
-- function changes. No CASCADE.

ALTER POLICY contact_requests_insert ON public.contact_requests
  WITH CHECK (
    ((SELECT auth.uid()) IS NOT NULL)
    AND (tenant_id = (SELECT auth.uid()))
    AND (owner_id <> (SELECT auth.uid()))
  );
