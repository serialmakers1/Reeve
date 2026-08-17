-- Phase A: loosen constraints so both old and new code can operate simultaneously.
-- All current rows are confirmed disposable test data.
-- Deploy BEFORE new React/API code.

DELETE FROM public.property_service_enquiries;

-- Make property_status optional (old code still sends it; new code won't — both safe)
ALTER TABLE public.property_service_enquiries
  ALTER COLUMN property_status DROP NOT NULL;

-- Drop cross-field bedrooms constraint (old code still sends bedrooms; both safe)
ALTER TABLE public.property_service_enquiries
  DROP CONSTRAINT IF EXISTS chk_pse_plot_bedrooms;

-- Expand service_choice CHECK to allow NRI values
ALTER TABLE public.property_service_enquiries
  DROP CONSTRAINT IF EXISTS property_service_enquiries_service_choice_check;
ALTER TABLE public.property_service_enquiries
  ADD CONSTRAINT property_service_enquiries_service_choice_check
    CHECK (service_choice IN (
      'property_management', 'vacant_property_care', 'find_tenant',
      'nri_property_sale', 'nri_rent_tds', 'khata_mutation', 'not_sure'
    ));

-- Make email nullable
ALTER TABLE public.property_service_enquiries
  ALTER COLUMN email DROP NOT NULL;

-- Refresh email CHECK with explicit nullable semantics
ALTER TABLE public.property_service_enquiries
  DROP CONSTRAINT IF EXISTS property_service_enquiries_email_check;
ALTER TABLE public.property_service_enquiries
  ADD CONSTRAINT property_service_enquiries_email_check
    CHECK (email IS NULL OR char_length(email) BETWEEN 3 AND 254);

-- RLS unchanged. Indexes unchanged. source_page/status/ip columns unchanged.
-- bedrooms / monthly_rent / property_status columns temporarily remain — cleaned in Phase B.
