-- Convert property_inspections into a standalone, fully-manual inspection model.
--
-- The inspection subsystem is being decoupled from the Reeve marketplace:
--   * no property_id relationship / no property RPC dependency
--   * no scheduling, no status workflow, no in_person/virtual mode
--   * one optional inspection_date
--   * an editable inspection_type persisted on the row (PBR/MIR/BIR/MOCR — the
--     existing PDF report-type contract from src/lib/inspection-report/types.ts)
--   * manual, all-nullable property / owner / tenant fields (admins may start an
--     inspection, leave it incomplete, and continue later)
--
-- There is no real inspection or property data to preserve, so this migration is
-- clean: no backfill, no snapshot, no compatibility machinery.
--
-- Child tables (inspection_rooms, inspection_appliances, inspection_reports) are
-- untouched — they FK inspection_id -> property_inspections(id), and id is retained.
--
-- RLS is unchanged: "Admin/ops full access on property_inspections" references only
-- users.id = auth.uid() + role, with no dependency on any dropped column.
--
-- No broad CASCADE is used. The two dropped enum types (inspection_status,
-- inspection_mode) are used ONLY by the status/mode columns dropped below.

-- ── 1. Remove marketplace property coupling ───────────────────────────────────
ALTER TABLE public.property_inspections
  DROP CONSTRAINT property_inspections_property_id_fkey;

ALTER TABLE public.property_inspections
  DROP COLUMN property_id;

-- ── 2. Remove obsolete workflow columns (no CASCADE) ──────────────────────────
-- status/mode/scheduled_date/actual_date: removed scheduling + status + mode model.
-- owner_signed_off: removed sign-off workflow, zero code readers/writers.
-- pbr_generated_at: superseded by the inspection_reports table, zero consumers.
-- Dropping status/property_id also auto-drops their single-column indexes
-- (idx_property_inspections_status, idx_property_inspections_property_id).
ALTER TABLE public.property_inspections
  DROP COLUMN status,
  DROP COLUMN mode,
  DROP COLUMN scheduled_date,
  DROP COLUMN actual_date,
  DROP COLUMN owner_signed_off,
  DROP COLUMN pbr_generated_at;

-- ── 3. Drop now-unused enum types ─────────────────────────────────────────────
DROP TYPE public.inspection_status;
DROP TYPE public.inspection_mode;

-- ── 4. Add the standalone manual-inspection columns (all nullable) ────────────
ALTER TABLE public.property_inspections
  ADD COLUMN inspection_date date,
  ADD COLUMN inspection_type text,
  -- Manual property (flexible free text; floor/bhk accept e.g. "Ground"/"Studio";
  -- pincode is text to preserve leading zeros; no URL constraint on google_maps_url).
  ADD COLUMN building_name text,
  ADD COLUMN flat_number text,
  ADD COLUMN full_address text,
  ADD COLUMN locality text,
  ADD COLUMN city text,
  ADD COLUMN pincode text,
  ADD COLUMN floor text,
  ADD COLUMN bhk text,
  ADD COLUMN bathrooms smallint,
  ADD COLUMN balconies smallint,
  ADD COLUMN google_maps_url text,
  -- Owner (admin-only; manually entered, may be incomplete — no format constraints).
  ADD COLUMN owner_name text,
  ADD COLUMN owner_phone text,
  ADD COLUMN owner_alternate_phone text,
  ADD COLUMN owner_email text,
  -- Tenant (admin-only; manually entered, may be incomplete — no format constraints).
  ADD COLUMN tenant_name text,
  ADD COLUMN tenant_phone text,
  ADD COLUMN tenant_alternate_phone text,
  ADD COLUMN tenant_email text;

-- inspection_type contract: the existing PDF report-type values, or NULL while a
-- draft inspection is still being worked on.
ALTER TABLE public.property_inspections
  ADD CONSTRAINT property_inspections_inspection_type_check
  CHECK (inspection_type IS NULL OR inspection_type IN ('PBR', 'MIR', 'BIR', 'MOCR'));
