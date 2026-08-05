-- Property-type MULTI-SELECT for Search — signature-preserving.
--
-- Why the scalar `p_property_type text` signature is intentionally kept:
--   Changing the argument (e.g. to text[]) would create a new function overload and
--   force a coordinated frontend+backend deploy (old clients would 404/PGRST202 against
--   the dropped signature). Instead we keep the SAME signature and reinterpret the
--   existing text parameter as a comma-separated list, so old and new clients coexist:
--     old client:  p_property_type = 'villa'            -> one type
--     new client:  p_property_type = 'villa,apartment'  -> many types (OR)
--   NULL / '' still means "no property-type filter" (all types).
--
-- Applied via a live-definition edit (like 20260729120000_search_area_boxes_geographic.sql)
-- because the repo migration files may not byte-match the live function bodies. The scalar
-- comparison is replaced by an ANY(...) over the split CSV in EVERY occurrence (the compact
-- search RPC repeats it across sort branches). Signature/grants/security/volatility unchanged.

DO $mig$
DECLARE
  v_def   text;
  v_count integer;
  -- Both spaced and unspaced forms exist across the two functions.
  v_old_a constant text := 'p.property_type::text = p_property_type';
  v_old_b constant text := 'p.property_type::text=p_property_type';
  v_new   constant text :=
    '(btrim(coalesce(p_property_type,'''')) = '''' OR p.property_type::text = ANY(string_to_array(p_property_type, '','')))';
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['search_compact_properties', 'get_map_markers'] LOOP
    -- Assert exactly one overload exists for this name.
    SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = fn;
    IF v_count <> 1 THEN
      RAISE EXCEPTION '%: expected exactly 1 overload, found % — aborting', fn, v_count;
    END IF;

    SELECT pg_get_functiondef(('public.' || fn)::regproc) INTO v_def;

    -- The scalar property-type comparison must be present (in one of the two forms).
    IF position(v_old_a IN v_def) = 0 AND position(v_old_b IN v_def) = 0 THEN
      RAISE EXCEPTION '%: expected scalar property_type clause not found — aborting', fn;
    END IF;

    v_def := replace(v_def, v_old_a, v_new);
    v_def := replace(v_def, v_old_b, v_new);

    -- Nothing should reference the raw scalar comparison anymore.
    IF position(v_old_a IN v_def) <> 0 OR position(v_old_b IN v_def) <> 0 THEN
      RAISE EXCEPTION '%: scalar property_type clause still present after replace — aborting', fn;
    END IF;

    EXECUTE v_def;
  END LOOP;
END
$mig$;
