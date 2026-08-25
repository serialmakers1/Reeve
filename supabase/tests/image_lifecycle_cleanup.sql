-- Focused verification for property-image lifecycle cleanup (Group 5, Prompt 3).
-- Run inside a rolled-back transaction (safe on any environment):
--   psql "$DATABASE_URL" -f supabase/tests/image_lifecycle_cleanup.sql
-- or paste into the SQL editor. Ends with ROLLBACK so nothing is persisted.
--
-- Requires migrations 20260825000000 (outbox) and 20260825000020 (lifecycle) applied.
-- Drives the REAL triggers (none disabled) under an admin JWT claim.

BEGIN;

SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT id::text FROM public.users
                            WHERE role::text IN ('admin','super_admin') LIMIT 1),
                    'role','authenticated')::text, true);

CREATE TEMP TABLE _r(k text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE _tpl ON COMMIT DROP AS SELECT * FROM public.properties LIMIT 1;

-- helper: does an outbox row exist for this key?
CREATE FUNCTION pg_temp._enq(p_key text) RETURNS boolean AS $f$
  SELECT EXISTS(SELECT 1 FROM public.pending_r2_deletions WHERE object_key = p_key); $f$ LANGUAGE sql;

-- helper: spawn a listed property, return id
CREATE FUNCTION pg_temp._mk_listed() RETURNS uuid AS $f$
DECLARE v uuid := gen_random_uuid();
BEGIN
  UPDATE _tpl SET id=v, status='listed'::property_status, is_active=true;
  INSERT INTO public.properties SELECT * FROM _tpl;
  RETURN v;
END $f$ LANGUAGE plpgsql;

DO $$
DECLARE
  v uuid; v2 uuid; own uuid; er uuid;
  base text; k1 text; k2 text; foreign_key text;
  n_before int;
BEGIN
  -- 1. reject → staged add enqueued (A2 trigger on pending→rejected)
  v := pg_temp._mk_listed(); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  base := 'https://images.reeve.in/properties/'||v::text||'/photos/';
  k1 := 'properties/'||v::text||'/photos/'||gen_random_uuid()||'.webp';
  er := gen_random_uuid();
  INSERT INTO public.property_edit_requests(id, property_id, owner_id, status, payload)
    VALUES (er, v, own, 'pending', jsonb_build_object('photo_changes',
      jsonb_build_object('add', jsonb_build_array(jsonb_build_object('url', 'https://images.reeve.in/'||k1)))));
  UPDATE public.property_edit_requests SET status='rejected' WHERE id=er;
  INSERT INTO _r VALUES('1  reject enqueues', pg_temp._enq(k1), k1);

  -- 2. supersede → old staged add enqueued
  v := pg_temp._mk_listed(); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  k1 := 'properties/'||v::text||'/photos/'||gen_random_uuid()||'.webp';
  er := gen_random_uuid();
  INSERT INTO public.property_edit_requests(id, property_id, owner_id, status, payload)
    VALUES (er, v, own, 'pending', jsonb_build_object('photo_changes',
      jsonb_build_object('add', jsonb_build_array(jsonb_build_object('url','https://images.reeve.in/'||k1)))));
  UPDATE public.property_edit_requests SET status='superseded' WHERE id=er;
  INSERT INTO _r VALUES('2  supersede enqueues', pg_temp._enq(k1), k1);

  -- 3. withdraw/cancel → staged add enqueued
  v := pg_temp._mk_listed(); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  k1 := 'properties/'||v::text||'/photos/'||gen_random_uuid()||'.webp';
  er := gen_random_uuid();
  INSERT INTO public.property_edit_requests(id, property_id, owner_id, status, payload)
    VALUES (er, v, own, 'pending', jsonb_build_object('photo_changes',
      jsonb_build_object('add', jsonb_build_array(jsonb_build_object('url','https://images.reeve.in/'||k1)))));
  UPDATE public.property_edit_requests SET status='withdrawn' WHERE id=er;
  INSERT INTO _r VALUES('3  withdraw enqueues', pg_temp._enq(k1), k1);

  -- 4. archive → live property_images rows removed + their keys enqueued
  v := pg_temp._mk_listed(); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  k1 := 'properties/'||v::text||'/photos/'||gen_random_uuid()||'.webp';
  INSERT INTO public.property_images(property_id, uploaded_by, url) VALUES (v, own, 'https://images.reeve.in/'||k1);
  UPDATE public.properties SET status='archived' WHERE id=v;
  INSERT INTO _r VALUES('4  archive deletes rows',
    NOT EXISTS(SELECT 1 FROM public.property_images WHERE property_id=v), 'rows gone');
  INSERT INTO _r VALUES('4  archive enqueues live key', pg_temp._enq(k1), k1);

  -- 5. unlist → images retained, nothing enqueued for them
  v := pg_temp._mk_listed(); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  k1 := 'properties/'||v::text||'/photos/'||gen_random_uuid()||'.webp';
  INSERT INTO public.property_images(property_id, uploaded_by, url) VALUES (v, own, 'https://images.reeve.in/'||k1);
  UPDATE public.properties SET status='unlisted' WHERE id=v;
  INSERT INTO _r VALUES('5  unlist retains image',
    EXISTS(SELECT 1 FROM public.property_images WHERE property_id=v), 'row kept');
  INSERT INTO _r VALUES('5  unlist does NOT enqueue', NOT pg_temp._enq(k1), k1);

  -- 6. hard delete → live image key survives as outbox + staged add enqueued
  v := pg_temp._mk_listed(); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  k1 := 'properties/'||v::text||'/photos/'||gen_random_uuid()||'.webp';  -- live image
  k2 := 'properties/'||v::text||'/photos/'||gen_random_uuid()||'.webp';  -- staged in edit request
  INSERT INTO public.property_images(property_id, uploaded_by, url) VALUES (v, own, 'https://images.reeve.in/'||k1);
  INSERT INTO public.property_edit_requests(property_id, owner_id, status, payload)
    VALUES (v, own, 'pending', jsonb_build_object('photo_changes',
      jsonb_build_object('add', jsonb_build_array(jsonb_build_object('url','https://images.reeve.in/'||k2)))));
  DELETE FROM public.properties WHERE id=v;
  INSERT INTO _r VALUES('6  hard-delete enqueues live key', pg_temp._enq(k1), k1);
  INSERT INTO _r VALUES('6  hard-delete enqueues staged key', pg_temp._enq(k2), k2);

  -- 7. malformed / non-Reeve URL never becomes a key
  v := pg_temp._mk_listed(); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  er := gen_random_uuid();
  SELECT count(*) INTO n_before FROM public.pending_r2_deletions;
  INSERT INTO public.property_edit_requests(id, property_id, owner_id, status, payload)
    VALUES (er, v, own, 'pending', jsonb_build_object('photo_changes',
      jsonb_build_object('add', jsonb_build_array(jsonb_build_object('url','https://evil.example/x.webp')))));
  UPDATE public.property_edit_requests SET status='rejected' WHERE id=er;
  INSERT INTO _r VALUES('7  foreign URL not enqueued',
    (SELECT count(*) FROM public.pending_r2_deletions) = n_before, 'no new rows');

  -- 8. cross-property: request on A carrying property B's key must NOT enqueue B's key
  v := pg_temp._mk_listed();               -- property A
  v2 := pg_temp._mk_listed();              -- property B
  SELECT owner_id INTO own FROM public.properties WHERE id=v;
  foreign_key := 'properties/'||v2::text||'/photos/'||gen_random_uuid()||'.webp';  -- B's key
  er := gen_random_uuid();
  INSERT INTO public.property_edit_requests(id, property_id, owner_id, status, payload)
    VALUES (er, v, own, 'pending', jsonb_build_object('photo_changes',
      jsonb_build_object('add', jsonb_build_array(jsonb_build_object('url','https://images.reeve.in/'||foreign_key)))));
  UPDATE public.property_edit_requests SET status='rejected' WHERE id=er;
  INSERT INTO _r VALUES('8  cross-property not enqueued', NOT pg_temp._enq(foreign_key), foreign_key);
END $$;

SELECT k, pass, detail FROM _r ORDER BY k;

ROLLBACK;
