-- Create inspection_reports table to track every PDF export event
-- One row per generated PDF; replaces the legacy pbr_generated_at column on
-- property_inspections for multi-report-type tracking.
-- See diagnosis report 2026-05-17 for rationale.

CREATE TABLE public.inspection_reports (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id          uuid        NOT NULL REFERENCES public.property_inspections(id) ON DELETE CASCADE,
  report_type            text        NOT NULL CHECK (report_type IN ('PBR', 'MIR', 'BIR', 'MOCR')),
  generated_at           timestamptz NOT NULL DEFAULT now(),
  generated_by           uuid        NOT NULL REFERENCES public.users(id),
  inspector_name_snapshot text       NOT NULL
);

CREATE INDEX idx_inspection_reports_inspection_id
  ON public.inspection_reports(inspection_id);

CREATE INDEX idx_inspection_reports_inspection_type_generated
  ON public.inspection_reports(inspection_id, report_type, generated_at DESC);

ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;

-- Mirror the exact policy pattern from 20260425000005_rls_wrap_public_schema.sql
-- (admin / super_admin / ops / field_team full access; no tenant access)
DROP POLICY IF EXISTS "Admin/ops full access on inspection_reports" ON public.inspection_reports;
CREATE POLICY "Admin/ops full access on inspection_reports" ON public.inspection_reports
  AS PERMISSIVE FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = ANY (ARRAY[
          'admin'::user_role, 'super_admin'::user_role,
          'ops'::user_role, 'field_team'::user_role
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = ANY (ARRAY[
          'admin'::user_role, 'super_admin'::user_role,
          'ops'::user_role, 'field_team'::user_role
        ])
    )
  );
