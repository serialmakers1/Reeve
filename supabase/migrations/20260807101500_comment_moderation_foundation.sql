-- Comment Moderation — Supabase foundation (DB only, no frontend).
--
-- Adds a report-resolution concept so admins can reversibly moderate comments
-- without the 3-report auto-hide immediately re-firing on historical reports.
--
-- Summary:
--   1. comment_reports gains resolution / resolved_at / resolved_by (NULL = open).
--   2. Auto-hide trigger counts only UNRESOLVED (open) distinct reporters.
--   3. report_comment hardened: locks the comment row (serialize concurrent
--      reports) and blocks reports on already hidden/deleted comments.
--      comment_reports becomes RPC-only (direct anon/authenticated grants revoked).
--   4. comment_moderation_actions audit table (admin-only RLS).
--   5. admin_unhide_comment / admin_delete_comment — reversible, atomic, guarded.
--      Delete is a tombstone (hidden_reason='admin_hidden'), never a physical DELETE.
--      Only OPEN reports are resolved; already-resolved history is preserved.
--   6. Admin read RPCs for the /admin/comment-moderation UI.
--
-- Report outcome semantics: Unhide → open reports become 'dismissed';
-- Delete → open reports become 'upheld'. Reports already dismissed/upheld are
-- never rewritten (preserves reporter history for the User Signals tab).

