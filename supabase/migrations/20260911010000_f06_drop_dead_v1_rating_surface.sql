-- F-06: Retire the dead legacy V1 rating surface (3 RPCs + 2 dead UPDATE policies + 10 columns).
-- Superseded by submit_rating_v2 / get_user_rating_summary_v2 / get_my_rateable_interactions_v2.
-- RPCs: zero runtime callers, zero DB dependents. Columns: read only by these RPCs, zero V1 data.
-- Policies: ratings_update_owner/ratings_update_tenant gate no reachable path — anon/authenticated
-- have NO UPDATE grant on this table; service_role/postgres bypass RLS.
-- KEPT: ratings_select_participants (read policy); window_opens_at/window_closes_at (written by the
--       active trigger trg_fn_create_rating_on_approval); the entire V2 rating surface.

-- 1) Functions first (they read the V1 columns).
DROP FUNCTION public.submit_rating(uuid, text, text, text, text);
DROP FUNCTION public.get_user_rating_summary(uuid);
DROP FUNCTION public.get_pending_ratings_for_me();

-- 2) Dead UPDATE policies (must precede dropping the columns they reference).
DROP POLICY ratings_update_owner ON public.interaction_ratings;
DROP POLICY ratings_update_tenant ON public.interaction_ratings;

-- 3) The 10 dead V1 columns (per-column CHECK constraints auto-drop; no CASCADE).
ALTER TABLE public.interaction_ratings
  DROP COLUMN o_q1_communication,
  DROP COLUMN o_q2_visit,
  DROP COLUMN o_q3_deal_again,
  DROP COLUMN o_review_text,
  DROP COLUMN o_submitted_at,
  DROP COLUMN t_q1_communication,
  DROP COLUMN t_q2_visit,
  DROP COLUMN t_q3_deal_again,
  DROP COLUMN t_review_text,
  DROP COLUMN t_submitted_at;
