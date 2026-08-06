-- Focused verification for public rent & sale price-change history.
-- Run inside a rolled-back transaction (safe on any environment):
--   psql "$DATABASE_URL" -f supabase/tests/price_change_history.sql
-- or paste into the SQL editor. Ends with ROLLBACK so nothing is persisted.
--
-- Drives the REAL trigger lifecycle under an admin JWT claim (no triggers disabled),
-- so handle_property_status_change / guards all run exactly as in production.
-- Replace :admin_id with any users.id whose role is admin/super_admin.
--
-- Checks 15 & 16 (backfill) are read-only asserts at the bottom.

BEGIN;

-- >>> set an admin subject so is_admin() = true for owner-transition bypass <<<
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT id::text FROM public.users
                            WHERE role::text IN ('admin','super_admin') LIMIT 1),
                    'role','authenticated')::text, true);

CREATE TEMP TABLE _r(k text, pass boolean, detail text) ON COMMIT DROP;
CREATE TEMP TABLE _tpl ON COMMIT DROP AS SELECT * FROM public.properties LIMIT 1;
UPDATE _tpl SET availability_confirmed_at=null, sale_listing_confirmed_at=null,
                current_listed_period_started_at=null, listed_at=null;

-- Spawn a fresh hidden(draft) property of the given type+price; baselines start null.
CREATE FUNCTION pg_temp._mk(p_type text, p_price numeric) RETURNS uuid AS $f$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  UPDATE _tpl SET id=v_id, listing_type=p_type::property_listing_type,
     status='draft'::property_status, is_active=false,
     availability_confirmed_at=null, sale_listing_confirmed_at=null,
     current_listed_period_started_at=null, listed_at=null,
     listed_rent = CASE WHEN p_type='rent' THEN p_price ELSE listed_rent END,
     sale_price  = CASE WHEN p_type='sale' THEN p_price ELSE null END,
     last_public_listed_rent=null, last_public_sale_price=null;
  INSERT INTO public.properties SELECT * FROM _tpl;
  RETURN v_id;
END $f$ LANGUAGE plpgsql;

CREATE FUNCTION pg_temp._nev(p uuid) RETURNS int AS $f$
  SELECT count(*)::int FROM public.property_activity_log
  WHERE property_id=p AND action='price_changed' AND is_public; $f$ LANGUAGE sql;

