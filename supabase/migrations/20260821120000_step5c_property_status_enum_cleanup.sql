-- Step 5C: Property Status Enum Cleanup
-- Removes 10 legacy PM-era enum values, retaining only the 7 active Commons statuses.
-- Rewrites handle_property_status_change and get_admin_properties_page to eliminate
-- all references to the removed values.
--
-- Retained: draft, pending_review, changes_requested, listed, edit_pending_review, unlisted, archived
-- Removed:  inspection_proposed, inspection_accepted, inspection_scheduled, inspected,
--           agreement_pending, occupied, off_market, expiring, turnover, inactive
--
-- Pre-migration: confirm zero live rows with legacy statuses using Section D queries
-- in the plan. This migration includes an inline safety gate that aborts if any are found.
--
-- Live preflight found 8 dependent objects on properties.status that must be
-- explicitly dropped and recreated around the enum swap. No CASCADE used.

-- ── A. Safety gate ────────────────────────────────────────────────────────────

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.properties
  WHERE status::text IN (
    'inspection_proposed','inspection_accepted','inspection_scheduled',
    'inspected','agreement_pending','occupied','off_market',
    'expiring','turnover','inactive'
  );
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Step 5C aborted: % properties still carry legacy status values', v_count;
  END IF;
END $$;

-- ── B. Rewrite handle_property_status_change ──────────────────────────────────
-- Removes the occupied branch and the 'occupied' exclusion from the listed→hidden guard.

CREATE OR REPLACE FUNCTION public.handle_property_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When status changes to 'listed': make active and visible on search.
  IF NEW.status = 'listed' AND OLD.status != 'listed' THEN
    NEW.is_active := true;
    IF NEW.listed_at IS NULL THEN
      NEW.listed_at := now();
    END IF;

    -- Fresh continuously-public listing period. Excludes edit_pending_review→listed
    -- (that is a review round-trip; the clock must continue). Counts as an
    -- immediate confirmation and resets the type-matching clock.
    IF OLD.status <> 'edit_pending_review' THEN
      PERFORM set_config('reeve.system_action', 'status_change', true);
      NEW.current_listed_period_started_at := now();
      IF NEW.listing_type = 'rent' THEN
        NEW.availability_confirmed_at := now();
      ELSIF NEW.listing_type = 'sale' THEN
        NEW.sale_listing_confirmed_at := now();
      END IF;
    END IF;
  END IF;

  -- When status changes to 'edit_pending_review': keep active (live listing stays
  -- live). No listed_at / period / confirmation change — the clock continues.
  IF NEW.status = 'edit_pending_review' AND OLD.status != 'edit_pending_review' THEN
    NEW.is_active := true;
  END IF;

  -- When status changes away from 'listed' (unlisted, archived, etc): hide from search.
  -- edit_pending_review is EXCLUDED here — it keeps is_active=true (set above).
  IF OLD.status = 'listed' AND NEW.status NOT IN ('listed', 'edit_pending_review') THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$function$;

-- ── C. Rewrite get_admin_properties_page ─────────────────────────────────────
-- Removes the legacy_pm filter branch. Base: 20260806130000 (latest effective).

