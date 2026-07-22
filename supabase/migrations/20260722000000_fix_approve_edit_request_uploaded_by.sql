-- F1F-6: approve_edit_request was INSERTing new photos into property_images
-- without providing `uploaded_by`, which is NOT NULL with no default. Any
-- edit approval that included a photo change failed with:
--   null value in column "uploaded_by" of relation "property_images"
--   violates not-null constraint
-- Fix: include uploaded_by = v_admin_id in the INSERT column list. Everything
-- else in the RPC is unchanged from 20260721120100_add_edit_request_rpc_new_columns.sql.
--
-- SUPABASE MCP: apply via `mcp__supabase-*__apply_migration` — do not run through
-- CLI push (this file is a record of the applied change).

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
       status                       = 'listed'
   WHERE id = v_property_id;

  -- F1F-6: `uploaded_by` added to the INSERT column list. Uses v_admin_id
  -- (auth.uid() of the reviewing admin) since the schema requires NOT NULL and
  -- has no default. Any prior approval that landed a photo change would have
  -- failed with a constraint violation; this patches the path going forward.
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
