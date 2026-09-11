-- Focused verification for F-10 — admin-field protection on callback_requests.
-- Run inside a rolled-back transaction (safe on any environment):
--   psql "$DATABASE_URL" -f supabase/tests/callback_admin_field_protection.sql
-- or paste into the SQL editor. Ends with ROLLBACK so nothing is persisted.
--
-- Requires migration:
--   20260912000000_f10_protect_callback_admin_fields.sql
--
-- Drives the REAL BEFORE UPDATE trigger under authenticated JWT claims (auth.uid() = sub).
-- is_admin() reads public.users.role for that sub, so admin vs non-admin is simulated by choosing an
-- existing admin / non-admin user id — no role mutation. Rows are reset between scenarios and rolled
-- back at the end. Executing role bypasses RLS in the editor; this test targets the trigger boundary
-- (the F-10 fix), exactly as callback_abuse_controls.sql targets its triggers/index.

BEGIN;

CREATE TEMP TABLE _r(k text, pass boolean, detail text) ON COMMIT DROP;

DO $$
DECLARE
  v_user  uuid := (SELECT id FROM public.users WHERE role::text NOT IN ('admin','super_admin') ORDER BY created_at LIMIT 1);
  v_admin uuid := (SELECT id FROM public.users WHERE role::text IN ('admin','super_admin') ORDER BY created_at LIMIT 1);
  v_notes text;
  v_called timestamptz;
  v_completed timestamptz;
  v_slot text;
BEGIN
  IF v_user IS NULL THEN
    INSERT INTO _r VALUES('00 prerequisite', false, 'no non-admin user available'); RETURN;
  END IF;

  -- ── Non-admin owner path ────────────────────────────────────────────────────
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text, true);

  DELETE FROM public.callback_requests WHERE user_id = v_user;
  INSERT INTO public.callback_requests(user_id, intent, name, phone, preferred_date, preferred_slot, status)
  VALUES (v_user, 'tenant', 'Test', '+919999999999', current_date, '10_11', 'pending');

  -- 1. admin_notes cannot be set by a non-admin owner (pinned to OLD = NULL).
  UPDATE public.callback_requests SET admin_notes = 'injected by user' WHERE user_id = v_user;
  SELECT admin_notes INTO v_notes FROM public.callback_requests WHERE user_id = v_user;
  INSERT INTO _r VALUES('01 non-admin admin_notes pinned', v_notes IS NULL, format('stored=%s', v_notes));

  -- 2. called_at pinned.
  UPDATE public.callback_requests SET called_at = now() WHERE user_id = v_user;
  SELECT called_at INTO v_called FROM public.callback_requests WHERE user_id = v_user;
  INSERT INTO _r VALUES('02 non-admin called_at pinned', v_called IS NULL, format('stored=%s', v_called));

  -- 3. completed_at pinned.
  UPDATE public.callback_requests SET completed_at = now() WHERE user_id = v_user;
  SELECT completed_at INTO v_completed FROM public.callback_requests WHERE user_id = v_user;
  INSERT INTO _r VALUES('03 non-admin completed_at pinned', v_completed IS NULL, format('stored=%s', v_completed));

  -- 4. All three at once → all pinned.
  UPDATE public.callback_requests
     SET admin_notes = 'x', called_at = now(), completed_at = now()
   WHERE user_id = v_user;
  SELECT admin_notes, called_at, completed_at INTO v_notes, v_called, v_completed
    FROM public.callback_requests WHERE user_id = v_user;
  INSERT INTO _r VALUES('04 non-admin all three pinned',
    v_notes IS NULL AND v_called IS NULL AND v_completed IS NULL,
    format('notes=%s called=%s completed=%s', v_notes, v_called, v_completed));

  -- 5. A legitimate pending-row field the owner may edit still applies (trigger is surgical).
  UPDATE public.callback_requests SET preferred_slot = '15_16' WHERE user_id = v_user;
  SELECT preferred_slot INTO v_slot FROM public.callback_requests WHERE user_id = v_user;
  INSERT INTO _r VALUES('05 non-admin legit field applies', v_slot = '15_16', format('slot=%s', v_slot));

  -- ── Admin path ──────────────────────────────────────────────────────────────
  IF v_admin IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_admin::text, 'role', 'authenticated')::text, true);
    UPDATE public.callback_requests
       SET admin_notes = 'by admin', called_at = now(), completed_at = now(), status = 'completed'
     WHERE user_id = v_user;
    SELECT admin_notes, called_at, completed_at INTO v_notes, v_called, v_completed
      FROM public.callback_requests WHERE user_id = v_user;
    INSERT INTO _r VALUES('06 admin can write admin fields',
      v_notes = 'by admin' AND v_called IS NOT NULL AND v_completed IS NOT NULL,
      format('notes=%s called=%s completed=%s', v_notes, v_called, v_completed));
  ELSE
    INSERT INTO _r VALUES('06 admin can write admin fields', true, 'skipped: no admin user');
  END IF;

  -- ── Service/system path (auth.uid() NULL) ────────────────────────────────────
  PERFORM set_config('request.jwt.claims', NULL, true);
  UPDATE public.callback_requests SET admin_notes = 'by system', called_at = now()
   WHERE user_id = v_user;
  SELECT admin_notes, called_at INTO v_notes, v_called FROM public.callback_requests WHERE user_id = v_user;
  INSERT INTO _r VALUES('07 service context unaffected',
    v_notes = 'by system' AND v_called IS NOT NULL, format('notes=%s called=%s', v_notes, v_called));

  -- 8. Trigger present alongside sibling protections.
  INSERT INTO _r VALUES('08 pin_admin_fields trigger present',
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.callback_requests'::regclass
            AND tgname='trg_callback_requests_pin_admin_fields' AND NOT tgisinternal), '');
END $$;

SELECT k, pass, detail FROM _r ORDER BY k;

ROLLBACK;
