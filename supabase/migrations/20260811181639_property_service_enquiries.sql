-- Property service enquiry submissions from /property-services-bangalore.
-- Writes exclusively via server-side service_role (Vercel Edge Function).
-- No anon INSERT/SELECT/UPDATE/DELETE policy — browser cannot write directly.

CREATE TABLE IF NOT EXISTS public.property_service_enquiries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  source_page       text        NOT NULL DEFAULT 'property-services-bangalore',

  -- Step 1
  service_choice    text NOT NULL
    CHECK (service_choice IN ('property_management','vacant_property_care','find_tenant','not_sure')),
  property_status   text NOT NULL
    CHECK (property_status IN ('rented','empty_staying_empty','empty_need_tenant','tenant_leaving')),
  building_street   text
    CHECK (building_street IS NULL OR char_length(building_street) <= 120),
  locality_area     text NOT NULL
    CHECK (char_length(locality_area) BETWEEN 2 AND 80),

  -- Step 2
  property_type     text NOT NULL
    CHECK (property_type IN ('apartment','villa_row_house','independent_house','plot_land')),
  bedrooms          smallint
    CHECK (bedrooms IS NULL OR bedrooms BETWEEN 1 AND 5),
  monthly_rent      integer
    CHECK (monthly_rent IS NULL OR (monthly_rent > 0 AND monthly_rent <= 100000000)),

  -- Cross-field: plot → bedrooms null; non-plot → bedrooms not null
  CONSTRAINT chk_pse_plot_bedrooms CHECK (
    (property_type = 'plot_land' AND bedrooms IS NULL)
    OR (property_type <> 'plot_land' AND bedrooms IS NOT NULL)
  ),

  -- Step 3
  name              text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  phone             text NOT NULL CHECK (char_length(phone) BETWEEN 5 AND 30),
  email             text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  preferred_contact text NOT NULL
    CHECK (preferred_contact IN ('whatsapp','scheduled_call','telegram','botim')),
  based_in          text NOT NULL CHECK (char_length(based_in) BETWEEN 2 AND 80),
  notes             text CHECK (notes IS NULL OR char_length(notes) <= 1000),

  -- Server-derived Vercel request metadata (never from client body)
  request_ip        text,
  ip_country        text,
  ip_region         text,
  ip_city           text,
  ip_latitude       double precision,
  ip_longitude      double precision,
  ip_timezone       text,
  ip_postal_code    text,

  -- CRM
  status            text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','closed'))
);

ALTER TABLE public.property_service_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pse_admin_select" ON public.property_service_enquiries
  AS PERMISSIVE FOR SELECT
  USING ((SELECT public.is_admin()));

CREATE POLICY "pse_admin_update" ON public.property_service_enquiries
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE INDEX IF NOT EXISTS idx_pse_created_at     ON public.property_service_enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pse_status         ON public.property_service_enquiries (status);
CREATE INDEX IF NOT EXISTS idx_pse_service_choice ON public.property_service_enquiries (service_choice);
