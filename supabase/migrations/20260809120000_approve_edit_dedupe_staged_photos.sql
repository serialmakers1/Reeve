-- Prompt 4 corrective migration — dedupe staged-photo materialization in approve_edit_request.
--
-- Defect (found by Prompt-4 DB harness): approve_edit_request inserts one property_images row
-- per element of payload.photo_changes.add with no dedupe, so the same staged object URL passed
-- twice (or a URL already present as a live row) materializes as duplicate live photos.
--
-- Fix: dedupe the add array by URL and skip any URL that is already a live row for the property.
-- Everything else in the function is preserved byte-for-byte from the deployed definition
-- (grants/SECURITY DEFINER/search_path unchanged; only the photo INSERT block changes).

CREATE OR REPLACE FUNCTION public.approve_edit_request(p_edit_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid := (SELECT auth.uid());
  v_property_id uuid;
  v_status text;
  v_payload jsonb;
  v_clean jsonb;
  v_base jsonb;
  v_photo_add jsonb;
  p_row public.properties%ROWTYPE;
  v_new_amenities jsonb;
  v_new_fd jsonb;
  v_changed_keys jsonb;
  k text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT property_id, status, payload INTO v_property_id, v_status, v_payload
    FROM public.property_edit_requests WHERE id = p_edit_request_id FOR UPDATE;
  IF v_property_id IS NULL THEN RAISE EXCEPTION 'Edit request not found'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'Edit request is no longer pending (current: %)', v_status; END IF;

  v_clean := COALESCE(v_payload->'field_changes', '{}'::jsonb);
  v_base := COALESCE(v_payload->'base_values', '{}'::jsonb);
  v_photo_add := COALESCE(v_payload->'photo_changes'->'add', '[]'::jsonb);

  SELECT * INTO p_row FROM public.properties WHERE id = v_property_id FOR UPDATE;

  FOR k IN SELECT jsonb_object_keys(v_base) LOOP
    IF (CASE k
          WHEN 'building_notes' THEN to_jsonb(p_row.building_notes)
          WHEN 'building_rules' THEN to_jsonb(p_row.building_rules)
          WHEN 'parking_notes' THEN to_jsonb(p_row.parking_notes)
          WHEN 'rera_registration_number' THEN to_jsonb(p_row.rera_registration_number)
          WHEN 'youtube_walkthrough_url' THEN to_jsonb(p_row.youtube_walkthrough_url)
          WHEN 'bhk' THEN to_jsonb(p_row.bhk::text)
          WHEN 'property_type' THEN to_jsonb(p_row.property_type) END) IS DISTINCT FROM (v_base->k) THEN
      RAISE EXCEPTION 'stale: field % changed since submission, resubmit', k;
    END IF;
  END LOOP;

  IF v_clean ? 'amenities_building_add' THEN
    SELECT jsonb_set(COALESCE(p_row.amenities, '{}'::jsonb), '{building}',
      (SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb) FROM (
         SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_row.amenities->'building')='array' THEN p_row.amenities->'building' ELSE '[]'::jsonb END) v
         UNION SELECT jsonb_array_elements_text(v_clean->'amenities_building_add') v) s), true)
      INTO v_new_amenities;
  ELSE v_new_amenities := p_row.amenities; END IF;

  IF v_clean ? 'furnishing_detail_add' THEN
    SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb) INTO v_new_fd
    FROM (SELECT elem, ord, row_number() OVER (PARTITION BY lower(btrim(elem->>'item')) ORDER BY ord) rn
      FROM (SELECT e AS elem, 0 AS ord FROM jsonb_array_elements(COALESCE(p_row.furnishing_detail,'[]'::jsonb)) e
            UNION ALL SELECT e AS elem, 1 AS ord FROM jsonb_array_elements(v_clean->'furnishing_detail_add') e) u) d
    WHERE rn = 1;
  ELSE v_new_fd := p_row.furnishing_detail; END IF;

  UPDATE public.properties SET
    building_notes = CASE WHEN v_clean ? 'building_notes' THEN v_clean->>'building_notes' ELSE building_notes END,
    building_rules = CASE WHEN v_clean ? 'building_rules' THEN v_clean->>'building_rules' ELSE building_rules END,
    parking_notes = CASE WHEN v_clean ? 'parking_notes' THEN v_clean->>'parking_notes' ELSE parking_notes END,
    rera_registration_number = CASE WHEN v_clean ? 'rera_registration_number' THEN v_clean->>'rera_registration_number' ELSE rera_registration_number END,
    youtube_walkthrough_url = CASE WHEN v_clean ? 'youtube_walkthrough_url' THEN v_clean->>'youtube_walkthrough_url' ELSE youtube_walkthrough_url END,
    bhk = CASE WHEN v_clean ? 'bhk' THEN (v_clean->>'bhk')::bhk_type ELSE bhk END,
    property_type = CASE WHEN v_clean ? 'property_type' THEN v_clean->>'property_type' ELSE property_type END,
    amenities = v_new_amenities,
    furnishing_detail = v_new_fd,
    status = 'listed'
  WHERE id = v_property_id;

  -- CORRECTIVE CHANGE: dedupe staged-photo adds by URL (first occurrence wins, ordered by
  -- sort_order) and skip any URL already present as a live row, so the same staged object can
  -- never materialize twice.
  IF jsonb_array_length(v_photo_add) > 0 THEN
    INSERT INTO public.property_images (property_id, uploaded_by, url, section, caption, is_primary, is_floor_plan, sort_order)
    SELECT v_property_id, v_admin_id, d.url, d.section, d.caption, false, d.is_floor_plan, d.sort_order
    FROM (
      SELECT DISTINCT ON ((elem->>'url'))
        (elem->>'url')::text AS url,
        NULLIF(elem->>'section','') AS section,
        NULLIF(elem->>'caption','') AS caption,
        COALESCE((elem->>'is_floor_plan')::boolean, false) AS is_floor_plan,
        COALESCE((elem->>'sort_order')::integer, 0) AS sort_order
      FROM jsonb_array_elements(v_photo_add) AS elem
      ORDER BY (elem->>'url'), COALESCE((elem->>'sort_order')::integer, 0)
    ) d
    WHERE NOT EXISTS (
      SELECT 1 FROM public.property_images pi
      WHERE pi.property_id = v_property_id AND pi.url = d.url
    );
  END IF;

  UPDATE public.property_edit_requests SET status = 'approved', reviewed_by = v_admin_id, reviewed_at = now() WHERE id = p_edit_request_id;

  v_changed_keys := (SELECT jsonb_agg(kk) FROM jsonb_object_keys(v_clean) AS kk);
  INSERT INTO public.property_activity_log (property_id, actor_id, actor_role, action, payload, is_public)
  VALUES (v_property_id, v_admin_id, 'admin', 'edit_approved',
    jsonb_build_object('summary','Your edit was approved','edit_request_id', p_edit_request_id::text,
      'admin_id', v_admin_id::text, 'changed_field_keys', COALESCE(v_changed_keys, '[]'::jsonb)), false);
END;
$function$;
