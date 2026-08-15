-- Phase 5 · Prompt 2 — Owner pin-adjustment provenance columns
-- Two nullable columns; null = never adjusted / no data for this property.
-- No backfill — null is the correct initial state for all existing rows.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS owner_pin_adjusted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS owner_pin_adjustment_distance_m numeric NULL
    CONSTRAINT chk_owner_pin_dist_nonneg
      CHECK (owner_pin_adjustment_distance_m IS NULL OR owner_pin_adjustment_distance_m >= 0);
