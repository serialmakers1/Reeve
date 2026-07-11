-- Phase 1 Commons: add owner-facing columns to properties
--
-- security_deposit_amount: exact ₹ amount. Coexists with existing security_deposit_months.
-- Owner form primary input is the ₹ amount; monthly chips are shortcut helpers.
--
-- building_notes: owner-supplied "about the building / neighborhood" prose.
-- Separate from building_rules (house rules) — see commons-decisions.md D-041.
--
-- Both nullable. No backfill for existing PM properties.

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS security_deposit_amount numeric NULL;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS building_notes text NULL;

COMMENT ON COLUMN public.properties.security_deposit_amount IS
  'Exact deposit amount in INR. Owner-set. Alongside security_deposit_months for backward compatibility.';

COMMENT ON COLUMN public.properties.building_notes IS
  'Owner-supplied description of the building / neighborhood. Separate from building_rules (house rules).';

COMMIT;

-- Verification:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='properties'
--   AND column_name IN ('security_deposit_amount','building_notes');
-- Expected: 2 rows.
