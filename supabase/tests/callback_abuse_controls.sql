-- Focused verification for SEC-AUDIT-05 callback abuse controls.
-- Run inside a rolled-back transaction (safe on any environment):
--   psql "$DATABASE_URL" -f supabase/tests/callback_abuse_controls.sql
-- or paste into the SQL editor. Ends with ROLLBACK so nothing is persisted.
--
-- Requires migrations:
--   20260909150000_sec_audit_05_drop_dead_callback_n8n_trigger.sql
--   20260909150001_sec_audit_05_callback_one_active_index.sql
--   20260909150002_sec_audit_05_callback_creation_quota.sql
--
-- Drives REAL triggers/index under an authenticated JWT claim (auth.uid() = v_uid).
-- Between scenarios it DELETEs the test user's rows to reset state (rolled back at the end).

BEGIN;

CREATE TEMP TABLE _r(k text, pass boolean, detail text) ON COMMIT DROP;

DO $$
DECLARE
  v_uid   uuid := (SELECT id FROM public.users ORDER BY created_at LIMIT 1);
  v_other uuid := (SELECT id FROM public.users WHERE id <> (SELECT id FROM public.users ORDER BY created_at LIMIT 1) ORDER BY created_at LIMIT 1);
  ok boolean;
  got text;
  v_stored timestamptz;
  v_upd_before timestamptz;
  v_upd_after timestamptz;
  i int;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_uid::text, 'role', 'authenticated')::text, true);

  -- helper insert values are inline; domestic → phone required by CHECK.

  -- 1. No active callback → first creation SUCCEEDS.
  ok := true; got := NULL;
  BEGIN
    INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status)
    VALUES (v_uid, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'pending');
  EXCEPTION WHEN OTHERS THEN ok := false; got := SQLERRM; END;
  INSERT INTO _r VALUES('01 first create allowed', ok, format('err=%s', got));

  -- 2. Second active (pending) for same user → rejected 23505 (one-active index).
  ok := false; got := NULL;
  BEGIN
    INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status)
    VALUES (v_uid, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'pending');
  EXCEPTION WHEN OTHERS THEN ok := true; got := SQLSTATE; END;
  INSERT INTO _r VALUES('02 second pending rejected', ok AND got = '23505', format('sqlstate=%s', got));

  -- 3. 'called' also counts as active → still rejected 23505.
  UPDATE public.callback_requests SET status = 'called' WHERE user_id = v_uid;
  ok := false; got := NULL;
  BEGIN
    INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status)
    VALUES (v_uid, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'pending');
  EXCEPTION WHEN OTHERS THEN ok := true; got := SQLSTATE; END;
  INSERT INTO _r VALUES('03 called blocks new', ok AND got = '23505', format('sqlstate=%s', got));

  -- 4. After terminal status the slot frees → creation allowed again.
  UPDATE public.callback_requests SET status = 'completed' WHERE user_id = v_uid;
  ok := true; got := NULL;
  BEGIN
    INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status)
    VALUES (v_uid, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'pending');
  EXCEPTION WHEN OTHERS THEN ok := false; got := SQLERRM; END;
  INSERT INTO _r VALUES('04 terminal frees slot', ok, format('err=%s', got));

  -- reset
  DELETE FROM public.callback_requests WHERE user_id = v_uid;

  -- 7b. Spoofed NEW.user_id (another user) → trigger raises 'Not authorized' BEFORE any
  -- lock/count. Skipped if only one user exists.
  IF v_other IS NOT NULL THEN
    ok := false; got := NULL;
    BEGIN
      INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status)
      VALUES (v_other, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'pending');
    EXCEPTION WHEN OTHERS THEN ok := true; got := SQLERRM; END;
    INSERT INTO _r VALUES('7b spoofed user_id blocked', ok AND got = 'Not authorized', format('err=%s', got));
  ELSE
    INSERT INTO _r VALUES('7b spoofed user_id blocked', true, 'skipped: only one user');
  END IF;

  -- 12c. Backdated created_at on INSERT is discarded (stored ≈ now()).
  DELETE FROM public.callback_requests WHERE user_id = v_uid;
  INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status, created_at)
  VALUES (v_uid, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'pending', now() - interval '48 hours');
  SELECT created_at INTO v_stored FROM public.callback_requests WHERE user_id = v_uid;
  INSERT INTO _r VALUES('12c insert created_at forced', v_stored > now() - interval '5 minutes',
    format('stored=%s', v_stored));

  -- 12d. Backdating created_at via UPDATE is pinned (unchanged).
  UPDATE public.callback_requests SET created_at = now() - interval '48 hours' WHERE user_id = v_uid;
  SELECT created_at INTO v_stored FROM public.callback_requests WHERE user_id = v_uid;
  INSERT INTO _r VALUES('12d update created_at pinned', v_stored > now() - interval '5 minutes',
    format('stored=%s', v_stored));

  -- 16/17. updated_at trigger refreshes the column on UPDATE (shared trigger intact).
  -- NOTE: now() is the transaction-start time and is constant within this single test
  -- transaction, so two UPDATEs cannot show a strict increase. Instead, an UPDATE that TRIES to
  -- write a stale updated_at must be overridden by the trigger back to the transaction time —
  -- that override is the proof the trigger fired.
  UPDATE public.callback_requests SET updated_at = now() - interval '1 day', admin_notes = 'x'
    WHERE user_id = v_uid;
  SELECT updated_at INTO v_upd_after FROM public.callback_requests WHERE user_id = v_uid;
  INSERT INTO _r VALUES('16 updated_at trigger overrides stale', v_upd_after > now() - interval '1 hour',
    format('stored=%s (stale value discarded)', v_upd_after));

  -- 9/10. Quota: 3 creations in 24h allowed, 4th rejected CALLBACK_RATE_LIMITED (P0001).
  DELETE FROM public.callback_requests WHERE user_id = v_uid;
  ok := true; got := NULL;
  BEGIN
    FOR i IN 1..3 LOOP
      INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status)
      VALUES (v_uid, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'completed');
    END LOOP;
  EXCEPTION WHEN OTHERS THEN ok := false; got := SQLERRM; END;
  INSERT INTO _r VALUES('09 three in window allowed', ok, format('err=%s', got));

  ok := false; got := NULL;
  BEGIN
    INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status)
    VALUES (v_uid, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'completed');
  EXCEPTION WHEN OTHERS THEN ok := true; got := SQLERRM; END;
  INSERT INTO _r VALUES('10 fourth rejected quota', ok AND got = 'CALLBACK_RATE_LIMITED', format('err=%s', got));

  -- 18. Dead n8n trigger is gone; 19. updated_at trigger present.
  INSERT INTO _r VALUES('18 n8n-callbacks trigger absent',
    NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.callback_requests'::regclass
                AND tgname='n8n-callbacks' AND NOT tgisinternal), '');
  INSERT INTO _r VALUES('19 updated_at trigger present',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.callback_requests'::regclass
            AND tgname='trg_callback_requests_updated_at' AND NOT tgisinternal), '');
END $$;

SELECT k, pass, detail FROM _r ORDER BY k;

ROLLBACK;
