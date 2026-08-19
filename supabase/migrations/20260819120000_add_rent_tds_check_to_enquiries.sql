-- Add rent_tds_check JSONB column to property_service_enquiries.
-- Only populated when service_choice = 'nri_rent_tds' and all five check questions were answered.
ALTER TABLE public.property_service_enquiries
  ADD COLUMN IF NOT EXISTS rent_tds_check jsonb NULL;
