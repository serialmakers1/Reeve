-- Add optional paint condition per room to inspection_rooms.
-- Distinct from walls_condition (structural/surface integrity);
-- paint condition captures cosmetic state relevant to tenancy deductions.
-- Nullable so all existing rows remain valid with no back-fill required.
-- Text column with CHECK constraint — same pattern as inspection_reports.report_type;
-- avoids a Postgres ENUM type (simpler to extend values later).

ALTER TABLE inspection_rooms
  ADD COLUMN paint_condition text
  CHECK (
    paint_condition IS NULL
    OR paint_condition IN ('fresh', 'faded', 'marked', 'touch_up_required', 'full_repaint_required')
  );

COMMENT ON COLUMN inspection_rooms.paint_condition IS
  'Optional paint condition assessment per room. Distinct from walls_condition (which assesses underlying wall integrity). Values: fresh, faded, marked, touch_up_required, full_repaint_required.';
