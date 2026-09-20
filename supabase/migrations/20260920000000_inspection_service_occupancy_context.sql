-- Inspection service context + occupancy status (Prompt 2)
--
-- Additive, backward-compatible: two nullable text columns on the standalone
-- manual inspection table, each guarded by a simple CHECK. NULL means "not
-- recorded" for both. No defaults, no backfill, no enum, no index, no trigger,
-- no RLS/grant/RPC change. Existing rows remain valid with both values NULL.
--
-- Meter readings (electricity/gas) are NOT columns — they live as strings inside
-- the existing utilities_overview JSONB and need no schema change.

ALTER TABLE public.property_inspections
  ADD COLUMN service_context text,
  ADD COLUMN occupancy_status text;

-- service_context contract: the four owner-facing service tiers, or NULL.
ALTER TABLE public.property_inspections
  ADD CONSTRAINT property_inspections_service_context_check
  CHECK (service_context IS NULL OR service_context IN ('reeve_managed', 'reeve_watch', 'reeve_let', 'other'));

-- occupancy_status contract: occupied/vacant, or NULL for "not recorded"
-- (there is deliberately no 'not_recorded' literal — absence is NULL).
ALTER TABLE public.property_inspections
  ADD CONSTRAINT property_inspections_occupancy_status_check
  CHECK (occupancy_status IS NULL OR occupancy_status IN ('occupied', 'vacant'));
