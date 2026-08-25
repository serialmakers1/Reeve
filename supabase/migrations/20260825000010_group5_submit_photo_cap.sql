-- Group 5 — server-side photo cap at edit-request submission.
--
-- Adds a request-level guard to submit_property_edit_request so a listed-property
-- edit can never submit more than 15 photos total:
--     live property_images + DISTINCT photo_changes.add  >  15  → reject.
-- Raised as PHOTO_LIMIT_REACHED / ERRCODE P0001 (PostgREST → HTTP 400) so the
-- frontend can show the plain "Maximum 15 photos allowed." message.
--
-- This is the AUTHORITATIVE live+staged cap (the upload Edge Function only counts
-- live images and cannot see unsubmitted staged objects). Additive only.
--
-- The function body below is reproduced VERBATIM from the current live definition
-- (verified via pg_get_functiondef + metadata: owner postgres, SECURITY DEFINER,
-- search_path=public, EXECUTE to authenticated/postgres; no later migration ever
-- redefined it). The ONLY changes vs. the live body are:
--   1. two new DECLARE vars (v_live, v_add);
--   2. the cap check inserted after v_photo_add is populated.
-- Nothing else — auth, field/photo validation, supersede, insert, and the
-- listed → edit_pending_review transition — is altered.
--
-- NOT executed anywhere before review. Deploy separately after review.

