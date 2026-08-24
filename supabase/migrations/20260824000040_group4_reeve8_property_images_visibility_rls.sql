-- Group 4 / REEVE-8 fix — decouple property_images SELECT RLS from caller-level
-- access to public.properties.
--
-- ROOT CAUSE (confirmed + reproduced against the live DB):
--   property_images_select_public evaluated
--     EXISTS (SELECT 1 FROM properties WHERE ... AND is_active = true)
--   as the CALLER. Group 3 (20260824000030 / ...000010) revoked SELECT on
--   properties.is_active from authenticated/anon (correctly — it is an internal
--   flag). Because permissive SELECT policies are OR-combined and Postgres
--   privilege-checks the UNION of columns referenced across all of them, EVERY
--   property_images SELECT (owner/public/admin) failed with
--   42501 "permission denied for table properties" → 403 → images disappeared.
--
-- FIX: evaluate visibility/ownership through SECURITY DEFINER helpers so the
-- property_images SELECT policies no longer read protected properties columns as
-- the caller. Group 3 boundary is preserved (is_active stays revoked; the 65-col
-- allow-list, properties grants, and properties RLS are untouched). Group 2 image
-- deletion is untouched.
--
-- Canonical public/live rule (verified identical in properties_select,
-- get_owner_card, search_compact_properties_v3, and the pre-fix public policy):
--     status IN ('listed','edit_pending_review') AND is_active = true
-- edit_pending_review is intentionally public (approved listing stays live while
-- edits await review).
--
-- NOT executed anywhere before review. Deploy separately after review.

-- ── Step 1: Non-exposed schema for internal RLS helpers ──────────────────────
-- `private` is not in PostgREST's exposed schemas (public, graphql_public), so
-- functions here are NOT reachable as REST RPCs. USAGE is required for RLS to
-- resolve the helper during policy evaluation as the invoking role.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

-- ── Step 2: Public-visibility helper (SECURITY DEFINER) ──────────────────────
-- Mirrors the canonical public/live rule exactly. Runs as the function owner
-- (postgres), so it can read properties.is_active without the caller holding that
-- grant. Returns a boolean only — no property data is exposed. search_path is
-- pinned empty with fully-qualified references (same hardening as get_owner_card).

CREATE OR REPLACE FUNCTION private.is_property_publicly_visible(prop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = prop_id
      AND p.status = ANY (ARRAY['listed'::public.property_status,
                                'edit_pending_review'::public.property_status])
      AND p.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION private.is_property_publicly_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_property_publicly_visible(uuid) TO anon, authenticated;

-- ── Step 3: Public image SELECT policy — no caller-level properties access ────

ALTER POLICY property_images_select_public ON public.property_images
  USING (private.is_property_publicly_visible(property_id));

-- ── Step 4: Owner image SELECT policy — decouple from caller properties grants ─
-- Reuse the existing hardened SECURITY DEFINER helper. Ownership only — no
-- publication-status condition, so owners keep seeing images for ALL of their own
-- properties' statuses (draft, pending_review, changes_requested, listed,
-- edit_pending_review, unlisted, archived).

ALTER POLICY property_images_select_owner ON public.property_images
  USING (public.is_property_owner(property_id));

-- property_images_select_admin (is_admin()) is already safe and is left unchanged.
-- property_images INSERT/UPDATE/DELETE policies are not affected by this bug and
-- are left unchanged (Group 2 image-deletion boundary preserved).
