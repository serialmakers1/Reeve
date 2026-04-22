CREATE OR REPLACE FUNCTION public.reschedule_visit(
  p_visit_id        uuid,
  p_new_scheduled_at timestamptz,
  p_actor           text   -- 'admin' | 'tenant' (overridden internally from caller role)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old       visits%ROWTYPE;
  v_actor     text;
  v_new_id    uuid;
BEGIN
  -- Derive actor from actual caller role; never trust the parameter alone.
  v_actor := CASE WHEN is_admin() THEN 'admin' ELSE 'tenant' END;

  -- 1. Lock and fetch old visit.
  SELECT * INTO v_old
  FROM visits
  WHERE id = p_visit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Visit % not found', p_visit_id;
  END IF;

  -- 2. Authorise: caller must be the tenant or an admin.
  IF NOT (auth.uid() = v_old.tenant_id OR is_admin()) THEN
    RAISE EXCEPTION 'Unauthorized: only the tenant or an admin may reschedule this visit';
  END IF;

  -- 3. Reject if already terminal.
  IF v_old.status IN ('completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Visit % is already in terminal status %, cannot reschedule', p_visit_id, v_old.status;
  END IF;

  -- 4. Cancel the old visit.
  UPDATE visits
  SET
    status       = 'cancelled',
    cancelled_at = now(),
    cancelled_by = v_actor,
    updated_at   = now()
  WHERE id = p_visit_id;

  -- 5. Log cancellation event on the old visit.
  INSERT INTO visit_events (visit_id, tenant_id, property_id, event_type, initiated_by, scheduled_at)
  VALUES (p_visit_id, v_old.tenant_id, v_old.property_id, 'cancelled', v_actor, v_old.scheduled_at);

  -- 6. Insert new rescheduled visit (copies key fields from old row).
  INSERT INTO visits (
    property_id, tenant_id, scheduled_at,
    status, rescheduled_by,
    previous_scheduled_at,
    created_at, updated_at
  )
  VALUES (
    v_old.property_id, v_old.tenant_id, p_new_scheduled_at,
    'rescheduled', v_actor,
    v_old.scheduled_at,
    now(), now()
  )
  RETURNING id INTO v_new_id;

  -- 7. Log rescheduled event on the new visit.
  INSERT INTO visit_events (visit_id, tenant_id, property_id, event_type, initiated_by, scheduled_at)
  VALUES (v_new_id, v_old.tenant_id, v_old.property_id, 'rescheduled', v_actor, p_new_scheduled_at);

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_visit(uuid, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_visit(uuid, timestamptz, text) TO authenticated;
