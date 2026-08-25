-- Focused verification for the server-side 15-photo cap in submit_property_edit_request.
-- Run inside a rolled-back transaction (safe on any environment):
--   psql "$DATABASE_URL" -f supabase/tests/property_image_cap.sql
-- or paste into the SQL editor. Ends with ROLLBACK so nothing is persisted.
--
-- Requires migration 20260825000010_group5_submit_photo_cap.sql to be applied.
-- Drives the REAL submit RPC (no triggers disabled) under an admin JWT claim.

BEGIN;

-- Admin subject so is_admin() = true (owner-transition bypass) and the RPC's own gate passes.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT id::text FROM public.users
                            WHERE role::text IN ('admin','super_admin') LIMIT 1),
                    'role','authenticated')::text, true);

CREATE TEMP TABLE _r(k text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE _tpl ON COMMIT DROP AS SELECT * FROM public.properties LIMIT 1;

DO $$
DECLARE
  v_pid uuid := gen_random_uuid();
  v_uid uuid := (SELECT id FROM public.users WHERE role::text IN ('admin','super_admin') LIMIT 1);
  v_base text := 'https://images.reeve.in/properties/' || v_pid::text || '/photos/';
  v_add jsonb;
  i int;
  ok boolean;
  got_code text;
BEGIN
  -- A listed property with exactly 13 live images (so live + add tips over 15 at add=3).
  UPDATE _tpl SET id = v_pid, status = 'listed'::property_status, is_active = true;
  INSERT INTO public.properties SELECT * FROM _tpl;
  FOR i IN 1..13 LOOP
    INSERT INTO public.property_images(property_id, uploaded_by, url)
      VALUES (v_pid, v_uid, v_base || 'live-' || i || '.webp');
  END LOOP;

  -- 1. live(13) + distinct add(2) = 15 → submit SUCCEEDS.
  v_add := jsonb_build_array(
    jsonb_build_object('url', v_base || 'a1.webp'),
    jsonb_build_object('url', v_base || 'a2.webp'));
  ok := true;
  BEGIN
    PERFORM public.submit_property_edit_request(v_pid, '{}'::jsonb, jsonb_build_object('add', v_add));
  EXCEPTION WHEN OTHERS THEN ok := false; got_code := SQLSTATE;
  END;
  INSERT INTO _r VALUES('1  at-15 allowed', ok, format('raised=%s code=%s', NOT ok, got_code));

  -- 2. live(13) + distinct add(3) = 16 → submit REJECTED with PHOTO_LIMIT_REACHED (P0001).
  v_add := jsonb_build_array(
    jsonb_build_object('url', v_base || 'b1.webp'),
    jsonb_build_object('url', v_base || 'b2.webp'),
    jsonb_build_object('url', v_base || 'b3.webp'));
  ok := false; got_code := NULL;
  BEGIN
    PERFORM public.submit_property_edit_request(v_pid, '{}'::jsonb, jsonb_build_object('add', v_add));
  EXCEPTION WHEN OTHERS THEN ok := true; got_code := SQLERRM;
  END;
  INSERT INTO _r VALUES('2  over-15 rejected', ok AND got_code = 'PHOTO_LIMIT_REACHED', format('err=%s', got_code));

  -- 3. Existing prefix validation still rejects a foreign URL (defense preserved).
  ok := false; got_code := NULL;
  BEGIN
    PERFORM public.submit_property_edit_request(v_pid, '{}'::jsonb,
      jsonb_build_object('add', jsonb_build_array(jsonb_build_object('url', 'https://evil.example/x.webp'))));
  EXCEPTION WHEN OTHERS THEN ok := true; got_code := SQLERRM;
  END;
  INSERT INTO _r VALUES('3  foreign URL rejected', ok AND got_code <> 'PHOTO_LIMIT_REACHED', format('err=%s', got_code));
END $$;

SELECT k, pass, detail FROM _r ORDER BY k;

ROLLBACK;
