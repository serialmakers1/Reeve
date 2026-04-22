-- Test data only — truncate first so existing rows don't block the constraint.
TRUNCATE TABLE public.visit_events;

-- Drop if exists (idempotent re-runs)
ALTER TABLE public.visit_events
  DROP CONSTRAINT IF EXISTS visit_events_event_type_check;

-- Status-transition event types + note event types are separate categories.
-- Status: scheduled | rescheduled | cancelled | completed | no_show
-- Notes:  property_feedback_note | admin_note
ALTER TABLE public.visit_events
  ADD CONSTRAINT visit_events_event_type_check
  CHECK (event_type IN (
    'scheduled',
    'rescheduled',
    'cancelled',
    'completed',
    'no_show',
    'property_feedback_note',
    'admin_note'
  ));

COMMENT ON COLUMN public.visit_events.event_type IS
  'Status events: scheduled|rescheduled|cancelled|completed|no_show. '
  'Note events: property_feedback_note|admin_note. '
  'Note events never duplicate a status event.';
