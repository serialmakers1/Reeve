-- Ratings & Reputation v2 — additive migration (applied via apply_migration).
-- Adds 5-question structured answers per side (v2), separate v2 submission
-- timestamps, DB-level completeness enforcement, revokes all direct client
-- access to interaction_ratings, and adds *_v2 RPCs. Legacy columns/RPCs and
-- the approval trigger are left untouched for the still-deployed old frontend;
-- they are removed in a later cleanup migration once the v2 frontend is live.

-- ── 1. Columns ──────────────────────────────────────────────────────────────
ALTER TABLE public.interaction_ratings
  ADD COLUMN IF NOT EXISTS o_reach            text,
  ADD COLUMN IF NOT EXISTS t_reach            text,
  ADD COLUMN IF NOT EXISTS o_accuracy         text,
  ADD COLUMN IF NOT EXISTS t_accuracy         text,
  ADD COLUMN IF NOT EXISTS o_progress         text,
  ADD COLUMN IF NOT EXISTS t_progress         text,
  ADD COLUMN IF NOT EXISTS o_respect          text,
  ADD COLUMN IF NOT EXISTS t_respect          text,
  ADD COLUMN IF NOT EXISTS o_trust            text,
  ADD COLUMN IF NOT EXISTS t_trust            text,
  ADD COLUMN IF NOT EXISTS o_v2_submitted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS t_v2_submitted_at  timestamptz;

-- ── 2. Value CHECKs (nullable) ──────────────────────────────────────────────
ALTER TABLE public.interaction_ratings
  ADD CONSTRAINT ir_o_reach_chk    CHECK (o_reach    IS NULL OR o_reach    = ANY (ARRAY['easily','difficult','no_response'])),
  ADD CONSTRAINT ir_t_reach_chk    CHECK (t_reach    IS NULL OR t_reach    = ANY (ARRAY['easily','difficult','no_response'])),
  ADD CONSTRAINT ir_o_accuracy_chk CHECK (o_accuracy IS NULL OR o_accuracy = ANY (ARRAY['matched','minor','major'])),
  ADD CONSTRAINT ir_t_accuracy_chk CHECK (t_accuracy IS NULL OR t_accuracy = ANY (ARRAY['matched','minor','major'])),
  ADD CONSTRAINT ir_o_progress_chk CHECK (o_progress IS NULL OR o_progress = ANY (ARRAY['next_step','discussed','no_progress','mutual_stop'])),
  ADD CONSTRAINT ir_t_progress_chk CHECK (t_progress IS NULL OR t_progress = ANY (ARRAY['next_step','discussed','no_progress','mutual_stop'])),
  ADD CONSTRAINT ir_o_respect_chk  CHECK (o_respect  IS NULL OR o_respect  = ANY (ARRAY['yes','mostly','no'])),
  ADD CONSTRAINT ir_t_respect_chk  CHECK (t_respect  IS NULL OR t_respect  = ANY (ARRAY['yes','mostly','no'])),
  ADD CONSTRAINT ir_o_trust_chk    CHECK (o_trust    IS NULL OR o_trust    = ANY (ARRAY['yes','maybe','no'])),
  ADD CONSTRAINT ir_t_trust_chk    CHECK (t_trust    IS NULL OR t_trust    = ANY (ARRAY['yes','maybe','no']));

-- ── 3. Completeness CHECKs (keyed on v2 timestamps only) ────────────────────
ALTER TABLE public.interaction_ratings
  ADD CONSTRAINT ir_o_v2_complete_chk CHECK (
    o_v2_submitted_at IS NULL OR (
      o_reach IS NOT NULL AND o_accuracy IS NOT NULL AND o_progress IS NOT NULL
      AND o_respect IS NOT NULL AND o_trust IS NOT NULL)),
  ADD CONSTRAINT ir_t_v2_complete_chk CHECK (
    t_v2_submitted_at IS NULL OR (
      t_reach IS NOT NULL AND t_accuracy IS NOT NULL AND t_progress IS NOT NULL
      AND t_respect IS NOT NULL AND t_trust IS NOT NULL));

-- ── 4. Revoke ALL direct client access (RPC-only surface) ───────────────────
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.interaction_ratings FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.interaction_ratings FROM anon;

