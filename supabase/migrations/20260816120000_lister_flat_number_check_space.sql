-- Allow spaces in lister_flat_number (e.g. "A 603", "12 A/B").
-- Drops and recreates the CHECK only — VARCHAR(10) constraint is unchanged.

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_lister_flat_number_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_lister_flat_number_check
    CHECK (lister_flat_number ~ '^[A-Za-z0-9 /-]{1,10}$');
