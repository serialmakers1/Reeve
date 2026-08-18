-- Add sale_readiness JSONB column to property_service_enquiries.
-- Only populated when service_choice = 'nri_property_sale' and all five readiness questions were answered.
ALTER TABLE public.property_service_enquiries
  ADD COLUMN IF NOT EXISTS sale_readiness jsonb NULL;
