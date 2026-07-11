-- Phase 1 Commons: 4 RPCs for the property_edit_requests lifecycle.
--
--   submit_property_edit_request  — owner submits Path B edits (supersedes any prior pending)
--   approve_edit_request          — admin approves; copies field_changes + photo_changes onto row
--   reject_edit_request           — admin rejects; property returns to listed (D-094)
--   cancel_pending_edit_request   — owner cancels their own pending edit
--
-- All are SECURITY DEFINER. All perform their own auth check (auth.uid + is_admin).
-- All are transactional by virtue of being single functions — Postgres wraps each in an implicit transaction.
--
-- Enum note: properties.parking_2w / parking_4w use `parking_availability` (verified from types.ts:2028),
-- NOT `parking_type`. The RPC uses the correct enum.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. submit_property_edit_request — owner-callable
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_property_edit_request(
  p_property_id   uuid,
  p_field_changes jsonb,
  p_photo_changes jsonb
) RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id            uuid;
  v_current_status      property_status;
  v_new_edit_request_id uuid;
  v_existing_pending_id uuid;
  v_caller              uuid := (SELECT auth.uid());
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT owner_id, status
    INTO v_owner_id, v_current_status
    FROM public.properties
   WHERE id = p_property_id
   FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF v_owner_id <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_current_status NOT IN ('listed', 'edit_pending_review') THEN
    RAISE EXCEPTION 'Cannot submit edit request for property in status %', v_current_status;
  END IF;

  -- Supersede existing pending edit request (D-003, D-020).
  SELECT id INTO v_existing_pending_id
    FROM public.property_edit_requests
   WHERE property_id = p_property_id AND status = 'pending'
   FOR UPDATE;

  IF v_existing_pending_id IS NOT NULL THEN
    UPDATE public.property_edit_requests
       SET status = 'superseded'
     WHERE id = v_existing_pending_id;
  END IF;

  INSERT INTO public.property_edit_requests (
    property_id, owner_id, status, payload
  ) VALUES (
    p_property_id,
    v_owner_id,
    'pending',
    jsonb_build_object(
      'field_changes', COALESCE(p_field_changes, '{}'::jsonb),
      'photo_changes', COALESCE(p_photo_changes, '{}'::jsonb)
    )
  ) RETURNING id INTO v_new_edit_request_id;

  -- Transition listed → edit_pending_review; leaves edit_pending_review unchanged.
  IF v_current_status = 'listed' THEN
    UPDATE public.properties
       SET status = 'edit_pending_review'
     WHERE id = p_property_id;
  END IF;

  RETURN v_new_edit_request_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_property_edit_request(uuid, jsonb, jsonb) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. approve_edit_request — admin-callable
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_edit_request(
  p_edit_request_id uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_property_id     uuid;
  v_status          text;
  v_payload         jsonb;
  v_field_changes   jsonb;
  v_photo_changes   jsonb;
  v_admin_id        uuid := (SELECT auth.uid());
  v_changed_keys    jsonb;
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

  -- Apply field changes. COALESCE preserves current value if key absent from payload.
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
       status                       = 'listed'
   WHERE id = v_property_id;

  -- photo_changes.add: insert new property_images rows.
  -- Rows referenced by URL — Edge Function already placed the file in R2.
  IF v_photo_changes ? 'add' AND jsonb_typeof(v_photo_changes->'add') = 'array' THEN
    INSERT INTO public.property_images (property_id, url, section, caption, is_primary, is_floor_plan, sort_order)
    SELECT
      v_property_id,
      (elem->>'url')::text,
      NULLIF(elem->>'section', ''),
      NULLIF(elem->>'caption', ''),
      COALESCE((elem->>'is_primary')::boolean, false),
      COALESCE((elem->>'is_floor_plan')::boolean, false),
      COALESCE((elem->>'sort_order')::integer, 0)
    FROM jsonb_array_elements(v_photo_changes->'add') AS elem;
  END IF;

  -- photo_changes.delete: remove property_images rows by id.
  IF v_photo_changes ? 'delete' AND jsonb_typeof(v_photo_changes->'delete') = 'array' THEN
    DELETE FROM public.property_images
     WHERE property_id = v_property_id
       AND id::text IN (
         SELECT jsonb_array_elements_text(v_photo_changes->'delete')
       );
  END IF;

  -- photo_changes.update: patch existing rows.
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

  -- Mark edit request approved.
  UPDATE public.property_edit_requests
     SET status = 'approved',
         reviewed_by = v_admin_id,
         reviewed_at = now()
   WHERE id = p_edit_request_id;

  -- Activity log entry (public curated event per D-093).
  v_changed_keys := (
    SELECT jsonb_agg(k)
      FROM jsonb_object_keys(v_field_changes) AS k
  );

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
    true
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.approve_edit_request(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. reject_edit_request — admin-callable
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_edit_request(
  p_edit_request_id uuid,
  p_reason          text,
  p_reason_text     text DEFAULT NULL
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_property_id uuid;
  v_status      text;
  v_admin_id    uuid := (SELECT auth.uid());
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT property_id, status
    INTO v_property_id, v_status
    FROM public.property_edit_requests
   WHERE id = p_edit_request_id
   FOR UPDATE;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'Edit request not found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Edit request is no longer pending';
  END IF;

  -- Property returns to listed (D-094).
  UPDATE public.properties
     SET status = 'listed'
   WHERE id = v_property_id
     AND status = 'edit_pending_review';

  UPDATE public.property_edit_requests
     SET status                = 'rejected',
         rejection_reason      = p_reason,
         rejection_reason_text = p_reason_text,
         reviewed_by           = v_admin_id,
         reviewed_at           = now()
   WHERE id = p_edit_request_id;

  INSERT INTO public.property_activity_log
    (property_id, actor_id, actor_role, action, payload, is_public)
  VALUES (
    v_property_id,
    v_admin_id,
    'admin',
    'edit_rejected',
    jsonb_build_object(
      'summary',         'Your edit was rejected',
      'edit_request_id', p_edit_request_id::text,
      'admin_id',        v_admin_id::text,
      'reason',          p_reason,
      'reason_text',     COALESCE(p_reason_text, '')
    ),
    false
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reject_edit_request(uuid, text, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. cancel_pending_edit_request — owner-callable
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_pending_edit_request(
  p_property_id uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id        uuid;
  v_edit_request_id uuid;
  v_caller          uuid := (SELECT auth.uid());
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT owner_id INTO v_owner_id
    FROM public.properties
   WHERE id = p_property_id
   FOR UPDATE;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF v_owner_id <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO v_edit_request_id
    FROM public.property_edit_requests
   WHERE property_id = p_property_id AND status = 'pending'
   FOR UPDATE;

  IF v_edit_request_id IS NULL THEN
    RAISE EXCEPTION 'No pending edit found';
  END IF;

  UPDATE public.property_edit_requests
     SET status = 'withdrawn'
   WHERE id = v_edit_request_id;

  UPDATE public.properties
     SET status = 'listed'
   WHERE id = p_property_id
     AND status = 'edit_pending_review';

  INSERT INTO public.property_activity_log
    (property_id, actor_id, actor_role, action, payload, is_public)
  VALUES (
    p_property_id,
    v_caller,
    'owner',
    'edit_resolved',
    jsonb_build_object(
      'summary',         'You cancelled your pending edit',
      'edit_request_id', v_edit_request_id::text
    ),
    false
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_pending_edit_request(uuid) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification queries (run after migration):
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. All 4 RPCs exist:
--    SELECT proname FROM pg_proc WHERE proname IN (
--      'submit_property_edit_request','approve_edit_request',
--      'reject_edit_request','cancel_pending_edit_request'
--    );
--    Expected: 4 rows.
--
-- 2. Grants to authenticated:
--    SELECT grantee, routine_name FROM information_schema.role_routine_grants
--    WHERE routine_schema='public'
--      AND routine_name IN ('submit_property_edit_request','approve_edit_request','reject_edit_request','cancel_pending_edit_request')
--      AND grantee='authenticated';
--    Expected: 4 rows.
--
-- 3. Smoke test (as an owner, from psql or via supabase.rpc):
--    Given a listed property owned by the caller:
--    SELECT public.submit_property_edit_request(
--      '<property_uuid>'::uuid,
--      '{"listed_rent":33000}'::jsonb,
--      '{}'::jsonb
--    );
--    Expected: returns uuid of new edit request row; property.status → 'edit_pending_review'.
