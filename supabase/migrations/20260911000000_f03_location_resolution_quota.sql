-- F-03 — server-side per-user quota for the confirm-property-location location engine.
--
-- FINDING (F-03, PARTIALLY CONFIRMED, LOW severity — authenticated provider-cost/quota gap)
--   An authenticated owner of a draft/changes_requested property can invoke
--   confirm-property-location use_pin/commit_pin without limit. Each accepted call makes fresh
--   server-credentialed Google requests (~1 reverse-geocode + up to 6 Place Details). use_pin
--   persists nothing, so it is replayable indefinitely against the same draft, and there is no
--   Reeve-side rate/quota/cooldown/concurrency control on the path. Authentication/ownership bound
--   WHO may call, not HOW OFTEN.
--
-- FIX (independent abuse-control layer; touches NO location/geography/status/F-02 logic)
--   A private per-user fixed-window counter + a service-role-only SECURITY DEFINER function the
--   trusted Edge calls (passing the JWT-derived user id, exactly like apply_final_property_location)
--   immediately BEFORE the first Google call. Only a strict TRUE proceeds to Google.
--
-- POLICY: at most 60 accepted use_pin+commit_pin calls per rolling-reset 10-minute window per user
--   (intentionally generous: a real owner setting one property issues ~10-20 accepted calls; a power
--   owner/admin ~100/hour — well under 60/10min sustained). Tune later via a follow-up migration.
--
-- SECURITY NOTES
--   * The counter table lives in the `private` schema (NOT exposed via PostgREST) → browser roles
--     cannot see or touch it. RLS is enabled with no policy (deny-all), matching the accepted
--     service-role-only deny-all pattern (rls_enabled_no_policy is intentional here).
--   * The function is SECURITY DEFINER owned by postgres with EXECUTE granted ONLY to service_role
--     (REVOKEd from PUBLIC/anon/authenticated) — identical ACL shape to apply_final_property_location.
--     The browser cannot call it even though it lives in `public`.
--   * Identity is the caller-passed p_user_id (the Edge sets it to the authenticated JWT user id);
--     the browser never reaches the DB function directly, so it cannot spoof another user's counter.
--   * search_path pinned to keep function_search_path_mutable at zero (deps: pg_catalog builtins +
--     the private table, referenced fully-qualified).
--   * A per-user transaction advisory lock serializes same-user calls so the read-modify-write of the
--     counter is race-safe under READ COMMITTED; different users use different lock keys.

-- ─── private per-user counter (one row per user, updated in place; no unbounded growth) ───────
CREATE TABLE IF NOT EXISTS private.location_resolution_quota (
  user_id       uuid PRIMARY KEY,
  window_start  timestamptz NOT NULL,
  request_count integer     NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.location_resolution_quota ENABLE ROW LEVEL SECURITY;
-- Intentional deny-all: no policy. Only the SECURITY DEFINER function (as owner postgres) touches it.
REVOKE ALL ON TABLE private.location_resolution_quota FROM PUBLIC, anon, authenticated;

-- ─── atomic consume + verdict (boolean): TRUE = proceed, FALSE = over quota ───────────────────
CREATE OR REPLACE FUNCTION public.consume_location_resolution_quota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $$
DECLARE
  v_limit  constant integer  := 60;
  v_window constant interval := interval '10 minutes';
  v_count  integer;
  v_start  timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false; -- fail closed: no identity, no provider work
  END IF;

  -- Serialize concurrent calls by this user so the read-modify-write below is race-safe.
  PERFORM pg_advisory_xact_lock(hashtext('locqf:' || p_user_id::text));

  SELECT window_start, request_count
    INTO v_start, v_count
    FROM private.location_resolution_quota
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO private.location_resolution_quota (user_id, window_start, request_count, updated_at)
    VALUES (p_user_id, now(), 1, now());
    RETURN true;
  END IF;

  -- Tumbling window: reset once elapsed.
  IF now() - v_start >= v_window THEN
    UPDATE private.location_resolution_quota
       SET window_start = now(), request_count = 1, updated_at = now()
     WHERE user_id = p_user_id;
    RETURN true;
  END IF;

  IF v_count >= v_limit THEN
    RETURN false; -- over quota; do NOT increment
  END IF;

  UPDATE private.location_resolution_quota
     SET request_count = request_count + 1, updated_at = now()
   WHERE user_id = p_user_id;
  RETURN true;
END;
$$;

ALTER FUNCTION public.consume_location_resolution_quota(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.consume_location_resolution_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_location_resolution_quota(uuid) TO service_role;

-- ─── Fail loudly if anything is missing ──────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('private.location_resolution_quota') IS NULL THEN
    RAISE EXCEPTION 'F-03: private.location_resolution_quota missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'private' AND c.relname = 'location_resolution_quota' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'F-03: RLS not enabled on private.location_resolution_quota';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'consume_location_resolution_quota'
       AND has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'F-03: service_role EXECUTE on consume_location_resolution_quota missing';
  END IF;
  IF has_function_privilege('authenticated',
        'public.consume_location_resolution_quota(uuid)', 'EXECUTE')
     OR has_function_privilege('anon',
        'public.consume_location_resolution_quota(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'F-03: browser roles must NOT have EXECUTE on consume_location_resolution_quota';
  END IF;
END $$;
