-- Phase 1 Commons: property_activity_log
--
-- Append-only audit log for every property state change. Written by triggers
-- (property_activity_log_writer) and RPCs (approve_edit_request, reject_edit_request
-- in a later prompt). NEVER written directly from the frontend.
--
-- Payload is a discriminated union — see src/types/activity-log.ts (Prompt 2).
-- All variants include `summary: string` for uniform timeline rendering.
--
-- is_public governs whether public property detail page timeline surfaces the event.
-- Curated public actions (D-081): listed, unlisted, relisted, price_changed,
-- photos_updated, availability_changed. Everything else stays private.
--
-- RLS added in migration 7. No INSERT/UPDATE/DELETE policies — service_role only.

BEGIN;

CREATE TABLE IF NOT EXISTS public.property_activity_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_role   text NOT NULL CHECK (actor_role IN ('owner', 'admin', 'system')),
  action       text NOT NULL,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_activity_log_property_id
  ON public.property_activity_log(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_activity_log_actor_id
  ON public.property_activity_log(actor_id) WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_property_activity_log_public
  ON public.property_activity_log(property_id, created_at DESC) WHERE is_public = true;

ALTER TABLE public.property_activity_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.property_activity_log IS
  'Append-only audit log for property state changes. Written by triggers/RPCs only.';

COMMIT;

-- Verification:
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='property_activity_log';
-- Expected: 1 row.
-- SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='property_activity_log';
-- Expected: true.