-- ── 1. Extend comment_reports ───────────────────────────────────────────────
ALTER TABLE public.comment_reports
  ADD COLUMN IF NOT EXISTS resolution  text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_reports_resolution_check') THEN
    ALTER TABLE public.comment_reports
      ADD CONSTRAINT comment_reports_resolution_check
      CHECK (resolution IS NULL OR resolution IN ('dismissed','upheld'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comment_reports_resolved_by_fkey') THEN
    ALTER TABLE public.comment_reports
      ADD CONSTRAINT comment_reports_resolved_by_fkey
      FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 2. Auto-hide trigger: count only UNRESOLVED distinct reporters ──────────
CREATE OR REPLACE FUNCTION public.trg_fn_auto_hide_on_reports()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(DISTINCT reporter_id)
  INTO v_count
  FROM public.comment_reports
  WHERE comment_id = NEW.comment_id
    AND resolution IS NULL;

  IF v_count >= 3 THEN
    UPDATE public.property_comments
    SET is_deleted = true,
        hidden_reason = 'auto_hidden_reports'
    WHERE id = NEW.comment_id
      AND is_deleted = false;   -- idempotent: concurrent 3rd reports no-op
  END IF;
  RETURN NULL;
END;
$function$;

-- ── 3. Harden report_comment + make comment_reports RPC-only ────────────────
CREATE OR REPLACE FUNCTION public.report_comment(p_comment_id uuid, p_reason text, p_notes text DEFAULT NULL::text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id    uuid := auth.uid();
  v_phone_ver  boolean;
  v_email_ver  boolean;
  v_is_deleted boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT phone_verified, email_verified
  INTO v_phone_ver, v_email_ver
  FROM public.users WHERE id = v_user_id;

  IF NOT (v_phone_ver AND v_email_ver) THEN
    RAISE EXCEPTION 'VERIFICATION_INCOMPLETE';
  END IF;

  -- Lock the comment row so concurrent reports on the same comment serialize:
  -- the open-count the auto-hide trigger sees is then consistent. Also blocks
  -- new reports piling onto an already hidden/deleted/tombstoned comment.
  SELECT is_deleted INTO v_is_deleted
  FROM public.property_comments
  WHERE id = p_comment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMMENT_NOT_FOUND';
  END IF;
  IF v_is_deleted THEN
    RAISE EXCEPTION 'COMMENT_UNAVAILABLE';
  END IF;

  IF p_reason NOT IN ('spam','abusive','false_information','other') THEN
    RAISE EXCEPTION 'INVALID_REASON';
  END IF;

  -- Notes only mandatory when reason = 'other'
  IF p_reason = 'other' AND (p_notes IS NULL OR trim(p_notes) = '') THEN
    RAISE EXCEPTION 'NOTES_REQUIRED';
  END IF;

  BEGIN
    INSERT INTO public.comment_reports (comment_id, reporter_id, reason, notes)
    VALUES (
      p_comment_id,
      v_user_id,
      p_reason,
      NULLIF(trim(COALESCE(p_notes, '')), '')  -- store NULL when empty
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REPORTED';
  END;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- comment_reports is now written and read only through SECURITY DEFINER RPCs.
-- Revoking direct grants keeps moderation metadata (resolution / resolved_by
-- admin UUID) unreadable by reporters and closes the direct-insert bypass.
REVOKE INSERT, UPDATE, DELETE, SELECT ON public.comment_reports FROM anon, authenticated;

-- ── 4. Audit table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comment_moderation_actions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.property_comments(id) ON DELETE CASCADE,
  admin_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,  -- nullable: keep audit if admin row is deleted
  action     text NOT NULL CHECK (action IN ('delete','unhide')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comment_moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cma_select_admin ON public.comment_moderation_actions;
CREATE POLICY cma_select_admin ON public.comment_moderation_actions
  FOR SELECT USING (public.is_admin());
-- No INSERT/UPDATE/DELETE policies: writes happen only inside SECDEF RPCs.

CREATE INDEX IF NOT EXISTS idx_comment_moderation_actions_comment
  ON public.comment_moderation_actions (comment_id);

-- ── 5. Admin write RPCs (reversible, atomic) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_unhide_comment(p_comment_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_c public.property_comments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT * INTO v_c FROM public.property_comments WHERE id = p_comment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMMENT_NOT_FOUND';
  END IF;
  IF v_c.hidden_reason = 'user_deleted' THEN
    RAISE EXCEPTION 'CANNOT_RESTORE_USER_DELETED';
  END IF;
  IF NOT (v_c.is_deleted AND v_c.hidden_reason IN ('auto_hidden_reports','admin_hidden')) THEN
    RAISE EXCEPTION 'COMMENT_NOT_HIDDEN';
  END IF;

  UPDATE public.property_comments
  SET is_deleted = false, hidden_reason = NULL
  WHERE id = p_comment_id;

  UPDATE public.comment_reports
  SET resolution = 'dismissed', resolved_at = now(), resolved_by = auth.uid()
  WHERE comment_id = p_comment_id AND resolution IS NULL;

  INSERT INTO public.comment_moderation_actions (comment_id, admin_id, action)
  VALUES (p_comment_id, auth.uid(), 'unhide');

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_comment(p_comment_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_c public.property_comments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT * INTO v_c FROM public.property_comments WHERE id = p_comment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMMENT_NOT_FOUND';
  END IF;
  IF v_c.hidden_reason = 'user_deleted' THEN
    RAISE EXCEPTION 'CANNOT_DELETE_USER_DELETED';
  END IF;
  IF v_c.is_deleted AND v_c.hidden_reason = 'admin_hidden' THEN
    RAISE EXCEPTION 'ALREADY_DELETED';   -- no-op: no duplicate audit / re-resolve
  END IF;

  UPDATE public.property_comments
  SET is_deleted = true, hidden_reason = 'admin_hidden'
  WHERE id = p_comment_id;

  UPDATE public.comment_reports
  SET resolution = 'upheld', resolved_at = now(), resolved_by = auth.uid()
  WHERE comment_id = p_comment_id AND resolution IS NULL;

  INSERT INTO public.comment_moderation_actions (comment_id, admin_id, action)
  VALUES (p_comment_id, auth.uid(), 'delete');

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ── 6. Admin read RPCs ──────────────────────────────────────────────────────

-- 6a. Review Queue — currently auto-hidden comments only. Reflects the CURRENT
-- unresolved report batch (open reports), with derived hidden_at = MAX(open
-- report created_at) used for sort + burst.
CREATE OR REPLACE FUNCTION public.get_admin_comment_review_queue(
  p_search      text    DEFAULT NULL,
  p_reason      text    DEFAULT NULL,
  p_author_type text    DEFAULT NULL,
  p_sort        text    DEFAULT 'oldest',
  p_limit       integer DEFAULT 25,
  p_offset      integer DEFAULT 0
)
RETURNS TABLE (
  comment_id            uuid,
  property_id           uuid,
  parent_comment_id     uuid,
  is_reply              boolean,
  depth                 integer,
  comment_text          text,
  comment_created_at    timestamptz,
  poster_id             uuid,
  poster_pseudonym      text,
  poster_full_name      text,
  poster_is_active      boolean,
  poster_is_owner       boolean,
  property_building     text,
  property_status       text,
  property_locality     text,
  property_city         text,
  owner_id              uuid,
  owner_pseudonym       text,
  owner_full_name       text,
  open_report_count     bigint,
  lifetime_report_count bigint,
  hidden_at             timestamptz,
  burst_seconds         numeric,
  open_reports          jsonb,
  total_count           bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_sort text := lower(coalesce(p_sort, 'oldest'));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  p_limit  := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);
  IF v_sort NOT IN ('oldest','newest') THEN v_sort := 'oldest'; END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.id, c.property_id, c.parent_comment_id, c.depth, c.text, c.created_at,
           c.user_id AS poster_id,
           pu.pseudonym AS poster_pseudonym, pu.full_name AS poster_full_name, pu.is_active AS poster_is_active,
           p.building_name, p.status AS property_status, p.locality, p.city, p.owner_id,
           ou.pseudonym AS owner_pseudonym, ou.full_name AS owner_full_name,
           COALESCE(c.user_id = p.owner_id, false) AS poster_is_owner
    FROM public.property_comments c
    JOIN public.users pu ON pu.id = c.user_id
    LEFT JOIN public.properties p ON p.id = c.property_id
    LEFT JOIN public.users ou ON ou.id = p.owner_id
    WHERE c.is_deleted = true AND c.hidden_reason = 'auto_hidden_reports'
  ),
  agg AS (
    SELECT b.*,
      (SELECT count(*) FROM public.comment_reports r WHERE r.comment_id = b.id AND r.resolution IS NULL) AS open_report_count,
      (SELECT count(*) FROM public.comment_reports r WHERE r.comment_id = b.id) AS lifetime_report_count,
      (SELECT max(r.created_at) FROM public.comment_reports r WHERE r.comment_id = b.id AND r.resolution IS NULL) AS hidden_at,
      (SELECT EXTRACT(EPOCH FROM (max(r.created_at) - min(r.created_at)))
         FROM public.comment_reports r WHERE r.comment_id = b.id AND r.resolution IS NULL) AS burst_seconds,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'reason', r.reason,
                 'notes', r.notes,
                 'created_at', r.created_at,
                 'reporter_pseudonym', ru.pseudonym,
                 'reporter_full_name', ru.full_name,
                 'reporter_is_owner', COALESCE(r.reporter_id = b.owner_id, false)
               ) ORDER BY r.created_at), '[]'::jsonb)
         FROM public.comment_reports r JOIN public.users ru ON ru.id = r.reporter_id
         WHERE r.comment_id = b.id AND r.resolution IS NULL) AS open_reports
    FROM base b
  ),
  filtered AS (
    SELECT * FROM agg a
    WHERE (p_search IS NULL OR btrim(p_search) = ''
           OR a.text ILIKE '%' || p_search || '%'
           OR a.poster_pseudonym ILIKE '%' || p_search || '%'
           OR a.poster_full_name ILIKE '%' || p_search || '%'
           OR a.building_name ILIKE '%' || p_search || '%')
      AND (p_reason IS NULL OR p_reason = '' OR p_reason = 'all'
           OR EXISTS (SELECT 1 FROM public.comment_reports r
                      WHERE r.comment_id = a.id AND r.resolution IS NULL AND r.reason = p_reason))
      AND (p_author_type IS NULL OR p_author_type = '' OR p_author_type = 'all'
           OR (p_author_type = 'owner'  AND a.poster_is_owner)
           OR (p_author_type = 'member' AND NOT a.poster_is_owner))
  )
  SELECT
    f.id, f.property_id, f.parent_comment_id, (f.parent_comment_id IS NOT NULL), f.depth,
    f.text, f.created_at,
    f.poster_id, f.poster_pseudonym, f.poster_full_name::text, f.poster_is_active, f.poster_is_owner,
    f.building_name::text, f.property_status::text, f.locality::text, f.city::text,
    f.owner_id, f.owner_pseudonym, f.owner_full_name::text,
    f.open_report_count, f.lifetime_report_count, f.hidden_at, f.burst_seconds, f.open_reports,
    count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN v_sort = 'oldest' THEN f.hidden_at END ASC  NULLS LAST,
    CASE WHEN v_sort = 'newest' THEN f.hidden_at END DESC NULLS LAST,
    f.id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 6b. All Comments — every comment in any state, server-side filter/sort/paginate.
CREATE OR REPLACE FUNCTION public.get_admin_comments_page(
  p_search          text    DEFAULT NULL,
  p_state           text    DEFAULT NULL,
  p_report_bucket   text    DEFAULT NULL,   -- all | 0 | 1 | 2 | 3_plus  (lifetime count)
  p_author_type     text    DEFAULT NULL,   -- all | owner | member
  p_property_status text    DEFAULT NULL,
  p_sort            text    DEFAULT 'newest',
  p_limit           integer DEFAULT 25,
  p_offset          integer DEFAULT 0
)
RETURNS TABLE (
  comment_id          uuid,
  property_id         uuid,
  parent_comment_id   uuid,
  is_reply            boolean,
  comment_text        text,
  state               text,
  comment_created_at  timestamptz,
  comment_updated_at  timestamptz,
  poster_id           uuid,
  poster_pseudonym    text,
  poster_full_name    text,
  poster_is_active    boolean,
  poster_is_owner     boolean,
  property_building   text,
  property_status     text,
  property_locality   text,
  property_city       text,
  owner_id            uuid,
  owner_pseudonym     text,
  owner_full_name     text,
  report_count        bigint,
  open_report_count   bigint,
  total_count         bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_sort text := lower(coalesce(p_sort, 'newest'));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  p_limit  := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);
  IF v_sort NOT IN ('newest','oldest','most_reported') THEN v_sort := 'newest'; END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.id, c.property_id, c.parent_comment_id, c.text, c.is_deleted, c.hidden_reason,
           c.created_at, c.updated_at, c.user_id AS poster_id,
           pu.pseudonym AS poster_pseudonym, pu.full_name AS poster_full_name, pu.is_active AS poster_is_active,
           p.building_name, p.status AS property_status, p.locality, p.city, p.owner_id,
           ou.pseudonym AS owner_pseudonym, ou.full_name AS owner_full_name,
           COALESCE(c.user_id = p.owner_id, false) AS poster_is_owner,
           (SELECT count(*) FROM public.comment_reports r WHERE r.comment_id = c.id) AS report_count,
           (SELECT count(*) FROM public.comment_reports r WHERE r.comment_id = c.id AND r.resolution IS NULL) AS open_report_count,
           CASE WHEN NOT c.is_deleted THEN 'visible'
                WHEN c.hidden_reason = 'auto_hidden_reports' THEN 'auto_hidden'
                WHEN c.hidden_reason = 'admin_hidden' THEN 'admin_hidden'
                WHEN c.hidden_reason = 'user_deleted' THEN 'user_deleted'
                ELSE 'visible' END AS state
    FROM public.property_comments c
    JOIN public.users pu ON pu.id = c.user_id
    LEFT JOIN public.properties p ON p.id = c.property_id
    LEFT JOIN public.users ou ON ou.id = p.owner_id
  ),
  filtered AS (
    SELECT * FROM base b
    WHERE (p_search IS NULL OR btrim(p_search) = ''
           OR b.text ILIKE '%' || p_search || '%'
           OR b.poster_pseudonym ILIKE '%' || p_search || '%'
           OR b.poster_full_name ILIKE '%' || p_search || '%'
           OR b.building_name ILIKE '%' || p_search || '%')
      AND (p_state IS NULL OR p_state = '' OR p_state = 'all' OR b.state = p_state)
      AND (p_author_type IS NULL OR p_author_type = '' OR p_author_type = 'all'
           OR (p_author_type = 'owner'  AND b.poster_is_owner)
           OR (p_author_type = 'member' AND NOT b.poster_is_owner))
      AND (p_property_status IS NULL OR p_property_status = '' OR p_property_status = 'all'
           OR b.property_status::text = p_property_status)
      AND (p_report_bucket IS NULL OR p_report_bucket = '' OR p_report_bucket = 'all'
           OR (p_report_bucket = '0' AND b.report_count = 0)
           OR (p_report_bucket = '1' AND b.report_count = 1)
           OR (p_report_bucket = '2' AND b.report_count = 2)
           OR (p_report_bucket = '3_plus' AND b.report_count >= 3))
  )
  SELECT
    f.id, f.property_id, f.parent_comment_id, (f.parent_comment_id IS NOT NULL),
    f.text, f.state, f.created_at, f.updated_at,
    f.poster_id, f.poster_pseudonym, f.poster_full_name::text, f.poster_is_active, f.poster_is_owner,
    f.building_name::text, f.property_status::text, f.locality::text, f.city::text,
    f.owner_id, f.owner_pseudonym, f.owner_full_name::text,
    f.report_count, f.open_report_count,
    count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN v_sort = 'most_reported' THEN f.report_count END DESC NULLS LAST,
    CASE WHEN v_sort = 'oldest' THEN f.created_at END ASC  NULLS LAST,
    CASE WHEN v_sort = 'newest' THEN f.created_at END DESC NULLS LAST,
    f.created_at DESC, f.id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 6c. Report details for one comment — full historical report list + per-reporter signals.
CREATE OR REPLACE FUNCTION public.get_admin_comment_report_details(p_comment_id uuid)
RETURNS TABLE (
  report_id                   uuid,
  reason                      text,
  notes                       text,
  created_at                  timestamptz,
  resolution                  text,
  resolved_at                 timestamptz,
  reporter_id                 uuid,
  reporter_pseudonym          text,
  reporter_full_name          text,
  reporter_is_active          boolean,
  reporter_is_property_owner  boolean,
  reporter_lifetime_reports   bigint,
  reporter_dismissed_count    bigint,
  reporter_upheld_count       bigint,
  reporter_reports_on_property bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_property_id uuid;
  v_owner_id    uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  SELECT c.property_id, p.owner_id
  INTO v_property_id, v_owner_id
  FROM public.property_comments c
  LEFT JOIN public.properties p ON p.id = c.property_id
  WHERE c.id = p_comment_id;

  RETURN QUERY
  SELECT
    r.id, r.reason, r.notes, r.created_at, r.resolution, r.resolved_at,
    r.reporter_id, ru.pseudonym, ru.full_name::text, ru.is_active,
    COALESCE(r.reporter_id = v_owner_id, false),
    (SELECT count(*) FROM public.comment_reports r2 WHERE r2.reporter_id = r.reporter_id),
    (SELECT count(*) FROM public.comment_reports r2 WHERE r2.reporter_id = r.reporter_id AND r2.resolution = 'dismissed'),
    (SELECT count(*) FROM public.comment_reports r2 WHERE r2.reporter_id = r.reporter_id AND r2.resolution = 'upheld'),
    (SELECT count(*) FROM public.comment_reports r2
       JOIN public.property_comments c2 ON c2.id = r2.comment_id
       WHERE r2.reporter_id = r.reporter_id AND c2.property_id = v_property_id)
  FROM public.comment_reports r
  JOIN public.users ru ON ru.id = r.reporter_id
  WHERE r.comment_id = p_comment_id
  ORDER BY r.created_at;
END;
$function$;

-- 6d. User Signals — both directions, scoped to users who authored ≥1 comment OR filed ≥1 report.
CREATE OR REPLACE FUNCTION public.get_admin_user_signals(
  p_search text    DEFAULT NULL,
  p_sort   text    DEFAULT 'reports_filed',
  p_limit  integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id                      uuid,
  pseudonym                    text,
  full_name                    text,
  is_active                    boolean,
  comments_count               bigint,
  comment_reports_received     bigint,
  comments_auto_hidden         bigint,
  comments_admin_deleted       bigint,
  reports_filed                bigint,
  reports_dismissed            bigint,
  reports_upheld               bigint,
  distinct_properties_reported bigint,
  max_reports_single_property  bigint,
  reports_on_owned_property    bigint,
  total_count                  bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_sort text := lower(coalesce(p_sort, 'reports_filed'));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  p_limit  := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
  p_offset := GREATEST(COALESCE(p_offset, 0), 0);
  IF v_sort NOT IN ('reports_filed','reports_received','comments') THEN v_sort := 'reports_filed'; END IF;

  RETURN QUERY
  WITH participants AS (
    SELECT pc.user_id AS uid FROM public.property_comments pc
    UNION
    SELECT cr.reporter_id AS uid FROM public.comment_reports cr
  ),
  metrics AS (
    SELECT
      u.id AS user_id, u.pseudonym, u.full_name, u.is_active,
      (SELECT count(*) FROM public.property_comments c WHERE c.user_id = u.id) AS comments_count,
      (SELECT count(*) FROM public.comment_reports r JOIN public.property_comments c ON c.id = r.comment_id
         WHERE c.user_id = u.id) AS comment_reports_received,
      (SELECT count(*) FROM public.property_comments c
         WHERE c.user_id = u.id AND c.is_deleted AND c.hidden_reason = 'auto_hidden_reports') AS comments_auto_hidden,
      (SELECT count(*) FROM public.property_comments c
         WHERE c.user_id = u.id AND c.is_deleted AND c.hidden_reason = 'admin_hidden') AS comments_admin_deleted,
      (SELECT count(*) FROM public.comment_reports r WHERE r.reporter_id = u.id) AS reports_filed,
      (SELECT count(*) FROM public.comment_reports r WHERE r.reporter_id = u.id AND r.resolution = 'dismissed') AS reports_dismissed,
      (SELECT count(*) FROM public.comment_reports r WHERE r.reporter_id = u.id AND r.resolution = 'upheld') AS reports_upheld,
      (SELECT count(DISTINCT c.property_id) FROM public.comment_reports r JOIN public.property_comments c ON c.id = r.comment_id
         WHERE r.reporter_id = u.id) AS distinct_properties_reported,
      COALESCE((SELECT max(q.cnt) FROM (
         SELECT count(*) AS cnt FROM public.comment_reports r JOIN public.property_comments c ON c.id = r.comment_id
         WHERE r.reporter_id = u.id GROUP BY c.property_id) q), 0) AS max_reports_single_property,
      (SELECT count(*) FROM public.comment_reports r
         JOIN public.property_comments c ON c.id = r.comment_id
         JOIN public.properties p ON p.id = c.property_id
         WHERE r.reporter_id = u.id AND p.owner_id = u.id) AS reports_on_owned_property
    FROM public.users u
    WHERE u.id IN (SELECT uid FROM participants)
  ),
  filtered AS (
    SELECT * FROM metrics m
    WHERE (p_search IS NULL OR btrim(p_search) = ''
           OR m.pseudonym ILIKE '%' || p_search || '%'
           OR m.full_name ILIKE '%' || p_search || '%')
  )
  SELECT
    f.user_id, f.pseudonym, f.full_name::text, f.is_active,
    f.comments_count, f.comment_reports_received, f.comments_auto_hidden, f.comments_admin_deleted,
    f.reports_filed, f.reports_dismissed, f.reports_upheld,
    f.distinct_properties_reported, f.max_reports_single_property, f.reports_on_owned_property,
    count(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN v_sort = 'reports_filed'    THEN f.reports_filed END DESC NULLS LAST,
    CASE WHEN v_sort = 'reports_received' THEN f.comment_reports_received END DESC NULLS LAST,
    CASE WHEN v_sort = 'comments'         THEN f.comments_count END DESC NULLS LAST,
    f.reports_filed DESC, f.user_id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- ── 7. Grants: admin RPCs are authenticated-only; is_admin() gate is internal ─
-- (Supabase auto-grants EXECUTE to anon on new functions, so revoke explicitly.)
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.admin_unhide_comment(uuid)',
    'public.admin_delete_comment(uuid)',
    'public.get_admin_comment_review_queue(text,text,text,text,integer,integer)',
    'public.get_admin_comments_page(text,text,text,text,text,text,integer,integer)',
    'public.get_admin_comment_report_details(uuid)',
    'public.get_admin_user_signals(text,text,integer,integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

-- ── 8. Indexes justified by the new admin queries ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_open
  ON public.comment_reports (comment_id) WHERE resolution IS NULL;

CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter
  ON public.comment_reports (reporter_id);

CREATE INDEX IF NOT EXISTS idx_property_comments_review
  ON public.property_comments (created_at DESC)
  WHERE hidden_reason = 'auto_hidden_reports' AND is_deleted;