DO $$
DECLARE v uuid; v2 uuid; own uuid; er uuid; n0 int; n1 int; b numeric; ts timestamptz; ok boolean;
BEGIN
  -- 1. First publication: no event, baseline initialized.
  v := pg_temp._mk('rent', 48000);
  UPDATE public.properties SET status='listed' WHERE id=v;
  SELECT last_public_listed_rent INTO b FROM public.properties WHERE id=v;
  INSERT INTO _r VALUES('1  first-publication', pg_temp._nev(v)=0 AND b=48000, format('ev=%s base=%s',pg_temp._nev(v),b));

  -- 2. Direct live rent change / sale change -> one event each.
  n0:=pg_temp._nev(v); UPDATE public.properties SET listed_rent=45000 WHERE id=v;
  INSERT INTO _r VALUES('2  rent change', pg_temp._nev(v)-n0=1, format('d=%s',pg_temp._nev(v)-n0));
  v2:=pg_temp._mk('sale',12500000); UPDATE public.properties SET status='listed' WHERE id=v2;
  n0:=pg_temp._nev(v2); UPDATE public.properties SET sale_price=11800000 WHERE id=v2;
  INSERT INTO _r VALUES('2  sale change', pg_temp._nev(v2)-n0=1, format('d=%s',pg_temp._nev(v2)-n0));

  -- 5. No-op then Re1 change.
  n0:=pg_temp._nev(v); UPDATE public.properties SET listed_rent=45000 WHERE id=v;
  UPDATE public.properties SET building_notes=coalesce(building_notes,'')||'x' WHERE id=v; n1:=pg_temp._nev(v);
  UPDATE public.properties SET listed_rent=44999 WHERE id=v;
  INSERT INTO _r VALUES('5  no-op + Re1', (n1-n0)=0 AND (pg_temp._nev(v)-n1)=1, format('noop=%s re1=%s',n1-n0,pg_temp._nev(v)-n1));

  -- 7. listed_at unchanged across a price edit.
  SELECT listed_at INTO ts FROM public.properties WHERE id=v; UPDATE public.properties SET listed_rent=43000 WHERE id=v;
  INSERT INTO _r VALUES('7  listed_at stable', (SELECT listed_at FROM public.properties WHERE id=v) IS NOT DISTINCT FROM ts, 'ok');

  -- 9. Invalid (<=0) intermediate for rent: value->0->value creates no event.
  n0:=pg_temp._nev(v); UPDATE public.properties SET listed_rent=0 WHERE id=v; UPDATE public.properties SET listed_rent=42000 WHERE id=v;
  INSERT INTO _r VALUES('9  rent zero-intermediate', pg_temp._nev(v)-n0=0, format('d=%s',pg_temp._nev(v)-n0));

  -- 4. Hidden edit + null-intermediate (sale nullable) then relist -> one event from last public.
  v2:=pg_temp._mk('sale',4800000); UPDATE public.properties SET status='listed' WHERE id=v2;
  UPDATE public.properties SET status='unlisted' WHERE id=v2;
  UPDATE public.properties SET sale_price=null WHERE id=v2; UPDATE public.properties SET sale_price=4500000 WHERE id=v2;
  n0:=pg_temp._nev(v2); UPDATE public.properties SET status='listed' WHERE id=v2;
  ok:=(pg_temp._nev(v2)-n0=1) AND EXISTS(SELECT 1 FROM public.property_activity_log
     WHERE property_id=v2 AND action='price_changed'
       AND (payload->>'from_price')::numeric=4800000 AND (payload->>'to_price')::numeric=4500000);
  INSERT INTO _r VALUES('4  hidden relist (null intermediate)', ok, 'expect 4800000 -> 4500000');

  -- 13. Direct change while edit_pending_review (public) -> one event.
  UPDATE public.properties SET status='edit_pending_review' WHERE id=v; n0:=pg_temp._nev(v);
  UPDATE public.properties SET listed_rent=41000 WHERE id=v;
  INSERT INTO _r VALUES('13 change under review', pg_temp._nev(v)-n0=1, format('d=%s',pg_temp._nev(v)-n0));

  -- 14. listed -> edit_pending_review with no price change -> no event.
  v2:=pg_temp._mk('rent',30000); UPDATE public.properties SET status='listed' WHERE id=v2; n0:=pg_temp._nev(v2);
  UPDATE public.properties SET status='edit_pending_review' WHERE id=v2;
  INSERT INTO _r VALUES('14 submit-for-review', pg_temp._nev(v2)-n0=0, format('d=%s',pg_temp._nev(v2)-n0));

  -- 6. Listing-type change -> no rent-vs-sale event, new-type baseline initialized.
  v2:=pg_temp._mk('rent',30000); UPDATE public.properties SET status='listed' WHERE id=v2; n0:=pg_temp._nev(v2);
  UPDATE public.properties SET listing_type='sale', sale_price=9000000, availability_confirmed_at=null WHERE id=v2;
  SELECT last_public_sale_price INTO b FROM public.properties WHERE id=v2;
  INSERT INTO _r VALUES('6  type-change', pg_temp._nev(v2)-n0=0 AND b=9000000, format('d=%s saleBase=%s',pg_temp._nev(v2)-n0,b));

  -- 12. sale -> unlist -> switch rent (hidden) -> hidden edits -> relist -> no stale event.
  v2:=pg_temp._mk('sale',8000000); UPDATE public.properties SET status='listed' WHERE id=v2;
  UPDATE public.properties SET status='unlisted' WHERE id=v2;
  UPDATE public.properties SET listing_type='rent', listed_rent=25000, sale_listing_confirmed_at=null WHERE id=v2;
  UPDATE public.properties SET listed_rent=26000 WHERE id=v2; n0:=pg_temp._nev(v2);
  UPDATE public.properties SET status='listed' WHERE id=v2;
  SELECT last_public_listed_rent INTO b FROM public.properties WHERE id=v2;
  INSERT INTO _r VALUES('12 cross-type hidden relist', pg_temp._nev(v2)-n0=0 AND b=26000, format('d=%s rentBase=%s',pg_temp._nev(v2)-n0,b));

  -- 11. INSERT with fabricated baseline: draft -> null ; public -> init from price, no event.
  v:=gen_random_uuid();
  UPDATE _tpl SET id=v, listing_type='rent', status='draft', is_active=false, listed_rent=50000,
     last_public_listed_rent=999, last_public_sale_price=888;
  INSERT INTO public.properties SELECT * FROM _tpl;
  SELECT (last_public_listed_rent IS NULL AND last_public_sale_price IS NULL) INTO ok FROM public.properties WHERE id=v;
  v2:=gen_random_uuid();
  UPDATE _tpl SET id=v2, status='listed', is_active=true, listed_rent=50000,
     last_public_listed_rent=999, last_public_sale_price=888,
     listed_at=now(), current_listed_period_started_at=now(), availability_confirmed_at=now();
  INSERT INTO public.properties SELECT * FROM _tpl;
  SELECT last_public_listed_rent INTO b FROM public.properties WHERE id=v2;
  INSERT INTO _r VALUES('11 insert fabricated ignored', ok AND b=50000 AND pg_temp._nev(v2)=0,
     format('draftNull=%s pubBase=%s ev=%s',ok,b,pg_temp._nev(v2)));

  -- 3. Approval WITH price change -> one public price_changed, edit_approved private.
  v:=pg_temp._mk('rent',48000); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  UPDATE public.properties SET status='listed' WHERE id=v;
  UPDATE public.properties SET status='edit_pending_review' WHERE id=v;
  er:=gen_random_uuid();
  INSERT INTO public.property_edit_requests(id, property_id, owner_id, status, payload)
    VALUES (er, v, own, 'pending', jsonb_build_object('field_changes', jsonb_build_object('listed_rent','45000')));
  PERFORM public.approve_edit_request(er);
  INSERT INTO _r VALUES('3  approval w/ price', pg_temp._nev(v)=1
     AND (SELECT bool_and(NOT is_public) FROM public.property_activity_log WHERE property_id=v AND action='edit_approved'),
     format('price_changed=%s',pg_temp._nev(v)));

  -- 3. Approval WITHOUT price change -> no price event, edit_approved public.
  v:=pg_temp._mk('rent',30000); SELECT owner_id INTO own FROM public.properties WHERE id=v;
  UPDATE public.properties SET status='listed' WHERE id=v;
  UPDATE public.properties SET status='edit_pending_review' WHERE id=v;
  er:=gen_random_uuid();
  INSERT INTO public.property_edit_requests(id, property_id, owner_id, status, payload)
    VALUES (er, v, own, 'pending', jsonb_build_object('field_changes', jsonb_build_object('building_notes','desc')));
  PERFORM public.approve_edit_request(er);
  INSERT INTO _r VALUES('3  approval no price', pg_temp._nev(v)=0
     AND (SELECT bool_or(is_public) FROM public.property_activity_log WHERE property_id=v AND action='edit_approved'),
     'edit_approved public');

  -- 8. Admin direct baseline write -> reset by trigger, stored value unchanged.
  v:=pg_temp._mk('rent',30000); UPDATE public.properties SET status='listed' WHERE id=v;
  UPDATE public.properties SET last_public_listed_rent=1 WHERE id=v;
  SELECT last_public_listed_rent INTO b FROM public.properties WHERE id=v;
  INSERT INTO _r VALUES('8  admin tamper reset', b=30000, format('baseline=%s',b));
