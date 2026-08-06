-- Fix: get_admin_properties_page returned HTTP 400
--   "structure of query does not match function result type"
--
-- Root cause: the RETURNS TABLE declares building_name / owner_name / owner_email /
-- owner_phone as `text`, but the final SELECT returned them as their native `varchar`
-- (properties.building_name, users.full_name/email/phone are all varchar). PostgreSQL
-- RETURN QUERY validates RETURNS TABLE positionally and strictly, so varchar ≠ text
-- raises the structure-mismatch error at row-production time.
--
-- Fix: cast every text result column to ::text in the final SELECT. The declared
-- RETURNS TABLE types are unchanged, so CREATE OR REPLACE is valid and preserves the
-- existing grants; grants are re-appended defensively so this file is self-contained.
-- Append-only: the original 20260806120000 migration is left untouched.

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
        OR (p_status = 'legacy_pm' AND p.status::text IN (
              'inspection_proposed', 'inspection_accepted', 'inspection_scheduled',
              'inspected', 'agreement_pending', 'occupied', 'off_market',
              'expiring', 'turnover', 'inactive'))
        OR (p_status NOT IN ('all', 'legacy_pm') AND p.status::text = p_status)
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

-- CREATE OR REPLACE preserves grants (return types unchanged); re-append defensively.
REVOKE ALL ON FUNCTION public.get_admin_properties_page(text, text, text, text, text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_properties_page(text, text, text, text, text, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_properties_page(text, text, text, text, text, integer, integer) TO authenticated;
