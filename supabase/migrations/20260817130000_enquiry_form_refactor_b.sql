-- Phase B: physically drop the three columns that the new code no longer uses.
-- Safe to apply once new code is confirmed live and verified.
-- Deploy AFTER new React/API code is live.

ALTER TABLE public.property_service_enquiries
  DROP COLUMN IF EXISTS property_status,
  DROP COLUMN IF EXISTS bedrooms,
  DROP COLUMN IF EXISTS monthly_rent;

-- Sale Readiness NOT added. RLS unchanged.
