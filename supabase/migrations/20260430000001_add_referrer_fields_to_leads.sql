-- Add referrer identity fields and relax NOT NULL constraints on leads.
--
-- Rationale:
--   The refer-property page no longer requires login. Tenants who happen to
--   be signed in are linked via referred_by_tenant_id; anonymous submitters
--   identify themselves via referrer_name + referrer_phone instead.
--
--   owner_name and property_address are now optional (owner may be unknown
--   and the address is captured via building_name + locality fields).
--
-- RLS INSERT policy tightened:
--   Old: `WITH CHECK ((SELECT auth.uid()) IS NOT NULL)`
--        → any authenticated user could forge another user's referred_by_tenant_id.
--   New: anonymous inserts allowed (referred_by_tenant_id IS NULL),
--        but if a tenant_id is supplied it MUST equal the caller's auth.uid().
--
-- DOWN:
--   DROP COLUMN referrer_name, referrer_phone;
--   ALTER COLUMN referred_by_tenant_id SET NOT NULL;
--   ALTER COLUMN owner_name SET NOT NULL;
--   ALTER COLUMN property_address SET NOT NULL;
--   Recreate original `leads_insert` policy with (SELECT auth.uid()) IS NOT NULL.

BEGIN;

-- ── Schema changes ────────────────────────────────────────────────────────────

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS referrer_name    text,
  ADD COLUMN IF NOT EXISTS referrer_phone   text;

ALTER TABLE public.leads
  ALTER COLUMN referred_by_tenant_id DROP NOT NULL,
  ALTER COLUMN owner_name             DROP NOT NULL,
  ALTER COLUMN property_address       DROP NOT NULL;

-- ── RLS: replace INSERT policy ────────────────────────────────────────────────

DROP POLICY IF EXISTS "leads_insert" ON public.leads;

CREATE POLICY "leads_insert" ON public.leads
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    referred_by_tenant_id IS NULL
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND referred_by_tenant_id = (SELECT auth.uid())
    )
  );

COMMIT;
