-- Add optional Google Drive folder link to property_inspections.
-- Admins paste the link on-site; it is rendered in the exported PDF
-- as a "Photo & Video Walkthrough" section between signatures and disclaimer.
-- Nullable so all existing rows remain valid with no back-fill required.
-- No index: this column is never used in WHERE/ORDER BY filters.
-- No RLS change: existing FOR ALL policies on property_inspections cover it.

ALTER TABLE property_inspections
  ADD COLUMN media_drive_link text;

COMMENT ON COLUMN property_inspections.media_drive_link IS
  'Optional Google Drive URL where inspection photos and video walkthrough are uploaded. Rendered in the exported PDF as part of the formal handoff.';
