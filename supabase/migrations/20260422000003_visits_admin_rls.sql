-- Fix visits INSERT: existing policy blocked admin (tenant_id = auth.uid() only).
-- Replace with a policy that allows both tenant self-insert and admin insert.
DROP POLICY IF EXISTS visits_insert ON public.visits;

CREATE POLICY visits_insert ON public.visits
  FOR INSERT
  WITH CHECK (
    (auth.uid() IS NOT NULL AND tenant_id = auth.uid())
    OR is_admin()
  );

-- Admin full DELETE (no delete policy existed)
DROP POLICY IF EXISTS visits_delete_admin ON public.visits;
CREATE POLICY visits_delete_admin ON public.visits
  FOR DELETE
  USING (is_admin());

-- visit_events: add UPDATE + DELETE for admin (append-only for tenants)
DROP POLICY IF EXISTS visit_events_update_admin ON public.visit_events;
CREATE POLICY visit_events_update_admin ON public.visit_events
  FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS visit_events_delete_admin ON public.visit_events;
CREATE POLICY visit_events_delete_admin ON public.visit_events
  FOR DELETE
  USING (is_admin());
