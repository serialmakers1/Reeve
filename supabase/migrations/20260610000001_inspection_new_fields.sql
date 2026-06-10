-- Migration: inspection_new_fields
-- Adds columns for InspectionSummaryCard, KeyReturnCard, appliance location,
-- and the dining_room room type required by ROOM_DEFAULTS (2BHK+).
--
-- Apply via: supabase db push
-- All new columns are nullable with no defaults — existing rows unaffected.

-- ── room_type enum ────────────────────────────────────────────────────────────
-- dining_room was referenced in ROOM_DEFAULTS but not yet present in the enum.
ALTER TYPE room_type ADD VALUE IF NOT EXISTS 'dining_room';

-- ── property_inspections ─────────────────────────────────────────────────────
ALTER TABLE property_inspections
  ADD COLUMN IF NOT EXISTS inspection_summary  jsonb,
  ADD COLUMN IF NOT EXISTS key_return_summary  jsonb;

-- ── inspection_appliances ─────────────────────────────────────────────────────
ALTER TABLE inspection_appliances
  ADD COLUMN IF NOT EXISTS location text;
