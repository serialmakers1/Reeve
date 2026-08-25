-- Focused verification for the durable R2 deletion outbox (Group 5).
-- Run inside a rolled-back transaction (safe on any environment):
--   psql "$DATABASE_URL" -f supabase/tests/r2_deletion_outbox.sql
-- or paste into the SQL editor. Ends with ROLLBACK so nothing is persisted.
--
-- Requires migration 20260825000000_group5_r2_deletion_outbox.sql to be applied.
-- Drives the REAL AFTER DELETE trigger (no triggers disabled). An admin JWT claim
-- plus reeve.system_action lets enforce_property_image_policy permit the delete.

BEGIN;

-- Admin subject + photo-op flag so the BEFORE-DELETE policy trigger allows the delete.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT id::text FROM public.users
                            WHERE role::text IN ('admin','super_admin') LIMIT 1),
                    'role','authenticated')::text, true);
SELECT set_config('reeve.system_action', 'photo_op', true);

CREATE TEMP TABLE _r(k text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE _tpl ON COMMIT DROP AS SELECT * FROM public.properties LIMIT 1;

DO $$
DECLARE
  v_pid  uuid := gen_random_uuid();
  v_uid  uuid := (SELECT id FROM public.users WHERE role::text IN ('admin','super_admin') LIMIT 1);
  v_url  text := 'https://images.reeve.in/properties/' || v_pid::text || '/photos/abc-123.webp';
  v_key  text := 'properties/' || v_pid::text || '/photos/abc-123.webp';
  v_img  uuid;
  v_cnt  int;
BEGIN
  -- Fresh hidden draft property so no publication rules interfere.
  UPDATE _tpl SET id = v_pid, status = 'draft'::property_status, is_active = false;
  INSERT INTO public.properties SELECT * FROM _tpl;

  -- 1. Delete of a prefixed image enqueues exactly one outbox row with the stripped key.
  v_img := gen_random_uuid();
  INSERT INTO public.property_images(id, property_id, uploaded_by, url)
    VALUES (v_img, v_pid, v_uid, v_url);
  DELETE FROM public.property_images WHERE id = v_img;
  SELECT count(*) INTO v_cnt FROM public.pending_r2_deletions WHERE object_key = v_key;
  INSERT INTO _r VALUES('1  enqueue on delete', v_cnt = 1, format('rows=%s key=%s', v_cnt, v_key));

  -- 2. Dedup: re-insert same url + delete again → still exactly one row (ON CONFLICT).
  v_img := gen_random_uuid();
  INSERT INTO public.property_images(id, property_id, uploaded_by, url)
    VALUES (v_img, v_pid, v_uid, v_url);
  DELETE FROM public.property_images WHERE id = v_img;
  SELECT count(*) INTO v_cnt FROM public.pending_r2_deletions WHERE object_key = v_key;
  INSERT INTO _r VALUES('2  dedup on re-delete', v_cnt = 1, format('rows=%s', v_cnt));

  -- 3. A url lacking the public prefix enqueues nothing.
  v_img := gen_random_uuid();
  INSERT INTO public.property_images(id, property_id, uploaded_by, url)
    VALUES (v_img, v_pid, v_uid, 'https://elsewhere.example/x.webp');
  DELETE FROM public.property_images WHERE id = v_img;
  SELECT count(*) INTO v_cnt FROM public.pending_r2_deletions
    WHERE object_key IN ('https://elsewhere.example/x.webp', 'x.webp');
  INSERT INTO _r VALUES('3  non-prefixed skipped', v_cnt = 0, format('rows=%s', v_cnt));
END $$;

-- 4. Clients cannot read the outbox (RLS enabled + no policies + no table grant).
INSERT INTO _r VALUES('4  anon no SELECT',
  has_table_privilege('anon', 'public.pending_r2_deletions', 'SELECT') = false, 'anon');
INSERT INTO _r VALUES('4  authenticated no SELECT',
  has_table_privilege('authenticated', 'public.pending_r2_deletions', 'SELECT') = false, 'authenticated');
INSERT INTO _r VALUES('4  service_role has DELETE',
  has_table_privilege('service_role', 'public.pending_r2_deletions', 'DELETE') = true, 'service_role');

SELECT k, pass, detail FROM _r ORDER BY k;

ROLLBACK;