-- ── 5. Internal helper: build one reputation side as jsonb ──────────────────
CREATE OR REPLACE FUNCTION public._build_rating_side_v2(
  p_total     bigint,
  p_reach_pos bigint, p_reach_den bigint,
  p_acc_pos   bigint, p_acc_den   bigint,
  p_prog_pos  bigint, p_prog_den  bigint,
  p_resp_pos  bigint, p_resp_den  bigint,
  p_trust_pos bigint, p_trust_den bigint
) RETURNS jsonb
  LANGUAGE sql IMMUTABLE
  SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_total = 0 THEN NULL
    WHEN p_total < 3 THEN jsonb_build_object('total', p_total, 'metrics', NULL)
    ELSE jsonb_build_object(
      'total', p_total,
      'metrics', jsonb_build_object(
        'easy_to_reach',   jsonb_build_object('pct', round(100.0 * p_reach_pos / NULLIF(p_reach_den,0))::int, 'denom', p_reach_den),
        'details_matched', jsonb_build_object('pct', round(100.0 * p_acc_pos   / NULLIF(p_acc_den,0))::int,   'denom', p_acc_den),
        'respectful',      jsonb_build_object('pct', round(100.0 * p_resp_pos  / NULLIF(p_resp_den,0))::int,  'denom', p_resp_den),
        'deal_again',      jsonb_build_object('pct', round(100.0 * p_trust_pos / NULLIF(p_trust_den,0))::int, 'denom', p_trust_den),
        'moved_forward', CASE
          WHEN p_prog_den = 0 THEN jsonb_build_object('status','none')
          WHEN p_prog_den < 3 THEN jsonb_build_object('status','insufficient')
          ELSE jsonb_build_object('status','ok','pct', round(100.0 * p_prog_pos / NULLIF(p_prog_den,0))::int, 'denom', p_prog_den)
        END
      )
    )
  END
$$;

-- ── 6. Public reputation summary (aggregates only) ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_rating_summary_v2(p_user_id uuid)
  RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  l_total bigint; l_reach_pos bigint; l_reach_den bigint; l_acc_pos bigint; l_acc_den bigint;
  l_prog_pos bigint; l_prog_den bigint; l_resp_pos bigint; l_resp_den bigint; l_trust_pos bigint; l_trust_den bigint;
  s_total bigint; s_reach_pos bigint; s_reach_den bigint; s_acc_pos bigint; s_acc_den bigint;
  s_prog_pos bigint; s_prog_den bigint; s_resp_pos bigint; s_resp_den bigint; s_trust_pos bigint; s_trust_den bigint;
BEGIN
  -- As a lister: tenants' ratings ABOUT this owner (t_* cols), owner_id = target
  SELECT count(*),
    count(*) FILTER (WHERE t_reach='easily'),      count(*) FILTER (WHERE t_reach IS NOT NULL),
    count(*) FILTER (WHERE t_accuracy='matched'),  count(*) FILTER (WHERE t_accuracy IS NOT NULL),
    count(*) FILTER (WHERE t_progress='next_step'),count(*) FILTER (WHERE t_progress IS NOT NULL AND t_progress <> 'mutual_stop'),
    count(*) FILTER (WHERE t_respect='yes'),       count(*) FILTER (WHERE t_respect IS NOT NULL),
    count(*) FILTER (WHERE t_trust='yes'),         count(*) FILTER (WHERE t_trust IS NOT NULL)
  INTO l_total, l_reach_pos, l_reach_den, l_acc_pos, l_acc_den, l_prog_pos, l_prog_den, l_resp_pos, l_resp_den, l_trust_pos, l_trust_den
  FROM public.interaction_ratings
  WHERE owner_id = p_user_id AND t_v2_submitted_at IS NOT NULL;

  -- As a property seeker: owners' ratings ABOUT this tenant (o_* cols), tenant_id = target
  SELECT count(*),
    count(*) FILTER (WHERE o_reach='easily'),      count(*) FILTER (WHERE o_reach IS NOT NULL),
    count(*) FILTER (WHERE o_accuracy='matched'),  count(*) FILTER (WHERE o_accuracy IS NOT NULL),
    count(*) FILTER (WHERE o_progress='next_step'),count(*) FILTER (WHERE o_progress IS NOT NULL AND o_progress <> 'mutual_stop'),
    count(*) FILTER (WHERE o_respect='yes'),       count(*) FILTER (WHERE o_respect IS NOT NULL),
    count(*) FILTER (WHERE o_trust='yes'),         count(*) FILTER (WHERE o_trust IS NOT NULL)
  INTO s_total, s_reach_pos, s_reach_den, s_acc_pos, s_acc_den, s_prog_pos, s_prog_den, s_resp_pos, s_resp_den, s_trust_pos, s_trust_den
  FROM public.interaction_ratings
  WHERE tenant_id = p_user_id AND o_v2_submitted_at IS NOT NULL;

  RETURN jsonb_build_object(
    'as_lister', COALESCE(public._build_rating_side_v2(l_total, l_reach_pos,l_reach_den, l_acc_pos,l_acc_den, l_prog_pos,l_prog_den, l_resp_pos,l_resp_den, l_trust_pos,l_trust_den), 'null'::jsonb),
    'as_seeker', COALESCE(public._build_rating_side_v2(s_total, s_reach_pos,s_reach_den, s_acc_pos,s_acc_den, s_prog_pos,s_prog_den, s_resp_pos,s_resp_den, s_trust_pos,s_trust_den), 'null'::jsonb)
  );
END;
$$;

