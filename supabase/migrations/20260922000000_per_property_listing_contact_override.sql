-- Per-property lister/owner contact override.
--
-- One operator account owns many properties on behalf of different real-world
-- owners; properties.owner_id stays the operator account for all authorization.
-- Each property may optionally carry its OWN public lister name and a PRIVATE
-- owner phone used by the existing contact-reveal workflow.
--
-- Design (approved):
--   * two nullable columns on public.properties (no default, no backfill);
--   * name surfaced only via get_owner_card() (SECURITY DEFINER, reads the column
--     without a public grant); phone read only server-side by the reveal Edge
--     Functions via service_role;
--   * NEITHER column is added to the anon/authenticated SELECT allow-list, so
--     ordinary browser property queries can never read them;
--   * ordinary authenticated owners cannot INSERT/set/change/clear either value;
--   * trusted postgres/service_role (auth.uid() IS NULL, RLS-bypassing) may
--     populate/replace/clear them manually.
--
-- When both columns are NULL every read falls through to today's exact source,
-- so existing rows behave identically (verified: no backfill required).

-- ── 1. Columns + phone CHECK ────────────────────────────────────────────────
-- Phone follows the verified live representation ^91[0-9]{10}$ (bare, no '+'),
-- matching public.users.phone so n8n receives an identical value. CHECK allows
-- NULL and rejects blank/whitespace/malformed at write time. No name-format
-- constraint (no repo convention for a display name).

ALTER TABLE public.properties
  ADD COLUMN listing_contact_name  text,
  ADD COLUMN listing_contact_phone text;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_listing_contact_phone_format
  CHECK (listing_contact_phone IS NULL OR listing_contact_phone ~ '^91[0-9]{10}$');

-- ── 2. get_owner_card: fold the name override into the existing resolution ───
-- Reproduces the authoritative definition (20260822185031) verbatim EXCEPT the
-- name expression, which now prefers a non-blank per-property override:
--   COALESCE(NULLIF(btrim(listing_contact_name),''), display_name, full_name)
-- Signature, return columns, visibility predicate, joins, STABLE, SECURITY
-- DEFINER, empty search_path, and the phone-free output are all unchanged.

CREATE OR REPLACE FUNCTION public.get_owner_card(p_property_id uuid)
RETURNS TABLE(name text, profile_photo_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT
      COALESCE(NULLIF(btrim(pr.listing_contact_name), ''), p.display_name, u.full_name)::text AS name,
      p.profile_photo_url::text
    FROM public.properties pr
    JOIN public.users u ON u.id = pr.owner_id
    LEFT JOIN public.profiles p ON p.user_id = pr.owner_id
    WHERE pr.id = p_property_id
      AND pr.status IN ('listed', 'edit_pending_review')
      AND pr.is_active = true;
END;
$$;

-- Re-issue the identical ACLs (CREATE OR REPLACE preserves them, but we restate
-- the intent explicitly to keep the grant surface auditable and unchanged).
REVOKE ALL ON FUNCTION public.get_owner_card(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_card(uuid) TO anon, authenticated;

-- ── 3. prevent_owner_updating_admin_fields: lock the override on UPDATE ──────
-- Reproduces the current body (20260824000000) verbatim and appends ONE guard
-- before RETURN NEW. Placed after the is_admin() early-return, so admins keep
-- their existing latitude. The guard raises only when a browser user
-- (auth.uid() IS NOT NULL) tries to set/change/clear either override; trusted
-- postgres/service_role (auth.uid() IS NULL) is intentionally permitted so the
-- operator can populate the fields via SQL. IS DISTINCT FROM covers set, change
-- and clear. Unrelated edits on an override-bearing row are unaffected (the
-- override columns are then NOT DISTINCT, so the guard does not fire).

CREATE OR REPLACE FUNCTION public.prevent_owner_updating_admin_fields()
  RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  m            text    := COALESCE(current_setting('reeve.system_action', true), '');
  fresh_relist boolean := (NEW.status = 'listed' AND OLD.status <> 'listed');
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;

  IF NEW.current_listed_period_started_at IS DISTINCT FROM OLD.current_listed_period_started_at
     AND NOT (m = 'status_change' AND fresh_relist) THEN
    RAISE EXCEPTION 'permission denied: current_listed_period_started_at is server-managed';
  END IF;

  IF NEW.availability_confirmed_at IS DISTINCT FROM OLD.availability_confirmed_at
     AND NOT (m = 'confirm_rent'
              OR (m = 'status_change' AND fresh_relist AND NEW.listing_type = 'rent')) THEN
    RAISE EXCEPTION 'permission denied: availability_confirmed_at is server-managed';
  END IF;

  IF NEW.sale_listing_confirmed_at IS DISTINCT FROM OLD.sale_listing_confirmed_at
     AND NOT (m = 'confirm_sale'
              OR (m = 'status_change' AND fresh_relist AND NEW.listing_type = 'sale')) THEN
    RAISE EXCEPTION 'permission denied: sale_listing_confirmed_at is server-managed';
  END IF;

  IF (NEW.last_public_listed_rent IS DISTINCT FROM OLD.last_public_listed_rent) OR
     (NEW.last_public_sale_price  IS DISTINCT FROM OLD.last_public_sale_price)  THEN
    RAISE EXCEPTION 'permission denied: only admins may update admin-only property fields';
  END IF;

  -- Per-property lister contact override: server-managed. Non-admin browser
  -- callers (auth.uid() present) may not set/change/clear it; trusted SQL
  -- (auth.uid() NULL) may.
  IF ( NEW.listing_contact_name  IS DISTINCT FROM OLD.listing_contact_name
       OR NEW.listing_contact_phone IS DISTINCT FROM OLD.listing_contact_phone )
     AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'permission denied: listing contact override is server-managed';
  END IF;

  RETURN NEW;
END;
$$;

-- ── 4. properties_insert: forbid planting the override at INSERT ─────────────
-- Preserves sec_audit_02 (20260909130000) semantics verbatim and appends a
-- clause requiring both override columns NULL for non-admin INSERTs. service_role
-- and postgres bypass RLS, so manual population is unaffected; ListProperty (the
-- sole INSERT writer) never sets these columns.

ALTER POLICY properties_insert ON public.properties
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND owner_id = (SELECT auth.uid())
    AND ((SELECT public.is_admin()) OR (status = 'draft'::property_status AND is_active = false))
    AND ((SELECT public.is_admin()) OR (listing_contact_name IS NULL AND listing_contact_phone IS NULL))
  );
