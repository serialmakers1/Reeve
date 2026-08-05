-- Search location memory (cross-device) for authenticated users.
-- One row per user holding a versioned, bounded city/area history JSONB blob.
-- Anonymous users keep their memory in localStorage; this table is the account-scoped,
-- cross-device mirror. Not related to `rental_preferences` (different semantics).
--
-- The `history` shape is validated + capped client-side (SearchLocationHistoryV1:
-- <= 5 cities, <= 8 recent areas/city). The DB only guards that it is a JSON object.

CREATE TABLE IF NOT EXISTS public.search_location_preferences (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version smallint NOT NULL DEFAULT 1,
  history        jsonb NOT NULL DEFAULT '{"version":1,"cities":[]}'::jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT search_location_preferences_history_is_object
    CHECK (jsonb_typeof(history) = 'object')
);

ALTER TABLE public.search_location_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: a user may read/write ONLY their own row. No anon access. Policies are split
-- per-operation because Postgres does not accept USING/WITH CHECK uniformly across
-- all commands (SELECT takes USING only; INSERT takes WITH CHECK only).
DROP POLICY IF EXISTS "slp_select_own" ON public.search_location_preferences;
CREATE POLICY "slp_select_own"
ON public.search_location_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "slp_insert_own" ON public.search_location_preferences;
CREATE POLICY "slp_insert_own"
ON public.search_location_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "slp_update_own" ON public.search_location_preferences;
CREATE POLICY "slp_update_own"
ON public.search_location_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- No DELETE policy (rows are cascade-removed with the auth user).

GRANT SELECT, INSERT, UPDATE ON public.search_location_preferences TO authenticated;

-- Reuse the repository's existing updated-at trigger function (see callback_requests).
DROP TRIGGER IF EXISTS trg_search_location_preferences_updated_at
  ON public.search_location_preferences;
CREATE TRIGGER trg_search_location_preferences_updated_at
BEFORE UPDATE ON public.search_location_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
