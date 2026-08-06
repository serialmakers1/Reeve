-- Public rent & sale price-change history.
--
-- Adds a public `price_changed` event to property_activity_log (e.g. ₹48k → ₹45k)
-- for listed_rent (rent) and sale_price (sale), working for every write path:
-- edit-approval RPC, direct owner/admin edits, and trusted backend updates.
--
-- ATOMIC CUTOVER (single transaction — deliberately NOT one-purpose-per-file):
--   1. add baseline columns
--   2. backfill currently-public prices (updated_at trigger disabled so it is not bumped)
--   3. extend prevent_owner_updating_admin_fields to protect the baseline columns
--   4. create the canonical price-change trigger function (sole writer of price_changed)
--   5. replace approve_edit_request (dedup: edit_approved private iff a price change fires)
--   6. CREATE TRIGGER last — trigger + approval dedup go live in the same txn, so no
--      approval can ever see the trigger live while the RPC still emits a public generic event.
--
-- Public predicate = live properties_select RLS: status IN ('listed','edit_pending_review')
-- AND is_active = true. Baseline is written ONLY when the row is public, so hidden edits
-- never replace the last publicly-visible price. Uses IS DISTINCT FROM; validity = (x > 0).
-- property_activity_log.action has no CHECK constraint, so 'price_changed' needs no schema change.
-- (Runs in a single migration transaction — the runner wraps the whole file in one txn.)

-- 1. Baseline columns: last publicly-visible price per listing type. Trigger-owned.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS last_public_listed_rent numeric;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS last_public_sale_price  numeric;

-- 2. Backfill currently-public rows only (their current price IS their last public price).
--    Hidden rows (unlisted/archived/draft) stay NULL — never seed a possibly-stale price.
--    Disable updated_at trigger so seeding an internal column does not make old listings
--    look freshly updated. Price-change trigger does not exist yet, so nothing else fires.
ALTER TABLE public.properties DISABLE TRIGGER handle_properties_updated_at;

UPDATE public.properties
   SET last_public_listed_rent = listed_rent
 WHERE listing_type = 'rent'
   AND listed_rent > 0
   AND status IN ('listed', 'edit_pending_review')
   AND is_active = true;

UPDATE public.properties
   SET last_public_sale_price = sale_price
 WHERE listing_type = 'sale'
   AND sale_price > 0
   AND status IN ('listed', 'edit_pending_review')
   AND is_active = true;

ALTER TABLE public.properties ENABLE TRIGGER handle_properties_updated_at;

-- 3. Protect baseline columns from direct client writes (defense-in-depth; the trigger
--    also authoritatively resets them). Reproduces the existing guard verbatim + 2 lines.
CREATE OR REPLACE FUNCTION public.prevent_owner_updating_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m            text := COALESCE(current_setting('reeve.system_action', true), '');
  fresh_relist boolean := (NEW.status = 'listed' AND OLD.status <> 'listed');
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.current_listed_period_started_at IS DISTINCT FROM OLD.current_listed_period_started_at
     AND NOT (m = 'status_change' AND fresh_relist) THEN
    RAISE EXCEPTION 'permission denied: current_listed_period_started_at is server-managed';
  END IF;

  IF NEW.availability_confirmed_at IS DISTINCT FROM OLD.availability_confirmed_at
     AND NOT (m = 'confirm_rent'
              OR (m = 'status_change' AND fresh_relist AND NEW.listing_type = 'rent')) THEN
    RAISE EXCEPTION 'permission denied: availability_confirmed_at is server-managed';
  END IF;

  IF NEW.sale_listing_confirmed_at IS DISTINCT FROM OLD.sale_listing_confirmed_at
     AND NOT (m = 'confirm_sale'
              OR (m = 'status_change' AND fresh_relist AND NEW.listing_type = 'sale')) THEN
    RAISE EXCEPTION 'permission denied: sale_listing_confirmed_at is server-managed';
  END IF;

  IF (NEW.flat_number                   IS DISTINCT FROM OLD.flat_number)                   OR
     (NEW.board_status                  IS DISTINCT FROM OLD.board_status)                  OR
     (NEW.flat_number_revealed          IS DISTINCT FROM OLD.flat_number_revealed)          OR
     (NEW.auto_accept_enabled           IS DISTINCT FROM OLD.auto_accept_enabled)           OR
     (NEW.owner_diet_preference         IS DISTINCT FROM OLD.owner_diet_preference)         OR
     (NEW.owner_pet_preference          IS DISTINCT FROM OLD.owner_pet_preference)          OR
     (NEW.owner_tenant_type_preference  IS DISTINCT FROM OLD.owner_tenant_type_preference)  OR
     (NEW.last_public_listed_rent       IS DISTINCT FROM OLD.last_public_listed_rent)       OR
     (NEW.last_public_sale_price        IS DISTINCT FROM OLD.last_public_sale_price)        THEN
    RAISE EXCEPTION 'permission denied: only admins may update admin-only property fields';
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Canonical price-change trigger function — the SOLE writer of public price_changed.
--    BEFORE INSERT OR UPDATE; sorts last (zzz_) so it reads final is_active/status and its
--    baseline writes are never re-checked by the earlier guard.
CREATE OR REPLACE FUNCTION public.log_property_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p_public     boolean;
  p_old_public boolean;
  v_new        numeric;
  v_old_live   numeric;
  v_base       numeric;
  v_actor_id   uuid := (SELECT auth.uid());
  v_actor_role text;
