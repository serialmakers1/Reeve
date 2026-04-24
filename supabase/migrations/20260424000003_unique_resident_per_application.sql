-- UP
ALTER TABLE application_residents
  ADD CONSTRAINT unique_resident_per_application
  UNIQUE (application_id, full_name, age, relationship);

-- DOWN
-- ALTER TABLE application_residents
--   DROP CONSTRAINT unique_resident_per_application;
