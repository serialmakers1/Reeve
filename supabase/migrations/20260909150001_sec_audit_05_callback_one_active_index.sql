-- SEC-AUDIT-05 (part 2/3) — INV-1: at most one ACTIVE callback per user (server-enforced).
--
-- ROOT CAUSE (confirmed against live state, read-only)
--   The "one active callback" rule existed only in the client (RequestCallbackButton) and was
--   bypassable by any direct PostgREST/supabase-js INSERT. RLS binds identity
--   (user_id = auth.uid()) but imposes no one-active or quota control. This index makes the
--   invariant a hard database guarantee that even raw PostgREST callers cannot bypass, and it
--   is concurrency-safe (the unique index resolves the race — one concurrent insert wins, the
--   other gets SQLSTATE 23505).
--
-- ACTIVE STATUS SET = {'pending','called'} — mirrors the authoritative client rule
--   (RequestCallbackButton.tsx). The legitimate lifecycle pending -> called -> completed/
--   missed/cancelled never yields two simultaneously-active rows for one user.
--
-- EXISTING DATA
--   Verified read-only before authoring: 0 rows, 0 users with >1 active row. The guard DO block
--   re-checks at apply time and FAILS LOUDLY if any active duplicate exists (never auto-mutates
--   customer callbacks).

DO $$
DECLARE
  v_dupes bigint;
BEGIN
  SELECT count(*) INTO v_dupes
  FROM (
    SELECT user_id
    FROM public.callback_requests
    WHERE status IN ('pending', 'called')
    GROUP BY user_id
    HAVING count(*) > 1
  ) s;

  IF v_dupes > 0 THEN
    RAISE EXCEPTION
      'SEC-AUDIT-05: % user(s) already have >1 active callback; resolve manually before adding the one-active index',
      v_dupes;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS callback_requests_one_active_per_user
  ON public.callback_requests (user_id)
  WHERE status IN ('pending', 'called');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'callback_requests'
      AND indexname = 'callback_requests_one_active_per_user'
  ) THEN
    RAISE EXCEPTION 'SEC-AUDIT-05: one-active partial unique index was not created';
  END IF;
END $$;
