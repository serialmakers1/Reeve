-- Group 6A: pin search_path on 3 SECURITY INVOKER trigger functions.
--
-- The security advisor (function_search_path_mutable) flags functions whose
-- proconfig does not contain an explicit search_path. All three functions have
-- an identical body — `NEW.updated_at = now(); RETURN NEW;` — with no table
-- references, no application types, and no extension dependencies. `now()` is
-- a pg_catalog built-in that resolves regardless of search_path.
--
-- Setting search_path = pg_catalog is the minimal safe configuration:
--   - pg_catalog is always implicit as the first schema; making it explicit
--     and exclusive closes any theoretical search_path injection surface.
--   - SECURITY INVOKER — no elevated-privilege concern.
--   - No body changes. No EXECUTE, ownership, or trigger changes.
--   - Resolves all 3 function_search_path_mutable advisor findings.
--
-- Trigger attachments (read-only verified pre-migration):
--   trg_fn_bump_comments_updated_at  → property_comments (BEFORE UPDATE ROW)
--   trg_fn_bump_ratings_updated_at   → interaction_ratings (BEFORE UPDATE ROW)
--   update_updated_at_column         → callback_requests, inspection_appliances,
--                                      inspection_rooms, property_inspections,
--                                      search_location_preferences (BEFORE UPDATE ROW)

ALTER FUNCTION public.trg_fn_bump_comments_updated_at()
  SET search_path = pg_catalog;

ALTER FUNCTION public.trg_fn_bump_ratings_updated_at()
  SET search_path = pg_catalog;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = pg_catalog;
