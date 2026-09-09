-- SEC-AUDIT-02 — Restrict the initial state of owner-created properties on INSERT.
--
-- PROBLEM
-- The properties_insert RLS policy (the sole INSERT policy on public.properties)
-- enforced only ownership at INSERT time:
--     WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND owner_id = (SELECT auth.uid()))
-- authenticated holds table + column INSERT on status and is_active; is_active
-- defaults to true; and the INSERT branch of enforce_property_owner_transitions
-- enforces only the 20-draft-per-owner limit. Every publication / owner-edit /
-- publish-location guard is UPDATE-only. Net effect: a non-admin authenticated user
-- could POST directly to /rest/v1/properties with status='listed' or
-- 'edit_pending_review' and is_active=true (or omitted, defaulting true) and create a
-- brand-new row that immediately satisfies the public SELECT predicate
-- (status IN ('listed','edit_pending_review') AND is_active), bypassing the intended
-- draft -> submit -> admin-review lifecycle.
--
-- SCOPE (verified live + in-repo before writing this migration)
-- - properties_insert is the ONLY INSERT policy on public.properties (PERMISSIVE,
--   roles {public}); no OR-composed second policy can re-open the path.
-- - The only production INSERT writer is src/pages/ListProperty.tsx:1147, which
--   already sends exactly status='draft', is_active=false. No .insert/.upsert into
--   properties exists elsewhere in src/, api/, or supabase/functions/ (admin/relist
--   are UPDATEs). So requiring draft+inactive for ordinary owners breaks no
--   legitimate writer.
-- - Multiple total/listed properties and the 20-draft limit are per-row / trigger
--   concerns untouched by this WITH CHECK.
--
-- FIX
-- Ordinary (non-admin) owner INSERTs must begin in the safe initial state
-- (status='draft', is_active=false). Admins retain their existing latitude via an
-- is_admin() branch. The pre-existing ownership constraint is preserved verbatim for
-- everyone, including admins (own-row only, exactly as today). This is an INSERT-only
-- authorization change: UPDATE policy, all lifecycle triggers, the draft-limit,
-- the owner-edit partition, grants, defaults, and edit_pending_review visibility for
-- existing listings are all deliberately unchanged.
--
-- EXISTING DATA
-- Zero impact. WITH CHECK is evaluated only against rows being written by future
-- INSERTs; it never validates or mutates existing rows.
--
-- PRIOR PREDICATE (recorded for a future compensating migration only; must NOT be
-- restored as-is because it re-opens SEC-AUDIT-02):
--     ((SELECT auth.uid()) IS NOT NULL AND owner_id = (SELECT auth.uid()))

ALTER POLICY properties_insert ON public.properties
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND owner_id = (SELECT auth.uid())
    AND (
      (SELECT public.is_admin())
      OR (status = 'draft'::property_status AND is_active = false)
    )
  );
