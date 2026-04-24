-- Add work_email and linkedin_url to applications table
ALTER TABLE applications
  ADD COLUMN work_email   text,
  ADD COLUMN linkedin_url text;

-- Rollback:
-- ALTER TABLE applications
--   DROP COLUMN work_email,
--   DROP COLUMN linkedin_url;