CREATE OR REPLACE FUNCTION "public"."submit_property_edit_request"("p_property_id" "uuid", "p_field_changes" "jsonb", "p_photo_changes" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller uuid := (SELECT auth.uid());
  p_row public.properties%ROWTYPE;
  v_clean jsonb := '{}'::jsonb;
  v_base jsonb := '{}'::jsonb;
  v_photo_add jsonb := '[]'::jsonb;
  v_new_edit_request_id uuid;
  v_existing_pending_id uuid;
  v_key text; v_txt text; v_am_add jsonb; v_fd_add jsonb; v_elem jsonb;
  v_existing_amenities text[];
  v_live bigint := 0;
  v_add bigint := 0;
  ALLOWED_KEYS constant text[] := ARRAY['building_notes','building_rules','parking_notes','rera_registration_number','youtube_walkthrough_url','bhk','property_type','amenities','furnishing_detail'];
  TEXT_KEYS constant text[] := ARRAY['building_notes','building_rules','parking_notes','rera_registration_number','youtube_walkthrough_url'];
  PROPERTY_TYPES constant text[] := ARRAY['apartment','villa','independent_house','duplex_apartment','plot'];
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p_row FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF p_row.id IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF p_row.owner_id <> v_caller AND NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_row.status NOT IN ('listed','edit_pending_review') THEN
    RAISE EXCEPTION 'Cannot submit edit request for property in status %', p_row.status;
  END IF;

  IF p_field_changes IS NOT NULL THEN
    FOR v_key IN SELECT jsonb_object_keys(p_field_changes) LOOP
      IF NOT (v_key = ANY (ALLOWED_KEYS)) THEN RAISE EXCEPTION 'Field % is not reviewable', v_key; END IF;
    END LOOP;
  END IF;

  FOREACH v_key IN ARRAY TEXT_KEYS LOOP
    IF p_field_changes ? v_key THEN
      v_txt := btrim(COALESCE(p_field_changes->>v_key, ''));
      IF v_txt <> '' AND v_txt IS DISTINCT FROM (
        SELECT btrim(COALESCE(CASE v_key
          WHEN 'building_notes' THEN p_row.building_notes
          WHEN 'building_rules' THEN p_row.building_rules
          WHEN 'parking_notes' THEN p_row.parking_notes
          WHEN 'rera_registration_number' THEN p_row.rera_registration_number
          WHEN 'youtube_walkthrough_url' THEN p_row.youtube_walkthrough_url END, ''))) THEN
        v_clean := v_clean || jsonb_build_object(v_key, v_txt);
        v_base := v_base || jsonb_build_object(v_key, CASE v_key
          WHEN 'building_notes' THEN to_jsonb(p_row.building_notes)
          WHEN 'building_rules' THEN to_jsonb(p_row.building_rules)
          WHEN 'parking_notes' THEN to_jsonb(p_row.parking_notes)
          WHEN 'rera_registration_number' THEN to_jsonb(p_row.rera_registration_number)
          WHEN 'youtube_walkthrough_url' THEN to_jsonb(p_row.youtube_walkthrough_url) END);
      END IF;
    END IF;
  END LOOP;

  IF p_field_changes ? 'bhk' THEN
    v_txt := p_field_changes->>'bhk';
    BEGIN PERFORM v_txt::bhk_type; EXCEPTION WHEN others THEN RAISE EXCEPTION 'Invalid bhk value: %', v_txt; END;
    IF v_txt IS DISTINCT FROM p_row.bhk::text THEN
      v_clean := v_clean || jsonb_build_object('bhk', v_txt);
      v_base := v_base || jsonb_build_object('bhk', to_jsonb(p_row.bhk::text));
    END IF;
  END IF;

  IF p_field_changes ? 'property_type' THEN
    v_txt := p_field_changes->>'property_type';
    IF NOT (v_txt = ANY (PROPERTY_TYPES)) THEN RAISE EXCEPTION 'Invalid property_type value: %', v_txt; END IF;
    IF v_txt IS DISTINCT FROM p_row.property_type THEN
      v_clean := v_clean || jsonb_build_object('property_type', v_txt);
      v_base := v_base || jsonb_build_object('property_type', to_jsonb(p_row.property_type));
    END IF;
  END IF;

  IF p_field_changes ? 'amenities' THEN
    SELECT COALESCE(array_agg(lower(btrim(b))), '{}'::text[]) INTO v_existing_amenities
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_row.amenities->'building')='array' THEN p_row.amenities->'building' ELSE '[]'::jsonb END) b;
    SELECT COALESCE(jsonb_agg(DISTINCT lower(btrim(val))), '[]'::jsonb) INTO v_am_add
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_field_changes->'amenities'->'building')='array' THEN p_field_changes->'amenities'->'building' ELSE '[]'::jsonb END) AS val
    WHERE lower(btrim(val)) = ANY (public.reeve_custom_building_amenities(p_field_changes->'amenities'))
      AND NOT (lower(btrim(val)) = ANY (v_existing_amenities));
    IF jsonb_array_length(v_am_add) > 0 THEN v_clean := v_clean || jsonb_build_object('amenities_building_add', v_am_add); END IF;
  END IF;

  IF p_field_changes ? 'furnishing_detail' THEN
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_fd_add
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_field_changes->'furnishing_detail')='array' THEN p_field_changes->'furnishing_detail' ELSE '[]'::jsonb END) AS elem
    WHERE lower(btrim(elem->>'item')) = ANY (public.reeve_custom_furnishing_names(p_field_changes->'furnishing_detail'))
      AND lower(btrim(elem->>'item')) <> ALL (public.reeve_custom_furnishing_names(p_row.furnishing_detail));
    IF jsonb_array_length(v_fd_add) > 0 THEN v_clean := v_clean || jsonb_build_object('furnishing_detail_add', v_fd_add); END IF;
  END IF;

  IF p_photo_changes ? 'delete' OR p_photo_changes ? 'update' THEN
    RAISE EXCEPTION 'Photo delete/update are instant operations, not review changes';
  END IF;
  IF p_photo_changes ? 'add' AND jsonb_typeof(p_photo_changes->'add')='array' THEN
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_photo_changes->'add') LOOP
      IF NOT ((v_elem->>'url') LIKE 'https://images.reeve.in/%' AND position(p_property_id::text IN COALESCE(v_elem->>'url','')) > 0) THEN
        RAISE EXCEPTION 'Staged photo URL is not under this property''s storage path';
      END IF;
    END LOOP;
    v_photo_add := p_photo_changes->'add';
  END IF;

  -- Server-side authoritative 15-photo cap: current live images plus the DISTINCT
  -- staged additions in this request must not exceed 15. P0001 → PHOTO_LIMIT_REACHED.
  v_live := (
    SELECT count(*)
    FROM public.property_images
    WHERE property_id = p_property_id
  );
  v_add := (
    SELECT count(DISTINCT (e->>'url'))
    FROM jsonb_array_elements(v_photo_add) e
  );
  -- Only a cap on photo ADDITIONS: field-only edits are never blocked, even if the
  -- property already sits above 15 from a tolerated concurrency overshoot.
  IF jsonb_array_length(v_photo_add) > 0
     AND v_live + v_add > 15 THEN
    RAISE EXCEPTION 'PHOTO_LIMIT_REACHED'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_clean = '{}'::jsonb AND jsonb_array_length(v_photo_add) = 0 THEN RAISE EXCEPTION 'No reviewable changes'; END IF;

  SELECT id INTO v_existing_pending_id FROM public.property_edit_requests WHERE property_id = p_property_id AND status = 'pending' FOR UPDATE;
  IF v_existing_pending_id IS NOT NULL THEN
    UPDATE public.property_edit_requests SET status = 'superseded' WHERE id = v_existing_pending_id;
  END IF;

  INSERT INTO public.property_edit_requests (property_id, owner_id, status, payload)
  VALUES (p_property_id, p_row.owner_id, 'pending',
    jsonb_build_object('field_changes', v_clean, 'base_values', v_base, 'photo_changes', jsonb_build_object('add', v_photo_add)))
  RETURNING id INTO v_new_edit_request_id;

  IF p_row.status = 'listed' THEN
    UPDATE public.properties SET status = 'edit_pending_review' WHERE id = p_property_id;
  END IF;
  RETURN v_new_edit_request_id;
END;
$$;

ALTER FUNCTION "public"."submit_property_edit_request"("p_property_id" "uuid", "p_field_changes" "jsonb", "p_photo_changes" "jsonb") OWNER TO "postgres";

-- Re-establish the confirmed EXECUTE access exactly (postgres owner is implicit).
-- Do not widen: authenticated only, never anon.
REVOKE ALL ON FUNCTION "public"."submit_property_edit_request"("p_property_id" "uuid", "p_field_changes" "jsonb", "p_photo_changes" "jsonb") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."submit_property_edit_request"("p_property_id" "uuid", "p_field_changes" "jsonb", "p_photo_changes" "jsonb") TO "authenticated";