BEGIN
  -- 1. Authoritative reset: ignore any caller-supplied baseline values.
  IF TG_OP = 'INSERT' THEN
    NEW.last_public_listed_rent := NULL;
    NEW.last_public_sale_price  := NULL;
  ELSE
    NEW.last_public_listed_rent := OLD.last_public_listed_rent;
    NEW.last_public_sale_price  := OLD.last_public_sale_price;
  END IF;

  -- 1b. Unsupported listing_type: no event, baselines preserved/nulled, never fail.
  IF NEW.listing_type IS NULL OR NEW.listing_type NOT IN ('rent', 'sale') THEN
    RETURN NEW;
  END IF;

  p_public := (NEW.status IN ('listed', 'edit_pending_review') AND NEW.is_active);
  v_new := CASE WHEN NEW.listing_type = 'rent' THEN NEW.listed_rent ELSE NEW.sale_price END;

  -- 2. INSERT path: no OLD, no compare.
  IF TG_OP = 'INSERT' THEN
    IF p_public AND v_new IS NOT NULL AND v_new > 0 THEN
      IF NEW.listing_type = 'rent' THEN NEW.last_public_listed_rent := v_new;
      ELSE NEW.last_public_sale_price := v_new; END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE path.
  p_old_public := (OLD.status IN ('listed', 'edit_pending_review') AND OLD.is_active);
  IF NEW.listing_type = 'rent' THEN
    v_old_live := OLD.listed_rent; v_base := OLD.last_public_listed_rent;
  ELSE
    v_old_live := OLD.sale_price;  v_base := OLD.last_public_sale_price;
  END IF;

  -- 3. Listing-type change: never compare across types.
  IF OLD.listing_type IS DISTINCT FROM NEW.listing_type THEN
    IF p_public AND v_new IS NOT NULL AND v_new > 0 THEN
      IF NEW.listing_type = 'rent' THEN NEW.last_public_listed_rent := v_new;
      ELSE NEW.last_public_sale_price := v_new; END IF;
    ELSE
      IF NEW.listing_type = 'rent' THEN NEW.last_public_listed_rent := NULL;
      ELSE NEW.last_public_sale_price := NULL; END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- 4. Not public: retain baselines, no event.
  IF NOT p_public THEN RETURN NEW; END IF;

  -- 5. value -> null/<=0: no event, retain baseline.
  IF v_new IS NULL OR v_new <= 0 THEN RETURN NEW; END IF;

  v_actor_role := CASE WHEN v_actor_id IS NULL THEN 'system'
                       WHEN public.is_admin() THEN 'admin'
                       ELSE 'owner' END;

  -- 6. Continuous public -> public: require an actual OLD->NEW live-price change.
  IF p_old_public THEN
    IF v_old_live IS NOT NULL AND v_old_live > 0 AND v_old_live IS DISTINCT FROM v_new THEN
      INSERT INTO public.property_activity_log
        (property_id, actor_id, actor_role, action, payload, is_public)
      VALUES
        (NEW.id, v_actor_id, v_actor_role, 'price_changed',
         jsonb_build_object('action', 'price_changed', 'listing_type', NEW.listing_type,
                            'from_price', v_old_live, 'to_price', v_new),
         true);
    END IF;
    IF NEW.listing_type = 'rent' THEN NEW.last_public_listed_rent := v_new;
    ELSE NEW.last_public_sale_price := v_new; END IF;
    RETURN NEW;
  END IF;

  -- 7. Hidden -> public (relist / first publication): compare retained baseline.
  IF v_base IS NOT NULL AND v_base > 0 AND v_base IS DISTINCT FROM v_new THEN
    INSERT INTO public.property_activity_log
      (property_id, actor_id, actor_role, action, payload, is_public)
    VALUES
      (NEW.id, v_actor_id, v_actor_role, 'price_changed',
       jsonb_build_object('action', 'price_changed', 'listing_type', NEW.listing_type,
                          'from_price', v_base, 'to_price', v_new),
       true);
  END IF;
  IF NEW.listing_type = 'rent' THEN NEW.last_public_listed_rent := v_new;
  ELSE NEW.last_public_sale_price := v_new; END IF;
  RETURN NEW;
