-- Add maintenance_included_in_rent and gas_type columns to properties
-- maintenance_included_in_rent: when true, society maintenance is bundled in base rent
-- gas_type: 'pipeline' or 'cylinder' — null means unspecified

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS maintenance_included_in_rent boolean NOT NULL DEFAULT false;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS gas_type text CHECK (gas_type IN ('pipeline', 'cylinder')) DEFAULT NULL;
