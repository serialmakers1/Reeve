-- UP: allow tenants to delete residents on their own draft applications, and admins always
CREATE POLICY "app_residents_delete" ON application_residents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM applications a
    WHERE a.id = application_residents.application_id
      AND (
        (a.tenant_id = auth.uid() AND a.status = 'draft')
        OR is_admin()
      )
  )
);

-- DOWN
-- DROP POLICY "app_residents_delete" ON application_residents;