END;
$function$;

-- 5. approve_edit_request: make edit_approved private iff the trigger will emit a
--    price_changed. Approval is edit_pending_review -> listed = public -> public, so it
--    mirrors the trigger's continuous-public branch (live price vs effective new price).
--    Locks the property row FOR UPDATE so the RPC's decision and the trigger's emission
--    read the same state. No OLD (this is an RPC).
CREATE OR REPLACE FUNCTION public.approve_edit_request(p_edit_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_property_id          uuid;
  v_status               text;
  v_payload              jsonb;
  v_field_changes        jsonb;
  v_photo_changes        jsonb;
  v_admin_id             uuid := (SELECT auth.uid());
  v_changed_keys         jsonb;
  v_current_listing_type text;
  v_current_listed_rent  numeric;
  v_current_sale_price   numeric;
  v_new_type             text;
  v_new_price            numeric;
  v_current_live         numeric;
  v_price_changed        boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT property_id, status, payload
    INTO v_property_id, v_status, v_payload
    FROM public.property_edit_requests
   WHERE id = p_edit_request_id
   FOR UPDATE;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Edit request not found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Edit request is no longer pending (current: %)', v_status;
  END IF;

  v_field_changes := COALESCE(v_payload -> 'field_changes', '{}'::jsonb);
  v_photo_changes := COALESCE(v_payload -> 'photo_changes', '{}'::jsonb);

  -- Lock + read the property (same lock order: edit-request -> property) so the price-change
  -- decision below and the trigger fired by the UPDATE observe identical state.
  SELECT listing_type, listed_rent, sale_price
    INTO v_current_listing_type, v_current_listed_rent, v_current_sale_price
    FROM public.properties
   WHERE id = v_property_id
   FOR UPDATE;

  -- listing_type is NOT written by this UPDATE, so use the current value (never field_changes).
  v_new_type := v_current_listing_type;
  IF v_new_type = 'rent' THEN
    v_current_live := v_current_listed_rent;
    v_new_price    := COALESCE((v_field_changes->>'listed_rent')::numeric, v_current_listed_rent);
  ELSIF v_new_type = 'sale' THEN
    v_current_live := v_current_sale_price;
    v_new_price    := COALESCE(NULLIF(v_field_changes->>'sale_price', '')::numeric, v_current_sale_price);
  END IF;

  -- Mirror the trigger's continuous-public eligibility exactly.
  v_price_changed := (v_new_type IN ('rent', 'sale'))
    AND v_current_live IS NOT NULL AND v_current_live > 0
    AND v_new_price    IS NOT NULL AND v_new_price > 0
    AND (v_current_live IS DISTINCT FROM v_new_price);

  UPDATE public.properties
     SET
       listed_rent                  = COALESCE((v_field_changes->>'listed_rent')::numeric, listed_rent),
       security_deposit_amount      = COALESCE((v_field_changes->>'security_deposit_amount')::numeric, security_deposit_amount),
       security_deposit_months      = COALESCE((v_field_changes->>'security_deposit_months')::integer, security_deposit_months),
       furnishing                   = COALESCE((v_field_changes->>'furnishing')::furnishing_type, furnishing),
       furnishing_detail            = COALESCE(v_field_changes -> 'furnishing_detail', furnishing_detail),
       amenities                    = COALESCE(v_field_changes -> 'amenities', amenities),
       description                  = COALESCE(v_field_changes->>'description', description),
       title                        = COALESCE(v_field_changes->>'title', title),
       pet_policy                   = COALESCE(v_field_changes->>'pet_policy', pet_policy),
       building_rules               = COALESCE(v_field_changes->>'building_rules', building_rules),
       building_notes               = COALESCE(v_field_changes->>'building_notes', building_notes),
       available_from               = COALESCE((v_field_changes->>'available_from')::date, available_from),
       parking_2w                   = COALESCE((v_field_changes->>'parking_2w')::parking_availability, parking_2w),
       parking_4w                   = COALESCE((v_field_changes->>'parking_4w')::parking_availability, parking_4w),
       utility_water_included       = COALESCE((v_field_changes->>'utility_water_included')::boolean, utility_water_included),
       utility_gas_included         = COALESCE((v_field_changes->>'utility_gas_included')::boolean, utility_gas_included),
       utility_electricity_included = COALESCE((v_field_changes->>'utility_electricity_included')::boolean, utility_electricity_included),
       gas_type                     = COALESCE(v_field_changes->>'gas_type', gas_type),
       maintenance_included_in_rent = COALESCE((v_field_changes->>'maintenance_included_in_rent')::boolean, maintenance_included_in_rent),
       society_maintenance_approx   = COALESCE((v_field_changes->>'society_maintenance_approx')::numeric, society_maintenance_approx),
       floor_number                 = COALESCE((v_field_changes->>'floor_number')::integer, floor_number),
       total_floors                 = COALESCE((v_field_changes->>'total_floors')::integer, total_floors),
       square_footage               = COALESCE((v_field_changes->>'square_footage')::numeric, square_footage),
       bathrooms                    = COALESCE((v_field_changes->>'bathrooms')::integer, bathrooms),
       balconies                    = COALESCE((v_field_changes->>'balconies')::integer, balconies),
       facing                       = COALESCE(v_field_changes->>'facing', facing),
       building_age_years           = COALESCE((v_field_changes->>'building_age_years')::integer, building_age_years),
       youtube_walkthrough_url      = COALESCE(v_field_changes->>'youtube_walkthrough_url', youtube_walkthrough_url),
       google_maps_url              = COALESCE(v_field_changes->>'google_maps_url', google_maps_url),
       lock_in_months               = COALESCE((v_field_changes->>'lock_in_months')::integer, lock_in_months),
       notice_period_days           = COALESCE((v_field_changes->>'notice_period_days')::integer, notice_period_days),
       super_built_up_area          = COALESCE((v_field_changes->>'super_built_up_area')::numeric, super_built_up_area),
       water_source                 = COALESCE(
         CASE WHEN v_field_changes ? 'water_source'
              THEN ARRAY(SELECT jsonb_array_elements_text(v_field_changes -> 'water_source'))
         END,
         water_source
       ),
       main_door_lock_type          = COALESCE(v_field_changes->>'main_door_lock_type', main_door_lock_type),
       streetview_show_in_listing   = COALESCE((v_field_changes->>'streetview_show_in_listing')::boolean, streetview_show_in_listing),
       sale_price                   = COALESCE(NULLIF(v_field_changes->>'sale_price', '')::numeric, sale_price),
       price_negotiable             = COALESCE(NULLIF(v_field_changes->>'price_negotiable', '')::boolean, price_negotiable),
       expected_price_per_sqft      = COALESCE(NULLIF(v_field_changes->>'expected_price_per_sqft', '')::numeric, expected_price_per_sqft),
       possession_status            = COALESCE(v_field_changes->>'possession_status', possession_status),
       possession_date              = COALESCE(NULLIF(v_field_changes->>'possession_date', '')::date, possession_date),
       sale_brokerage_pct           = COALESCE(NULLIF(v_field_changes->>'sale_brokerage_pct', '')::numeric, sale_brokerage_pct),
       rera_registration_number     = COALESCE(v_field_changes->>'rera_registration_number', rera_registration_number),
       khata_type                   = COALESCE(v_field_changes->>'khata_type', khata_type),
       property_tax_paid_upto       = COALESCE(NULLIF(v_field_changes->>'property_tax_paid_upto', '')::date, property_tax_paid_upto),
       annual_rent_increase_pct     = COALESCE(NULLIF(v_field_changes->>'annual_rent_increase_pct', '')::numeric, annual_rent_increase_pct),
       move_in_charges_amount       = COALESCE(NULLIF(v_field_changes->>'move_in_charges_amount', '')::numeric, move_in_charges_amount),
       rent_brokerage_fixed_amount  = COALESCE(NULLIF(v_field_changes->>'rent_brokerage_fixed_amount', '')::numeric, rent_brokerage_fixed_amount),
       status                       = 'listed'
   WHERE id = v_property_id;

  IF v_photo_changes ? 'add' AND jsonb_typeof(v_photo_changes->'add') = 'array' THEN
    INSERT INTO public.property_images (property_id, uploaded_by, url, section, caption, is_primary, is_floor_plan, sort_order)
    SELECT
      v_property_id,
      v_admin_id,
      (elem->>'url')::text,
      NULLIF(elem->>'section', ''),
      NULLIF(elem->>'caption', ''),
      COALESCE((elem->>'is_primary')::boolean, false),
      COALESCE((elem->>'is_floor_plan')::boolean, false),
      COALESCE((elem->>'sort_order')::integer, 0)
    FROM jsonb_array_elements(v_photo_changes->'add') AS elem;
  END IF;

  IF v_photo_changes ? 'delete' AND jsonb_typeof(v_photo_changes->'delete') = 'array' THEN
    DELETE FROM public.property_images
     WHERE property_id = v_property_id
       AND id::text IN (
         SELECT jsonb_array_elements_text(v_photo_changes->'delete')
       );
  END IF;

  IF v_photo_changes ? 'update' AND jsonb_typeof(v_photo_changes->'update') = 'array' THEN
    UPDATE public.property_images pi
       SET
         is_primary    = COALESCE((elem->>'is_primary')::boolean, pi.is_primary),
         is_floor_plan = COALESCE((elem->>'is_floor_plan')::boolean, pi.is_floor_plan),
         section       = COALESCE(elem->>'section', pi.section),
         caption       = COALESCE(elem->>'caption', pi.caption),
         sort_order    = COALESCE((elem->>'sort_order')::integer, pi.sort_order)
      FROM jsonb_array_elements(v_photo_changes->'update') AS elem
     WHERE pi.id = (elem->>'id')::uuid
       AND pi.property_id = v_property_id;
  END IF;

  UPDATE public.property_edit_requests
     SET status = 'approved',
         reviewed_by = v_admin_id,
         reviewed_at = now()
   WHERE id = p_edit_request_id;

  v_changed_keys := (
    SELECT jsonb_agg(k)
      FROM jsonb_object_keys(v_field_changes) AS k
  );

  -- edit_approved stays PUBLIC unless a price change fired (then the trigger's public
  -- price_changed is the single public entry and this generic one goes private).
  INSERT INTO public.property_activity_log
    (property_id, actor_id, actor_role, action, payload, is_public)
  VALUES (
    v_property_id,
    v_admin_id,
    'admin',
    'edit_approved',
    jsonb_build_object(
      'summary',            'Your edit was approved',
      'edit_request_id',    p_edit_request_id::text,
      'admin_id',           v_admin_id::text,
      'changed_field_keys', COALESCE(v_changed_keys, '[]'::jsonb)
    ),
    NOT v_price_changed
  );
END;
$function$;

-- 6. Activate the trigger LAST (name sorts after all existing BEFORE triggers).
DROP TRIGGER IF EXISTS zzz_price_change_log_trigger ON public.properties;
CREATE TRIGGER zzz_price_change_log_trigger
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.log_property_price_change();