-- ── 7. Batched rateable-interactions read (participant-private) ──────────────
CREATE OR REPLACE FUNCTION public.get_my_rateable_interactions_v2()
  RETURNS TABLE(
    contact_request_id uuid,
    property_id uuid,
    building_name text,
    locality text,
    counterparty_name text,
    counterparty_user_id uuid,
    i_am text,
    my_submitted boolean,
    property_viewable boolean
  )
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  RETURN QUERY
  SELECT
    ir.contact_request_id,
    ir.property_id,
    p.building_name::text,
    p.locality::text,
    (CASE WHEN ir.owner_id = v_caller THEN tu.full_name ELSE ou.full_name END)::text,
    (CASE WHEN ir.owner_id = v_caller THEN ir.tenant_id ELSE ir.owner_id END),
    (CASE WHEN ir.owner_id = v_caller THEN 'owner' ELSE 'seeker' END)::text,
    (CASE WHEN ir.owner_id = v_caller THEN ir.o_v2_submitted_at IS NOT NULL ELSE ir.t_v2_submitted_at IS NOT NULL END),
    (p.status::text = ANY (ARRAY['listed','edit_pending_review']) AND p.is_active)
  FROM public.interaction_ratings ir
  JOIN public.contact_requests cr ON cr.id = ir.contact_request_id AND cr.approved_at IS NOT NULL
  JOIN public.properties p ON p.id = ir.property_id
  JOIN public.users ou ON ou.id = ir.owner_id
  JOIN public.users tu ON tu.id = ir.tenant_id
  WHERE ir.owner_id = v_caller OR ir.tenant_id = v_caller
  ORDER BY (CASE WHEN ir.owner_id = v_caller THEN ir.o_v2_submitted_at IS NOT NULL ELSE ir.t_v2_submitted_at IS NOT NULL END) ASC,
           cr.created_at DESC;
END;
$$;

-- ── 8. Submit rating (v2) ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_rating_v2(
  p_contact_request_id uuid,
  p_reach    text,
  p_accuracy text,
  p_progress text,
  p_respect  text,
  p_trust    text
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_rating     public.interaction_ratings;
  v_is_owner   boolean;
  v_is_tenant  boolean;
  v_approved   boolean;
  v_count      integer;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_rating FROM public.interaction_ratings WHERE contact_request_id = p_contact_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RATING_NOT_FOUND';
  END IF;

  v_is_owner  := (v_rating.owner_id  = v_caller);
  v_is_tenant := (v_rating.tenant_id = v_caller);
  IF NOT (v_is_owner OR v_is_tenant) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT (approved_at IS NOT NULL) INTO v_approved FROM public.contact_requests WHERE id = p_contact_request_id;
  IF NOT COALESCE(v_approved, false) THEN
    RAISE EXCEPTION 'NOT_APPROVED';
  END IF;

  -- All five mandatory
  IF p_reach IS NULL OR p_accuracy IS NULL OR p_progress IS NULL OR p_respect IS NULL OR p_trust IS NULL THEN
    RAISE EXCEPTION 'MISSING_ANSWER';
  END IF;
  -- Enum validation
  IF p_reach    NOT IN ('easily','difficult','no_response')            THEN RAISE EXCEPTION 'INVALID_ANSWER'; END IF;
  IF p_accuracy NOT IN ('matched','minor','major')                     THEN RAISE EXCEPTION 'INVALID_ANSWER'; END IF;
  IF p_progress NOT IN ('next_step','discussed','no_progress','mutual_stop') THEN RAISE EXCEPTION 'INVALID_ANSWER'; END IF;
  IF p_respect  NOT IN ('yes','mostly','no')                           THEN RAISE EXCEPTION 'INVALID_ANSWER'; END IF;
  IF p_trust    NOT IN ('yes','maybe','no')                            THEN RAISE EXCEPTION 'INVALID_ANSWER'; END IF;

  IF v_is_owner THEN
    UPDATE public.interaction_ratings ir SET
      o_reach = p_reach, o_accuracy = p_accuracy, o_progress = p_progress,
      o_respect = p_respect, o_trust = p_trust, o_v2_submitted_at = now()
    WHERE ir.contact_request_id = p_contact_request_id
      AND ir.o_v2_submitted_at IS NULL
      AND EXISTS (SELECT 1 FROM public.contact_requests cr WHERE cr.id = ir.contact_request_id AND cr.approved_at IS NOT NULL);
  ELSE
    UPDATE public.interaction_ratings ir SET
      t_reach = p_reach, t_accuracy = p_accuracy, t_progress = p_progress,
      t_respect = p_respect, t_trust = p_trust, t_v2_submitted_at = now()
    WHERE ir.contact_request_id = p_contact_request_id
      AND ir.t_v2_submitted_at IS NULL
      AND EXISTS (SELECT 1 FROM public.contact_requests cr WHERE cr.id = ir.contact_request_id AND cr.approved_at IS NOT NULL);
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'ALREADY_SUBMITTED';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 9. Grants ───────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.submit_rating_v2(uuid,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_rating_v2(uuid,text,text,text,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_rating_v2(uuid,text,text,text,text,text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_rateable_interactions_v2() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_rateable_interactions_v2() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_rateable_interactions_v2() TO authenticated;

-- Public reputation summary follows the existing summary access model (anon + authenticated).
REVOKE ALL ON FUNCTION public.get_user_rating_summary_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_rating_summary_v2(uuid) TO anon, authenticated;
