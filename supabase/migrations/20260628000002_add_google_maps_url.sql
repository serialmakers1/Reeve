ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS google_maps_url text DEFAULT NULL;
