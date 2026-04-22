CREATE OR REPLACE FUNCTION public.enforce_visit_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op if status is not changing (allow other field updates freely).
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Block any mutation originating from a terminal state.
  IF OLD.status IN ('completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION
      'Invalid visit status transition: cannot move from terminal status "%" to "%". Visit id: %',
      OLD.status, NEW.status, OLD.id;
  END IF;

  -- From non-terminal (scheduled | confirmed | rescheduled),
  -- only these target statuses are permitted.
  IF NEW.status NOT IN ('rescheduled', 'cancelled', 'completed', 'no_show') THEN
    RAISE EXCEPTION
      'Invalid visit status transition: "%" → "%" is not allowed. Visit id: %',
      OLD.status, NEW.status, OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_visit_status_transitions ON public.visits;

CREATE TRIGGER enforce_visit_status_transitions
  BEFORE UPDATE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_visit_status_transitions();
