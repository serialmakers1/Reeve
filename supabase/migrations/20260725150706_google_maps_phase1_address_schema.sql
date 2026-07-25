-- =================================================================
-- Reeve: Google Maps Phase 1 — Address Schema Migration
-- Project: tfutuqqcxqqbirnsdpvz
-- All existing data is test data. No backfill required.
-- =================================================================

-- -----------------------------------------------------------------
-- SECTION 1: New Google Places address columns (15)
-- -----------------------------------------------------------------

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS place_id              TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address     TEXT,
  ADD COLUMN IF NOT EXISTS address_mode          VARCHAR
    CHECK (address_mode IN ('google_place', 'manual')),
  ADD COLUMN IF NOT EXISTS street_number         VARCHAR,
  ADD COLUMN IF NOT EXISTS route                 TEXT,
  ADD COLUMN IF NOT EXISTS sublocality_1         VARCHAR,
  ADD COLUMN IF NOT EXISTS sublocality_2         VARCHAR,
  ADD COLUMN IF NOT EXISTS neighborhood          VARCHAR,
  ADD COLUMN IF NOT EXISTS district              VARCHAR,
  ADD COLUMN IF NOT EXISTS country               VARCHAR DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS plus_code             VARCHAR,
  ADD COLUMN IF NOT EXISTS viewport_ne_lat       FLOAT8,
  ADD COLUMN IF NOT EXISTS viewport_ne_lng       FLOAT8,
  ADD COLUMN IF NOT EXISTS viewport_sw_lat       FLOAT8,
  ADD COLUMN IF NOT EXISTS viewport_sw_lng       FLOAT8;

-- -----------------------------------------------------------------
-- SECTION 2: Street View columns (4)
-- -----------------------------------------------------------------

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS streetview_available       BOOLEAN,
  ADD COLUMN IF NOT EXISTS streetview_pano_id         TEXT,
  ADD COLUMN IF NOT EXISTS streetview_checked_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS streetview_show_in_listing BOOLEAN NOT NULL DEFAULT FALSE;

-- -----------------------------------------------------------------
-- SECTION 3: Location verification columns (2)
-- -----------------------------------------------------------------

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS location_verified_by_owner BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS location_verified_at       TIMESTAMPTZ;

-- -----------------------------------------------------------------
-- SECTION 4: New owner-facing flat number field (1)
-- Letters, numbers, hyphens, forward slashes only. Max 10 chars.
-- -----------------------------------------------------------------

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS lister_flat_number VARCHAR(10)
    CHECK (lister_flat_number ~ '^[A-Za-z0-9/-]{1,10}$');

-- -----------------------------------------------------------------
-- SECTION 5: Modify existing columns
-- -----------------------------------------------------------------

-- Remove Karnataka default (serving all India now)
ALTER TABLE public.properties
  ALTER COLUMN state DROP DEFAULT;

-- Allow null city (Path B area-only selections may not return city)
ALTER TABLE public.properties
  ALTER COLUMN city DROP NOT NULL;

-- Allow null street_address (Path A establishment selections may not have route)
ALTER TABLE public.properties
  ALTER COLUMN street_address DROP NOT NULL;
