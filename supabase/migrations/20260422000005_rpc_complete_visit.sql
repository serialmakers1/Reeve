CREATE OR REPLACE FUNCTION public.complete_visit(
  p_visit_id          uuid,
  p_property_feedback text DEFAULT NULL,
  p_admin_note        text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visit visits%ROWTYPE;
BEGIN
  -- 1. Admin-only.
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admins may mark a visit complete';
  END IF;

  -- 2. Lock and fetch visit.
  SELECT * INTO v_visit
  FROM visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % not found', p_visit_id;
  END IF;

  -- 3. Reject if already terminal.
  IF v_visit.status IN ('completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Visit % is already in terminal status %, cannot complete', p_visit_id, v_visit.status;
  END IF;

  -- 4. Mark visit complete.
  UPDATE visits
  SET
    status       = 'completed',
    completed_at = now(),
    updated_at   = now()
  WHERE id = p_visit_id;

  -- 5. Insert exactly ONE 'completed' status event.
  INSERT INTO visit_events (visit_id, tenant_id, property_id, event_type, initiated_by)
  VALUES (p_visit_id, v_visit.tenant_id, v_visit.property_id, 'completed', 'admin');

  -- 6. Note events are separate — never use event_type='completed' for notes.
  IF p_property_feedback IS NOT NULL AND trim(p_property_feedback) <> '' THEN
    INSERT INTO visit_events (visit_id, tenant_id, property_id, event_type, initiated_by, notes, note_type)
    VALUES (p_visit_id, v_visit.tenant_id, v_visit.property_id, 'property_feedback_note', 'admin',
            trim(p_property_feedback), 'property_feedback');
  END IF;

  IF p_admin_note IS NOT NULL AND trim(p_admin_note) <> '' THEN
    INSERT INTO visit_events (visit_id, tenant_id, property_id, event_type, initiated_by, notes, note_type)
    VALUES (p_visit_id, v_visit.tenant_id, v_visit.property_id, 'admin_note', 'admin',
            trim(p_admin_note), 'admin_user_note');

    -- Keep profiles.admin_notes in sync.
    UPDATE profiles
    SET admin_notes = trim(p_admin_note)
    WHERE user_id = v_visit.tenant_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_visit(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_visit(uuid, text, text) TO authenticated;
