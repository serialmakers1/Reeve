-- Phase 1 Commons: owner_action_acknowledgments
--
-- Tracks whether the owner has dismissed a specific piece of admin feedback.
-- Enables "You have unread feedback" indicators to clear cross-device.
--
-- target_type + target_id is a polymorphic reference:
--   target_type='property'     → target_id references properties.id (used for changes_requested feedback banner)
--   target_type='edit_request' → target_id references property_edit_requests.id (used for edit rejection banner)
--
-- Deliberately not a hard FK — the target row may be archived/deleted; the ack row can outlive it.
-- Owner uniqueness enforced by (user_id, target_type, target_id).
--
-- RLS added in migration 7. Owner reads/inserts/deletes own; admin bypasses.

BEGIN;

CREATE TABLE IF NOT EXISTS public.owner_action_acknowledgments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type       text NOT NULL CHECK (target_type IN ('property', 'edit_request')),
  target_id         uuid NOT NULL,
  acknowledged_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_owner_action_acks_user
  ON public.owner_action_acknowledgments(user_id);

CREATE INDEX IF NOT EXISTS idx_owner_action_acks_target
  ON public.owner_action_acknowledgments(target_type, target_id);

ALTER TABLE public.owner_action_acknowledgments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.owner_action_acknowledgments IS
  'Records that an owner has dismissed a specific feedback banner. Polymorphic target (property or edit_request).';

COMMIT;

-- Verification:
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_schema='public' AND table_name='owner_action_acknowledgments' AND constraint_type='UNIQUE';
-- Expected: 1 unique constraint on (user_id, target_type, target_id).
