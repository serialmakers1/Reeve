-- Add rescheduled_to_visit_id to visit_events.
-- Set by reschedule_visit RPC only. NULL = standalone cancel (not from a reschedule).
ALTER TABLE public.visit_events
  ADD COLUMN IF NOT EXISTS rescheduled_to_visit_id uuid REFERENCES public.visits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visit_events_rescheduled_to_visit_id
  ON public.visit_events (rescheduled_to_visit_id)
  WHERE rescheduled_to_visit_id IS NOT NULL;
