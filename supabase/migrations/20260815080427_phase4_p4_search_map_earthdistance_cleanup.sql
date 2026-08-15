-- Phase 4 · Prompt 4 — Migration A: retire legacy Search/Map RPCs + earthdistance stack.
-- Recovery: the original CREATE bodies live in earlier supabase/migrations (v1/v2 list,
-- get_map_markers*, reeve_search_property_ids, reeve_search_safety_net_m, idx_properties_location);
-- re-applying those historical migrations restores any object. No CASCADE; atomic (aborts whole
-- migration if an unexpected dependent survives). KEEP v3 + reeve_search_property_ids_v2 + PostGIS.

-- 1) Legacy LIST RPCs (v1, v2) + Search-Map RPCs (v1, v2) — drop by exact live signature.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'search_compact_properties','search_compact_properties_v2',
        'get_map_markers','get_map_markers_v2',
        'reeve_search_property_ids','reeve_search_safety_net_m')
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig;   -- RESTRICT (no CASCADE) by default
  END LOOP;
END $$;

-- 2) Old earthdistance list index.
DROP INDEX IF EXISTS public.idx_properties_location;

-- 3) Extensions — earthdistance depends on cube, so drop it first. RESTRICT (no CASCADE).
DROP EXTENSION IF EXISTS earthdistance;
DROP EXTENSION IF EXISTS cube;
