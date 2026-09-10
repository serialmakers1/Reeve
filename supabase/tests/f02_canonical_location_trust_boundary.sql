-- F-02 regression: enforce_canonical_location_lock() trust-boundary.
-- Run inside a rolled-back transaction (safe on any environment):
--   psql "$DATABASE_URL" -f supabase/tests/f02_canonical_location_trust_boundary.sql
-- or paste into the SQL editor. Ends with ROLLBACK so nothing is persisted.
--
-- Requires migration 20260910000000_f02_canonical_location_trust_boundary.sql to be applied.
--
-- These cases isolate the ONLY thing the migration changes: which reeve.system_action values let
-- the canonical-location lock bypass. Status is held at 'unlisted' (no status transition) so the
-- lock's trust predicate is exercised directly, without the publish-invariant / geo-association
-- machinery that a real relist also runs. The reeve.system_action value is set manually to stand in
-- for what each trusted RPC / the status trigger sets. The full end-to-end relist and admin flows
-- are covered by the deterministic static simulation and the manual post-deploy smoke checklist.

BEGIN;

CREATE TEMP TABLE _r(k text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE _tpl ON COMMIT DROP AS SELECT * FROM public.properties LIMIT 1;

DO $$
DECLARE
  v_pid  uuid := gen_random_uuid();
  v_uid  uuid := (SELECT id FROM public.users WHERE role::text = 'user' LIMIT 1);
  -- Baseline canonical point (Bangalore) and a clearly different forged point (Mumbai).
  lat0 numeric := 12.9716; lng0 numeric := 77.5946;
  lat1 numeric := 19.0760; lng1 numeric := 72.8777;
  geom0 extensions.geometry(Point,4326) := extensions.ST_SetSRID(extensions.ST_MakePoint(77.5946, 12.9716), 4326);
  geom1 extensions.geometry(Point,4326) := extensions.ST_SetSRID(extensions.ST_MakePoint(72.8777, 19.0760), 4326);
  ok boolean; err text;
BEGIN
  -- Insert an unlisted, previously-published property with a valid canonical location.
  -- Done under a trusted value so the INSERT branch of the lock accepts the seeded location.
  PERFORM set_config('reeve.system_action', 'geo_apply_v2', true);
  UPDATE _tpl SET
    id = v_pid, owner_id = v_uid, status = 'unlisted'::property_status, is_active = false,
    latitude = lat0, longitude = lng0, geom_exact = geom0, country_code = 'IN';
  INSERT INTO public.properties SELECT * FROM _tpl;
  PERFORM set_config('reeve.system_action', '', true);

  -- Case 1 (THE FIX): status_change must NOT authorize a canonical-geometry change.
  PERFORM set_config('reeve.system_action', 'status_change', true);
  ok := true; err := NULL;
  BEGIN
    UPDATE public.properties SET geom_exact = geom1 WHERE id = v_pid;
  EXCEPTION WHEN OTHERS THEN ok := false; err := SQLERRM;
  END;
  INSERT INTO _r VALUES('1  status_change + forged geom -> BLOCK',
    NOT ok AND err = 'canonical location must be changed via the trusted location flow',
    format('raised=%s msg=%s', NOT ok, err));
  -- restore baseline
  PERFORM set_config('reeve.system_action', 'geo_apply_v2', true);
  UPDATE public.properties SET geom_exact = geom0, latitude = lat0, longitude = lng0 WHERE id = v_pid;
  PERFORM set_config('reeve.system_action', '', true);

  -- Case 2 (clean relist analog): status_change with NO location change passes the lock.
  PERFORM set_config('reeve.system_action', 'status_change', true);
  ok := true; err := NULL;
  BEGIN
    UPDATE public.properties SET geom_exact = geom0 WHERE id = v_pid;  -- not DISTINCT -> lock no-op
  EXCEPTION WHEN OTHERS THEN ok := false; err := SQLERRM;
  END;
  INSERT INTO _r VALUES('2  status_change + unchanged location -> PASS', ok, format('msg=%s', err));
  PERFORM set_config('reeve.system_action', '', true);

  -- Case 3 (legit authority preserved): geo_apply_v2 still bypasses the lock for a geom change.
  PERFORM set_config('reeve.system_action', 'geo_apply_v2', true);
  ok := true; err := NULL;
  BEGIN
    UPDATE public.properties SET geom_exact = geom1 WHERE id = v_pid;
  EXCEPTION WHEN OTHERS THEN ok := false; err := SQLERRM;
  END;
  INSERT INTO _r VALUES('3  geo_apply_v2 + geom change -> PASS', ok, format('msg=%s', err));
  -- restore baseline
  PERFORM set_config('reeve.system_action', 'geo_apply_v2', true);
  UPDATE public.properties SET geom_exact = geom0, latitude = lat0, longitude = lng0 WHERE id = v_pid;
  PERFORM set_config('reeve.system_action', '', true);

  -- Case 4 (baseline unchanged): empty GUC still blocks a canonical-geometry change.
  ok := true; err := NULL;
  BEGIN
    UPDATE public.properties SET geom_exact = geom1 WHERE id = v_pid;
  EXCEPTION WHEN OTHERS THEN ok := false; err := SQLERRM;
  END;
  INSERT INTO _r VALUES('4  empty GUC + forged geom -> BLOCK',
    NOT ok AND err = 'canonical location must be changed via the trusted location flow',
    format('raised=%s msg=%s', NOT ok, err));
  PERFORM set_config('reeve.system_action', 'geo_apply_v2', true);
  UPDATE public.properties SET geom_exact = geom0, latitude = lat0, longitude = lng0 WHERE id = v_pid;
  PERFORM set_config('reeve.system_action', '', true);

  -- Case 5 (non-location value not trusted): confirm_rent must NOT authorize a geom change.
  PERFORM set_config('reeve.system_action', 'confirm_rent', true);
  ok := true; err := NULL;
  BEGIN
    UPDATE public.properties SET geom_exact = geom1 WHERE id = v_pid;
  EXCEPTION WHEN OTHERS THEN ok := false; err := SQLERRM;
  END;
  INSERT INTO _r VALUES('5  confirm_rent + forged geom -> BLOCK',
    NOT ok AND err = 'canonical location must be changed via the trusted location flow',
    format('raised=%s msg=%s', NOT ok, err));
  PERFORM set_config('reeve.system_action', '', true);
END $$;

SELECT k, pass, detail FROM _r ORDER BY k;

ROLLBACK;
