-- Prompt 2 (Phase A) — building-name-only trusted update.
-- Service-role only. Changes ONLY building_name + building_name_source; never touches
-- geography/associations/verification/Street View. Owner cannot overwrite a Google/admin
-- building identity (must use Search again). Called only by the Edge Function.

CREATE OR REPLACE FUNCTION public.update_property_building_name(
  p_property_id uuid, p_actor_user_id uuid, p_actor_type text, p_building_name text
) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid; v_status text; v_ptype text; v_mode text; v_place text; v_src text;
  v_trimmed text; v_optional boolean;
BEGIN
  IF p_actor_type NOT IN ('owner','admin') THEN RAISE EXCEPTION 'invalid actor_type %', p_actor_type; END IF;
  SELECT owner_id, status::text, property_type, address_mode, place_id, building_name_source
    INTO v_owner, v_status, v_ptype, v_mode, v_place, v_src
    FROM public.properties WHERE id = p_property_id FOR UPDATE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'property not found'; END IF;

  IF p_actor_type = 'owner' THEN
    IF p_actor_user_id IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'actor does not own property'; END IF;
    IF v_status NOT IN ('draft','changes_requested') THEN RAISE EXCEPTION 'owner edits not allowed in %', v_status; END IF;
    -- Owner may not overwrite a Google/admin building identity.
    IF NOT (v_src IS NULL OR v_src = 'owner') THEN
      RAISE EXCEPTION 'building identity is % — use Search again', v_src;
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_actor_user_id AND role::text IN ('admin','super_admin')) THEN
      RAISE EXCEPTION 'actor is not an admin';
    END IF;
  END IF;

  -- Requires an already-confirmed canonical Google location.
  IF v_mode IS DISTINCT FROM 'google_place' OR NULLIF(btrim(COALESCE(v_place,'')),'') IS NULL THEN
    RAISE EXCEPTION 'location not confirmed';
  END IF;

  v_optional := v_ptype IN ('independent_house','villa','plot');
  v_trimmed := NULLIF(btrim(COALESCE(p_building_name,'')), '');
  IF v_trimmed IS NULL AND NOT v_optional THEN
    RAISE EXCEPTION 'building_name_required';
  END IF;

  PERFORM set_config('reeve.system_action', 'building_name', true);
  UPDATE public.properties SET
    building_name = v_trimmed,
    building_name_source = CASE WHEN v_trimmed IS NULL THEN NULL
                                WHEN p_actor_type = 'admin' THEN 'admin' ELSE 'owner' END
  WHERE id = p_property_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_property_building_name(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.update_property_building_name(uuid,uuid,text,text) TO service_role;
