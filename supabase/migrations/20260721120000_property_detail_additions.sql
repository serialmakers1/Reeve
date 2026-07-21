-- P1: PropertyDetail schema additions + response rate RPC fix
-- Applied via Supabase MCP: 2026-07-21

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS lock_in_months integer NULL;
COMMENT ON COLUMN public.properties.lock_in_months IS
  'Minimum tenancy in months before tenant can exit without penalty. Rent listings only. Null = not specified by owner.';

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS notice_period_days integer NULL;
COMMENT ON COLUMN public.properties.notice_period_days IS
  'Notice period in days before tenant vacates. Replaces notice_period_months for display. notice_period_months retained for legacy reads.';

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS super_built_up_area numeric NULL;
COMMENT ON COLUMN public.properties.super_built_up_area IS
  'Super built-up area in sqft. Optional companion to square_footage (carpet area).';

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS water_source text[] NULL;
COMMENT ON COLUMN public.properties.water_source IS
  'Water supply sources. Multi-select array. Valid values: municipal, borewell, tanker, rainwater_harvesting, packaged, open_well.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_main_door_lock_type_check'
      AND conrelid = 'public.properties'::regclass
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_main_door_lock_type_check
      CHECK (main_door_lock_type IN ('standard', 'godrej_manual', 'digital_keypad', 'smart_lock'));
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

CREATE OR REPLACE TRIGGER handle_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE OR REPLACE FUNCTION public.get_owner_response_rate(p_owner_id uuid)
RETURNS TABLE(
  all_time_handled   bigint,
  all_time_responded bigint,
  all_time_rate      numeric,
  last_7d_handled    bigint,
  last_7d_responded  bigint,
  last_7d_rate       numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all_total    bigint;
  v_all_handled  bigint;
  v_7d_total     bigint;
  v_7d_handled   bigint;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('withdrawn', 'auto_cancelled')),
    COUNT(*) FILTER (WHERE status IN ('approved', 'declined'))
  INTO v_all_total, v_all_handled
  FROM public.contact_requests
  WHERE owner_id = p_owner_id;

  SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('withdrawn', 'auto_cancelled')),
    COUNT(*) FILTER (WHERE status IN ('approved', 'declined'))
  INTO v_7d_total, v_7d_handled
  FROM public.contact_requests
  WHERE owner_id = p_owner_id
    AND created_at >= now() - interval '7 days';

  RETURN QUERY SELECT
    v_all_handled,
    v_all_handled,
    CASE WHEN v_all_total = 0 THEN 0::numeric
         ELSE ROUND(v_all_handled::numeric / v_all_total * 100, 0)
    END,
    v_7d_handled,
    v_7d_handled,
    CASE WHEN v_7d_total = 0 THEN 0::numeric
         ELSE ROUND(v_7d_handled::numeric / v_7d_total * 100, 0)
    END;
END;
$$;