END $$;

-- 8. Non-admin direct baseline write -> rejected by the guard.
SELECT set_config('request.jwt.claims', '{}', true);  -- is_admin() = false
DO $$
DECLARE v uuid; b numeric; got_err boolean := false;
BEGIN
  SELECT id, last_public_listed_rent INTO v, b FROM public.properties
   WHERE status='listed' AND is_active AND listing_type='rent' AND last_public_listed_rent IS NOT NULL LIMIT 1;
  BEGIN
    UPDATE public.properties SET last_public_listed_rent = last_public_listed_rent + 1 WHERE id=v;
  EXCEPTION WHEN OTHERS THEN got_err := true;
  END;
  INSERT INTO _r VALUES('8  non-admin tamper rejected',
     got_err AND (SELECT last_public_listed_rent FROM public.properties WHERE id=v)=b, format('raised=%s',got_err));
END $$;

SELECT k, pass, detail FROM _r ORDER BY k;

-- 15 & 16 (read-only, no test data): every currently-public valid-price row already has a
-- baseline from backfill (predicate includes edit_pending_review), and backfill did not bump
-- updated_at (the trigger was disabled during the two seeding UPDATEs).
SELECT
  (SELECT count(*) FROM public.properties
     WHERE status IN ('listed','edit_pending_review') AND is_active
       AND ((listing_type='rent' AND listed_rent>0 AND last_public_listed_rent IS NULL)
         OR (listing_type='sale' AND sale_price>0 AND last_public_sale_price IS NULL)))
     AS chk15_public_valid_without_baseline_should_be_0;

ROLLBACK;
