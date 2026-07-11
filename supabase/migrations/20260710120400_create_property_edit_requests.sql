-- Phase 1 Commons: property_edit_requests
--
-- Holds pending edit payloads for a `listed` property that owner wants to change.
-- Property row transitions to `edit_pending_review` while this row is `pending`.
-- On approval, values are copied to the properties row and row status → 'approved'.
-- On rejection, row status → 'rejected', property returns to `listed` (D-094).
--
-- Latest edit supersedes previous per D-003:
--   - Partial unique index enforces "at most one pending per property".
--   - New INSERT within an RPC first UPDATEs any existing pending row → 'superseded'.
--   - Full history remains queryable via property_id + created_at DESC.
--
-- payload JSONB shape — see commons-schema.md "Photo change payload structure" and
-- includes all Tier-2 field values. Structure is TypeScript-typed at write sites.
--
-- RLS added in migration 7. Owner can SELECT own and INSERT own. UPDATE/DELETE via RPC.

BEGIN;

CREATE TABLE IF NOT EXISTS public.property_edit_requests (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id            uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id               uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status                 text NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','approved','rejected','superseded','withdrawn')),
  payload                jsonb NOT NULL DEFAULT '{}'::jsonb,
  rejection_reason       text,      -- short machine tag (e.g., 'incomplete_photos')
  rejection_reason_text  text,      -- long human explanation shown to owner
  reviewed_by            uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at            timestamptz,
  acknowledged_at        timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- At most one 'pending' edit request per property at any time. Enforced by
-- supersede-then-insert logic in the RPC that owner form uses.
CREATE UNIQUE INDEX IF NOT EXISTS ux_property_edit_requests_one_pending
  ON public.property_edit_requests(property_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_property_edit_requests_owner
  ON public.property_edit_requests(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_edit_requests_property
  ON public.property_edit_requests(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_edit_requests_pending
  ON public.property_edit_requests(created_at) WHERE status = 'pending';

ALTER TABLE public.property_edit_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.property_edit_requests IS
  'Pending owner edit payloads. On approval, RPC copies values to properties row.';

COMMENT ON COLUMN public.property_edit_requests.payload IS
  'Proposed values keyed by column name + photo_changes {add, delete, update}. See commons-schema.md.';

COMMIT;

-- Verification:
-- SELECT * FROM pg_indexes WHERE schemaname='public' AND tablename='property_edit_requests';
-- Expected: 5 indexes (pkey + 4 explicit including ux_property_edit_requests_one_pending).