CREATE OR REPLACE FUNCTION public.get_admin_properties_page(
  p_search       text    DEFAULT NULL,
  p_status       text    DEFAULT NULL,
  p_city         text    DEFAULT NULL,
  p_listing_type text    DEFAULT NULL,
  p_sort         text    DEFAULT 'latest',
  p_limit        integer DEFAULT 25,
  p_offset       integer DEFAULT 0
)
RETURNS TABLE (
  property_id                uuid,
  building_name              text,
  locality                   text,
  city                       text,
  bhk                        text,
  status                     text,
  listing_type               text,
  listed_rent                numeric,
  sale_price                 numeric,
  listed_at                  timestamptz,
  updated_at                 timestamptz,
  owner_name                 text,
  owner_email                text,
  owner_phone                text,
  accepted_contact_requests  bigint,
  pending_contact_requests   bigint,
  rejected_contact_requests  bigint,
  total_contact_requests     bigint,
  view_count                 bigint,
  comment_count              bigint,
  total_count                bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sort text := lower(coalesce(p_sort, 'latest'));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  p_limit  := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 25);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);
  IF v_sort NOT IN ('latest', 'views', 'contact') THEN
    v_sort := 'latest';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.building_name,
      p.locality,
      p.city,
      p.bhk,
      p.status,
      p.listing_type,
      p.listed_rent,
      p.sale_price,
      p.listed_at,
      p.updated_at,
      o.full_name AS owner_name,
      o.email     AS owner_email,
      o.phone     AS owner_phone,
      COALESCE(cr.accepted, 0::bigint) AS accepted_cr,
      COALESCE(cr.pending,  0::bigint) AS pending_cr,
      COALESCE(cr.rejected, 0::bigint) AS rejected_cr,
      COALESCE(cr.accepted, 0::bigint) + COALESCE(cr.pending, 0::bigint) + COALESCE(cr.rejected, 0::bigint) AS total_cr,
      COALESCE((
        SELECT COUNT(DISTINCT COALESCE(pv.user_id::text, pv.visitor_id))
        FROM public.property_views pv
        WHERE pv.property_id = p.id
      ), 0::bigint) AS views_ct,
      COALESCE((
        SELECT COUNT(*)
        FROM public.property_comments pc
        WHERE pc.property_id = p.id AND pc.is_deleted = false
      ), 0::bigint) AS comments_ct
    FROM public.properties p
    LEFT JOIN public.users o ON o.id = p.owner_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE c.status = 'approved') AS accepted,
        COUNT(*) FILTER (WHERE c.status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE c.status = 'declined') AS rejected
      FROM public.contact_requests c
      WHERE c.property_id = p.id
    ) cr ON true
    WHERE
      (
        p_status IS NULL OR p_status = 'all'
        OR (p_status <> 'all' AND p.status::text = p_status)
      )
      AND (p_city IS NULL OR btrim(p_city) = '' OR lower(btrim(p.city)) = lower(btrim(p_city)))
      AND (
        p_listing_type IS NULL OR p_listing_type = '' OR p_listing_type = 'all'
        OR (p_listing_type = 'sale' AND p.listing_type = 'sale')
        OR (p_listing_type = 'rent' AND (p.listing_type = 'rent' OR p.listing_type IS NULL))
      )
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR p.building_name ILIKE '%' || p_search || '%'
        OR p.locality      ILIKE '%' || p_search || '%'
        OR p.city          ILIKE '%' || p_search || '%'
        OR o.full_name     ILIKE '%' || p_search || '%'
        OR o.email         ILIKE '%' || p_search || '%'
        OR o.phone         ILIKE '%' || p_search || '%'
      )
  )
  SELECT
    f.id,
    f.building_name::text,
    f.locality::text,
    f.city::text,
    f.bhk::text,
    f.status::text,
    f.listing_type::text,
    f.listed_rent,
    f.sale_price,
    f.listed_at,
    f.updated_at,
    f.owner_name::text,
    f.owner_email::text,
    f.owner_phone::text,
    f.accepted_cr,
    f.pending_cr,
    f.rejected_cr,
    f.total_cr,
    f.views_ct,
    f.comments_ct,
    COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN v_sort = 'views'   THEN f.views_ct END DESC NULLS LAST,
    CASE WHEN v_sort = 'contact' THEN f.total_cr END DESC NULLS LAST,
    f.listed_at DESC NULLS LAST,
    f.updated_at DESC,
    f.id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_properties_page(text, text, text, text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_properties_page(text, text, text, text, text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_properties_page(text, text, text, text, text, integer, integer) TO authenticated;

-- ── D. Drop dependent RLS policies ───────────────────────────────────────────
-- These policies reference property_status enum values in their USING expressions.
-- They must be dropped before the column type changes and recreated after the rename.

DROP POLICY IF EXISTS properties_select ON public.properties;
DROP POLICY IF EXISTS property_images_select_public ON public.property_images;

-- ── E. Drop dependent triggers ────────────────────────────────────────────────
-- Triggers fire on properties.status column changes; must be dropped before type swap.

DROP TRIGGER IF EXISTS on_property_status_change ON public.properties;
DROP TRIGGER IF EXISTS trg_auto_cancel_requests_on_archive ON public.properties;

-- ── F. Drop dependent indexes ─────────────────────────────────────────────────
-- Partial indexes whose WHERE predicates reference property_status enum literals.

DROP INDEX IF EXISTS public.idx_properties_search_availability;
DROP INDEX IF EXISTS public.idx_properties_search_newest;
DROP INDEX IF EXISTS public.idx_properties_search_sale_price;
DROP INDEX IF EXISTS public.idx_properties_status;

-- ── G. Recreate the property_status enum with 7 values ───────────────────────
-- PostgreSQL does not support ALTER TYPE ... DROP VALUE.
-- Strategy: create new type, swap column (USING cast fails if any legacy row slips
-- through the safety gate above), drop old type, rename.

CREATE TYPE public.property_status_v2 AS ENUM (
  'draft',
  'pending_review',
  'changes_requested',
  'listed',
  'edit_pending_review',
  'unlisted',
  'archived'
);

-- Drop the old-enum column default before changing type (required by Postgres)
ALTER TABLE public.properties
  ALTER COLUMN status DROP DEFAULT;

-- Swap column type; USING cast aborts the transaction if any legacy-valued row exists
ALTER TABLE public.properties
  ALTER COLUMN status TYPE public.property_status_v2
  USING status::text::public.property_status_v2;

-- Drop old enum
DROP TYPE public.property_status;

-- Rename replacement to canonical name
ALTER TYPE public.property_status_v2 RENAME TO property_status;

-- Restore column default — only after rename so the cast uses the final type name
ALTER TABLE public.properties
  ALTER COLUMN status SET DEFAULT 'draft'::public.property_status;

-- ── H. Recreate indexes ───────────────────────────────────────────────────────
-- Predicates now reference public.property_status (the renamed 7-value enum).
-- Definitions preserved exactly from live DB; only enum type name binding changes.

CREATE INDEX idx_properties_status
  ON public.properties USING btree (status);

CREATE INDEX idx_properties_search_newest
  ON public.properties USING btree (listing_type, lower((city)::text), listed_at DESC NULLS LAST, id DESC)
  WHERE (status = ANY (ARRAY['listed'::property_status, 'edit_pending_review'::property_status]) AND is_active = true);

CREATE INDEX idx_properties_search_availability
  ON public.properties USING btree (lower((city)::text), availability_confirmed_at DESC NULLS LAST, listed_at DESC NULLS LAST, id DESC)
  WHERE (status = ANY (ARRAY['listed'::property_status, 'edit_pending_review'::property_status]) AND is_active = true AND listing_type = 'rent'::property_listing_type);

CREATE INDEX idx_properties_search_sale_price
  ON public.properties USING btree (lower((city)::text), sale_price DESC NULLS LAST, listed_at DESC NULLS LAST, id DESC)
  WHERE (status = ANY (ARRAY['listed'::property_status, 'edit_pending_review'::property_status]) AND is_active = true AND listing_type = 'sale'::property_listing_type);

-- ── I. Recreate RLS policies ──────────────────────────────────────────────────
-- Exact USING logic preserved; enum casts now reference the renamed 7-value type.

CREATE POLICY properties_select ON public.properties
  FOR SELECT
  USING (
    (
      status = ANY (ARRAY['listed'::property_status, 'edit_pending_review'::property_status])
      AND is_active = true
    )
    OR owner_id = (SELECT auth.uid())
    OR (SELECT is_admin())
  );

CREATE POLICY property_images_select_public ON public.property_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties
      WHERE properties.id = property_images.property_id
        AND properties.status = ANY (ARRAY['listed'::property_status, 'edit_pending_review'::property_status])
        AND properties.is_active = true
    )
  );

-- ── J. Recreate triggers ──────────────────────────────────────────────────────
-- Trigger functions (handle_property_status_change, auto_cancel_requests_on_archive)
-- are not recreated — handle_property_status_change was rewritten in Section B;
-- auto_cancel_requests_on_archive is unchanged and retained as-is.

CREATE TRIGGER on_property_status_change
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_property_status_change();

CREATE TRIGGER trg_auto_cancel_requests_on_archive
  AFTER UPDATE OF status ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_cancel_requests_on_archive();
