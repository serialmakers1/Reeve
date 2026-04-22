-- All four columns already exist on visits; ADD COLUMN IF NOT EXISTS is idempotent.
-- This migration exists purely for tracking purposes.
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS cancelled_by    text,
  ADD COLUMN IF NOT EXISTS rescheduled_by  text,
  ADD COLUMN IF NOT EXISTS cancelled_at    timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at    timestamptz;

COMMENT ON COLUMN public.visits.cancelled_by   IS 'actor who cancelled: tenant | admin';
COMMENT ON COLUMN public.visits.rescheduled_by IS 'actor who rescheduled: tenant | admin';
