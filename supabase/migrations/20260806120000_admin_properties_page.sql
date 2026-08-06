-- Admin Properties page: server-side paginated listing with global filtering,
-- sorting, contact-request buckets, and view/comment counts.
--
-- Powers /admin/properties. Replaces the previous "load everything + filter in
-- memory" approach and the incorrect applications-based counts.
--
-- Contact-request bucket mapping (single source of truth — mirrored nowhere else):
--   Accepted = approved | Pending = pending | Rejected = declined
--   Excluded from total = withdrawn, auto_cancelled  (no `expired` status exists)
--   total = accepted + pending + rejected
--
-- View/comment counting mirrors get_property_counts exactly.

-- ── Paginated admin properties page ─────────────────────────────────────────
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

  -- Argument hardening: clamp page size to [1,25] and offset to >= 0.
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
      COALESCE(cr.accepted, 0) AS accepted_cr,
      COALESCE(cr.pending,  0) AS pending_cr,
      COALESCE(cr.rejected, 0) AS rejected_cr,
      COALESCE(cr.accepted, 0) + COALESCE(cr.pending, 0) + COALESCE(cr.rejected, 0) AS total_cr,
      COALESCE((
        SELECT COUNT(DISTINCT COALESCE(pv.user_id::text, pv.visitor_id))
        FROM public.property_views pv
        WHERE pv.property_id = p.id
      ), 0) AS views_ct,
      COALESCE((
        SELECT COUNT(*)
        FROM public.property_comments pc
        WHERE pc.property_id = p.id AND pc.is_deleted = false
      ), 0) AS comments_ct
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
      -- Status: 'all'/NULL → no filter; 'legacy_pm' → legacy PM set; otherwise
      -- compare as text so an invalid value simply matches nothing (no enum error).
      (
        p_status IS NULL OR p_status = 'all'
        OR (p_status = 'legacy_pm' AND p.status::text IN (
              'inspection_proposed', 'inspection_accepted', 'inspection_scheduled',
              'inspected', 'agreement_pending', 'occupied', 'off_market',
              'expiring', 'turnover', 'inactive'))
        OR (p_status NOT IN ('all', 'legacy_pm') AND p.status::text = p_status)
      )
      -- City: trim both sides so trailing-space stored values still match.
      AND (p_city IS NULL OR btrim(p_city) = '' OR lower(btrim(p.city)) = lower(btrim(p_city)))
      -- Listing type: Buy → sale; Rent → rent OR legacy NULL.
      AND (
        p_listing_type IS NULL OR p_listing_type = '' OR p_listing_type = 'all'
        OR (p_listing_type = 'sale' AND p.listing_type = 'sale')
        OR (p_listing_type = 'rent' AND (p.listing_type = 'rent' OR p.listing_type IS NULL))
      )
      -- Search: case-insensitive across building, locality, city + owner fields.
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
    f.building_name,
    f.locality::text,
    f.city::text,
    f.bhk::text,
    f.status::text,
    f.listing_type::text,
    f.listed_rent,
    f.sale_price,
    f.listed_at,
    f.updated_at,
    f.owner_name,
    f.owner_email,
    f.owner_phone,
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

-- ── Distinct cities for the admin City filter ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_property_cities()
RETURNS TABLE (city text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT min(btrim(p.city))::text AS city
  FROM public.properties p
  WHERE p.city IS NOT NULL AND btrim(p.city) <> ''
  GROUP BY lower(btrim(p.city))
  ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_property_cities() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_property_cities() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_property_cities() TO authenticated;

-- ── Index: contact-request aggregation by (property_id, status) ──────────────
CREATE INDEX IF NOT EXISTS idx_contact_requests_property_status
  ON public.contact_requests (property_id, status);
