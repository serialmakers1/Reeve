-- M3 — Harden the edit-request RPCs for the risk-based model.
--
-- submit_property_edit_request: accept REVIEW fields only (reject LIVE/ADMIN/unknown),
--   reject no-ops/clears, store custom-additions delta (not full JSONB), capture base_values
--   for submitted scalars, accept photo ADDS only (validated R2 path).
-- approve_edit_request: stale-check submitted scalars vs base, apply REVIEW scalars only,
--   MERGE custom deltas into current live JSON (never replace), server-construct photo inserts,
--   log edit_approved PRIVATE. No LIVE/ADMIN writes, no price-dedup branch (price is live-only).
--
-- Reversible: replay 20260710120700 (submit) + 20260807110000 (approve) to restore prior bodies.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- submit_property_edit_request
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
  v_caller              uuid := (SELECT auth.uid());
  p_row                 public.properties%ROWTYPE;
  v_clean               jsonb := '{}'::jsonb;
  v_base                jsonb := '{}'::jsonb;
  v_photo_add           jsonb := '[]'::jsonb;
  v_new_edit_request_id uuid;
  v_existing_pending_id uuid;
  v_key                 text;
  v_txt                 text;
  v_am_add              jsonb;
  v_fd_add              jsonb;
  v_elem                jsonb;
  v_existing_amenities  text[];
  ALLOWED_KEYS constant text[] := ARRAY[
    'building_notes','building_rules','parking_notes','rera_registration_number',
    'youtube_walkthrough_url','bhk','property_type','amenities','furnishing_detail'
  ];
  TEXT_KEYS constant text[] := ARRAY[
    'building_notes','building_rules','parking_notes','rera_registration_number','youtube_walkthrough_url'
  ];
  PROPERTY_TYPES constant text[] := ARRAY['apartment','villa','independent_house','duplex_apartment','plot'];
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO p_row FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF p_row.id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  IF p_row.owner_id <> v_caller AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_row.status NOT IN ('listed', 'edit_pending_review') THEN
    RAISE EXCEPTION 'Cannot submit edit request for property in status %', p_row.status;
  END IF;

  -- 1. Key allowlist — reject LIVE / ADMIN / unknown keys.
  IF p_field_changes IS NOT NULL THEN
    FOR v_key IN SELECT jsonb_object_keys(p_field_changes) LOOP
      IF NOT (v_key = ANY (ALLOWED_KEYS)) THEN
        RAISE EXCEPTION 'Field % is not reviewable', v_key;
      END IF;
    END LOOP;
  END IF;

  -- 2. Removal-asymmetric text/RERA/YouTube: only non-empty, actually-different values enter review.
  FOREACH v_key IN ARRAY TEXT_KEYS LOOP
    IF p_field_changes ? v_key THEN
      v_txt := btrim(COALESCE(p_field_changes->>v_key, ''));
      IF v_txt <> '' AND v_txt IS DISTINCT FROM (
        SELECT btrim(COALESCE(
          CASE v_key
            WHEN 'building_notes' THEN p_row.building_notes
            WHEN 'building_rules' THEN p_row.building_rules
            WHEN 'parking_notes' THEN p_row.parking_notes
            WHEN 'rera_registration_number' THEN p_row.rera_registration_number
            WHEN 'youtube_walkthrough_url' THEN p_row.youtube_walkthrough_url
          END, ''))
      ) THEN
        v_clean := v_clean || jsonb_build_object(v_key, v_txt);
        v_base  := v_base  || jsonb_build_object(v_key,
          CASE v_key
            WHEN 'building_notes' THEN to_jsonb(p_row.building_notes)
            WHEN 'building_rules' THEN to_jsonb(p_row.building_rules)
            WHEN 'parking_notes' THEN to_jsonb(p_row.parking_notes)
            WHEN 'rera_registration_number' THEN to_jsonb(p_row.rera_registration_number)
            WHEN 'youtube_walkthrough_url' THEN to_jsonb(p_row.youtube_walkthrough_url)
          END);
      END IF;
    END IF;
  END LOOP;

  -- 3. bhk — validate enum, must differ.
  IF p_field_changes ? 'bhk' THEN
    v_txt := p_field_changes->>'bhk';
    BEGIN
      PERFORM v_txt::bhk_type;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid bhk value: %', v_txt;
    END;
    IF v_txt IS DISTINCT FROM p_row.bhk::text THEN
      v_clean := v_clean || jsonb_build_object('bhk', v_txt);
      v_base  := v_base  || jsonb_build_object('bhk', to_jsonb(p_row.bhk::text));
    END IF;
  END IF;

  -- 4. property_type — validate canonical, must differ.
  IF p_field_changes ? 'property_type' THEN
    v_txt := p_field_changes->>'property_type';
    IF NOT (v_txt = ANY (PROPERTY_TYPES)) THEN
      RAISE EXCEPTION 'Invalid property_type value: %', v_txt;
    END IF;
    IF v_txt IS DISTINCT FROM p_row.property_type THEN
      v_clean := v_clean || jsonb_build_object('property_type', v_txt);
      v_base  := v_base  || jsonb_build_object('property_type', to_jsonb(p_row.property_type));
    END IF;
  END IF;

  -- 5. amenities custom-building additions (new normalized names only).
  IF p_field_changes ? 'amenities' THEN
    SELECT COALESCE(array_agg(lower(btrim(b))), '{}'::text[]) INTO v_existing_amenities
    FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(p_row.amenities->'building') = 'array' THEN p_row.amenities->'building' ELSE '[]'::jsonb END
    ) b;
    SELECT COALESCE(jsonb_agg(DISTINCT lower(btrim(val))), '[]'::jsonb) INTO v_am_add
    FROM jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(p_field_changes->'amenities'->'building') = 'array'
           THEN p_field_changes->'amenities'->'building' ELSE '[]'::jsonb END
    ) AS val
    WHERE lower(btrim(val)) = ANY (public.reeve_custom_building_amenities(p_field_changes->'amenities'))
      AND NOT (lower(btrim(val)) = ANY (v_existing_amenities));
    IF jsonb_array_length(v_am_add) > 0 THEN
      v_clean := v_clean || jsonb_build_object('amenities_building_add', v_am_add);
    END IF;
  END IF;

  -- 6. furnishing_detail custom-item additions (new normalized item names only; keep full objects).
  IF p_field_changes ? 'furnishing_detail' THEN
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_fd_add
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(p_field_changes->'furnishing_detail') = 'array'
           THEN p_field_changes->'furnishing_detail' ELSE '[]'::jsonb END
    ) AS elem
    WHERE lower(btrim(elem->>'item')) = ANY (public.reeve_custom_furnishing_names(p_field_changes->'furnishing_detail'))
      AND lower(btrim(elem->>'item')) <> ALL (public.reeve_custom_furnishing_names(p_row.furnishing_detail));
    IF jsonb_array_length(v_fd_add) > 0 THEN
      v_clean := v_clean || jsonb_build_object('furnishing_detail_add', v_fd_add);
    END IF;
  END IF;

  -- 7. Photos: adds only; reject delete/update; validate staged R2 path.
  IF p_photo_changes ? 'delete' OR p_photo_changes ? 'update' THEN
    RAISE EXCEPTION 'Photo delete/update are instant operations, not review changes';
  END IF;
  IF p_photo_changes ? 'add' AND jsonb_typeof(p_photo_changes->'add') = 'array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_photo_changes->'add') LOOP
      IF NOT (
        (v_elem->>'url') LIKE 'https://images.reeve.in/%'
        AND position(p_property_id::text IN COALESCE(v_elem->>'url','')) > 0
      ) THEN
        RAISE EXCEPTION 'Staged photo URL is not under this property''s storage path';
      END IF;
    END LOOP;
    v_photo_add := p_photo_changes->'add';
  END IF;

  -- 8. Require at least one real reviewable change.
  IF v_clean = '{}'::jsonb AND jsonb_array_length(v_photo_add) = 0 THEN
    RAISE EXCEPTION 'No reviewable changes';
  END IF;

  -- Supersede prior pending, insert, flip status.
  SELECT id INTO v_existing_pending_id
    FROM public.property_edit_requests
   WHERE property_id = p_property_id AND status = 'pending'
   FOR UPDATE;
  IF v_existing_pending_id IS NOT NULL THEN
    UPDATE public.property_edit_requests SET status = 'superseded' WHERE id = v_existing_pending_id;
  END IF;

  INSERT INTO public.property_edit_requests (property_id, owner_id, status, payload)
  VALUES (
    p_property_id, p_row.owner_id, 'pending',
    jsonb_build_object(
      'field_changes', v_clean,
      'base_values',   v_base,
      'photo_changes', jsonb_build_object('add', v_photo_add)
    )
  ) RETURNING id INTO v_new_edit_request_id;

  IF p_row.status = 'listed' THEN
    UPDATE public.properties SET status = 'edit_pending_review' WHERE id = p_property_id;
  END IF;

  RETURN v_new_edit_request_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_property_edit_request(uuid, jsonb, jsonb) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- approve_edit_request
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_edit_request(
  p_edit_request_id uuid
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id      uuid := (SELECT auth.uid());
  v_property_id   uuid;
  v_status        text;
  v_payload       jsonb;
  v_clean         jsonb;
  v_base          jsonb;
  v_photo_add     jsonb;
  p_row           public.properties%ROWTYPE;
  v_new_amenities jsonb;
  v_new_fd        jsonb;
  v_changed_keys  jsonb;
  k               text;
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

  v_clean     := COALESCE(v_payload->'field_changes', '{}'::jsonb);
  v_base      := COALESCE(v_payload->'base_values', '{}'::jsonb);
  v_photo_add := COALESCE(v_payload->'photo_changes'->'add', '[]'::jsonb);

  SELECT * INTO p_row FROM public.properties WHERE id = v_property_id FOR UPDATE;

  -- Stale check: submitted scalars must still equal their base (guards against a concurrent admin edit).
  FOR k IN SELECT jsonb_object_keys(v_base) LOOP
    IF (CASE k
          WHEN 'building_notes' THEN to_jsonb(p_row.building_notes)
          WHEN 'building_rules' THEN to_jsonb(p_row.building_rules)
          WHEN 'parking_notes' THEN to_jsonb(p_row.parking_notes)
          WHEN 'rera_registration_number' THEN to_jsonb(p_row.rera_registration_number)
          WHEN 'youtube_walkthrough_url' THEN to_jsonb(p_row.youtube_walkthrough_url)
          WHEN 'bhk' THEN to_jsonb(p_row.bhk::text)
          WHEN 'property_type' THEN to_jsonb(p_row.property_type)
        END) IS DISTINCT FROM (v_base->k) THEN
      RAISE EXCEPTION 'stale: field % changed since submission, resubmit', k;
    END IF;
  END LOOP;

  -- Merge amenities custom additions into CURRENT live building array (dedupe by normalized name).
  IF v_clean ? 'amenities_building_add' THEN
    SELECT jsonb_set(
             COALESCE(p_row.amenities, '{}'::jsonb),
             '{building}',
             (SELECT COALESCE(jsonb_agg(DISTINCT v), '[]'::jsonb) FROM (
                SELECT jsonb_array_elements_text(
                  CASE WHEN jsonb_typeof(p_row.amenities->'building')='array' THEN p_row.amenities->'building' ELSE '[]'::jsonb END) v
                UNION
                SELECT jsonb_array_elements_text(v_clean->'amenities_building_add') v
             ) s),
             true)
      INTO v_new_amenities;
  ELSE
    v_new_amenities := p_row.amenities;
  END IF;

  -- Merge furnishing_detail custom additions (keep existing on name collision).
  IF v_clean ? 'furnishing_detail_add' THEN
    SELECT COALESCE(jsonb_agg(elem ORDER BY ord), '[]'::jsonb) INTO v_new_fd
    FROM (
      SELECT elem, lower(btrim(elem->>'item')) nm, ord,
             row_number() OVER (PARTITION BY lower(btrim(elem->>'item')) ORDER BY ord) rn
      FROM (
        SELECT e AS elem, 0 AS ord FROM jsonb_array_elements(COALESCE(p_row.furnishing_detail,'[]'::jsonb)) e
        UNION ALL
        SELECT e AS elem, 1 AS ord FROM jsonb_array_elements(v_clean->'furnishing_detail_add') e
      ) u
    ) d
    WHERE rn = 1;
  ELSE
    v_new_fd := p_row.furnishing_detail;
  END IF;

  -- Apply REVIEW scalars + merged JSONB only. No LIVE/ADMIN writes. Admin caller → guards exempt.
  UPDATE public.properties SET
    building_notes           = CASE WHEN v_clean ? 'building_notes' THEN v_clean->>'building_notes' ELSE building_notes END,
    building_rules           = CASE WHEN v_clean ? 'building_rules' THEN v_clean->>'building_rules' ELSE building_rules END,
    parking_notes            = CASE WHEN v_clean ? 'parking_notes' THEN v_clean->>'parking_notes' ELSE parking_notes END,
    rera_registration_number = CASE WHEN v_clean ? 'rera_registration_number' THEN v_clean->>'rera_registration_number' ELSE rera_registration_number END,
    youtube_walkthrough_url  = CASE WHEN v_clean ? 'youtube_walkthrough_url' THEN v_clean->>'youtube_walkthrough_url' ELSE youtube_walkthrough_url END,
    bhk                      = CASE WHEN v_clean ? 'bhk' THEN (v_clean->>'bhk')::bhk_type ELSE bhk END,
    property_type            = CASE WHEN v_clean ? 'property_type' THEN v_clean->>'property_type' ELSE property_type END,
    amenities                = v_new_amenities,
    furnishing_detail        = v_new_fd,
    status                   = 'listed'
  WHERE id = v_property_id;

  -- Server-construct photo inserts (never trust client is_primary/property_id/uploader).
  IF jsonb_array_length(v_photo_add) > 0 THEN
    INSERT INTO public.property_images (property_id, uploaded_by, url, section, caption, is_primary, is_floor_plan, sort_order)
    SELECT
      v_property_id,
      v_admin_id,
      (elem->>'url')::text,
      NULLIF(elem->>'section', ''),
      NULLIF(elem->>'caption', ''),
      false,
      COALESCE((elem->>'is_floor_plan')::boolean, false),
      COALESCE((elem->>'sort_order')::integer, 0)
    FROM jsonb_array_elements(v_photo_add) AS elem;
  END IF;

  UPDATE public.property_edit_requests
     SET status = 'approved', reviewed_by = v_admin_id, reviewed_at = now()
   WHERE id = p_edit_request_id;

  -- edit_approved is now PRIVATE — only price_changed remains public in Listing History.
  v_changed_keys := (SELECT jsonb_agg(kk) FROM jsonb_object_keys(v_clean) AS kk);
  INSERT INTO public.property_activity_log
    (property_id, actor_id, actor_role, action, payload, is_public)
  VALUES (
    v_property_id, v_admin_id, 'admin', 'edit_approved',
    jsonb_build_object(
      'summary', 'Your edit was approved',
      'edit_request_id', p_edit_request_id::text,
      'admin_id', v_admin_id::text,
      'changed_field_keys', COALESCE(v_changed_keys, '[]'::jsonb)
    ),
    false
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.approve_edit_request(uuid) TO authenticated;

COMMIT;
