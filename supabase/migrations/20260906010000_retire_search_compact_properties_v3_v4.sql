-- SEC-006 — Retire the superseded Search RPCs search_compact_properties_v3 and _v4.
--
-- LINEAGE
--   v3  baseline                                    — original; returned total_count +
--                                                     experience_feedback, and took the
--                                                     p_min_response_rate / p_has_experience_feedback
--                                                     filters. Kept only as rollback cover for the
--                                                     v4 migration (log.md: "v3 left intact for rollback").
--   v4  20260827000000 (Group 1 Phase 1)            — removed exact total_count, the response-rate
--                                                     filter and experience_feedback.
--   v5  20260827000001 (Group 1 Phase 2)  ACTIVE    — identical signature and RETURNS TABLE shape to
--                                                     v4; body rewritten for select-first enrichment
--                                                     + response aggregation. v5 supersedes v4 with
--                                                     no contract change, so v4 carries nothing v5 lacks.
--
-- WHY THIS IS A SECURITY CLEANUP, NOT JUST TIDYING
--   v3 is SECURITY DEFINER and EXECUTE-able by anon, and still returns `total_count` — the exact
--   marketplace inventory figure the product deliberately stopped publishing (CLAUDE.md: "No exact
--   total count"). Dropping v3 removes that anonymous exposure. It also clears the long-standing
--   blocker recorded in the 2026-08-21 reachability audit, where the V1 interaction_ratings columns
--   could not be retired because v3's experience_feedback lateral subquery still referenced them.
--
-- EVIDENCE GATHERED BEFORE WRITING THIS MIGRATION (all read-only)
--   * Active runtime caller: only src/features/search/data/searchDataClient.ts -> v5. Tests assert v5.
--   * No dynamic RPC-name construction and no raw /rest/v1/rpc/ URLs anywhere in src, api,
--     supabase/functions or scripts.
--   * Live dependencies: pg_depend, every non-system pg_proc.prosrc, pg_views, pg_matviews and
--     pg_policies scanned for both names — zero rows.
--   * pg_cron: cron.job holds one job (stale-listing-sweep -> run_stale_listing_sweep()); no reference.
--   * n8n: all 6 active workflows inspected read-only; their only Supabase calls are the
--     digest-pending-requests and cleanup-property-images Edge Functions.
--   * No external/public API contract found (no API docs, partner or integration code).
--   * Exactly ONE overload of each function exists, so the signatures below are unambiguous.
--
--   CAVEAT: function call statistics are UNAVAILABLE, not clean — this database runs with
--   track_functions = none, so pg_stat_user_functions returns no rows for any function. That
--   evidence line yields nothing either way and was NOT treated as proof of non-use. RESTRICT
--   below is the compensating control.
--
-- SAFETY
--   RESTRICT (never CASCADE): if an undiscovered dependency exists, this migration fails loudly
--   instead of silently destroying dependent objects. No IF EXISTS, so unexpected drift also fails
--   loudly rather than being masked. Signatures are copied verbatim from
--   pg_get_function_identity_arguments() against the live database.
--
-- RECOVERY
--   Deployed migrations are immutable. If either function is ever needed again, add a NEW forward
--   migration recreating it from the complete definitions already in this repository:
--     v3 -> supabase/migrations/20260821213930_baseline.sql:4257 (+ owner :4386, grants :8498-8501)
--     v4 -> supabase/migrations/20260827000000_group1_phase1_search_rpc_v4.sql:6 (+ grants :219-235)
--
-- NOT CHANGED: search_compact_properties_v5 (definition, params, return shape, grants,
-- SECURITY DEFINER, search_path, name), RLS, table/column grants, schema, data, any other function,
-- Edge Functions, and all Search application behaviour.

-- ── Retire v3 (42 arguments) ─────────────────────────────────────────────────

DROP FUNCTION public.search_compact_properties_v3(
  p_listing_type property_listing_type,
  p_property_type text,
  p_bhk text[],
  p_furnishing text[],
  p_min_price numeric,
  p_max_price numeric,
  p_available_by date,
  p_listed_within_days integer,
  p_availability_confirmed_within_days integer,
  p_max_deposit numeric,
  p_max_lock_in_months integer,
  p_max_notice_days integer,
  p_max_annual_increase numeric,
  p_max_move_in_charges numeric,
  p_pet_policy text[],
  p_possession_status text[],
  p_possession_before date,
  p_negotiable boolean,
  p_min_carpet_area numeric,
  p_max_carpet_area numeric,
  p_min_super_built_up numeric,
  p_max_super_built_up numeric,
  p_parking_4w text[],
  p_parking_2w text[],
  p_amenities text[],
  p_has_video_walkthrough boolean,
  p_min_response_rate numeric,
  p_has_experience_feedback boolean,
  p_sort text,
  p_cursor_listed_at timestamp with time zone,
  p_cursor_id uuid,
  p_cursor_availability_confirmed_at timestamp with time zone,
  p_cursor_price_amount numeric,
  p_limit integer,
  p_zero_rent_brokerage boolean,
  p_max_rent_brokerage_fixed numeric,
  p_max_sale_brokerage_pct numeric,
  p_rera_disclosed boolean,
  p_khata_type text[],
  p_property_tax_paid boolean,
  p_geo_place_ids uuid[],
  p_distance_km numeric
) RESTRICT;

-- ── Retire v4 (40 arguments) ─────────────────────────────────────────────────

DROP FUNCTION public.search_compact_properties_v4(
  p_listing_type property_listing_type,
  p_property_type text,
  p_bhk text[],
  p_furnishing text[],
  p_min_price numeric,
  p_max_price numeric,
  p_available_by date,
  p_listed_within_days integer,
  p_availability_confirmed_within_days integer,
  p_max_deposit numeric,
  p_max_lock_in_months integer,
  p_max_notice_days integer,
  p_max_annual_increase numeric,
  p_max_move_in_charges numeric,
  p_pet_policy text[],
  p_possession_status text[],
  p_possession_before date,
  p_negotiable boolean,
  p_min_carpet_area numeric,
  p_max_carpet_area numeric,
  p_min_super_built_up numeric,
  p_max_super_built_up numeric,
  p_parking_4w text[],
  p_parking_2w text[],
  p_amenities text[],
  p_has_video_walkthrough boolean,
  p_sort text,
  p_cursor_listed_at timestamp with time zone,
  p_cursor_id uuid,
  p_cursor_availability_confirmed_at timestamp with time zone,
  p_cursor_price_amount numeric,
  p_limit integer,
  p_zero_rent_brokerage boolean,
  p_max_rent_brokerage_fixed numeric,
  p_max_sale_brokerage_pct numeric,
  p_rera_disclosed boolean,
  p_khata_type text[],
  p_property_tax_paid boolean,
  p_geo_place_ids uuid[],
  p_distance_km numeric
) RESTRICT;
