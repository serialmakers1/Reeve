-- Migration 3A: search_availability_confirmation
-- Adds availability_confirmed_at to properties for rental freshness.
-- Applied: 2026-07-27 | Version: 20260727145548
-- All 13 verification tests passed in Phase 3 Prompt 2.

-- B.1 Add column
ALTER TABLE public.properties
  ADD COLUMN availability_confirmed_at timestamptz NULL;

COMMENT ON COLUMN public.properties.availability_confirmed_at IS
  'Last time the owner explicitly confirmed this rental is still available. '
  'Rent-only: NULL for sale listings and non-public properties. '
  'Initialized to listed_at when a rental first becomes publicly listed. '
  'Reconfirmable once every 7 days via confirm_availability_of_rental().';

-- B.2 Rent-only check constraint (NOT VALID initially — validated after backfill)
ALTER TABLE public.properties
  ADD CONSTRAINT chk_availability_confirmed_rent_only
  CHECK (
    listing_type = 'rent'
    OR availability_confirmed_at IS NULL
  ) NOT VALID;

-- B.3 Update handle_property_status_change to initialize availability on first listing
-- Option A: added directly to the existing trigger function alongside listed_at logic.
CREATE OR REPLACE FUNCTION public.handle_property_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'listed' AND OLD.status != 'listed' THEN
    NEW.is_active := true;
    IF NEW.listed_at IS NULL THEN
      NEW.listed_at := now();
    END IF;
    IF NEW.listing_type = 'rent' AND NEW.availability_confirmed_at IS NULL THEN
      NEW.availability_confirmed_at := COALESCE(NEW.listed_at, now());
    END IF;
  END IF;

  IF NEW.status = 'edit_pending_review' AND OLD.status != 'edit_pending_review' THEN
    NEW.is_active := true;
    IF NEW.listing_type = 'rent' AND NEW.availability_confirmed_at IS NULL THEN
      NEW.availability_confirmed_at := COALESCE(NEW.listed_at, now());
    END IF;
  END IF;

  IF NEW.status = 'occupied' AND OLD.status != 'occupied' THEN
    NEW.is_active := false;
    IF NEW.occupied_at IS NULL THEN
      NEW.occupied_at := now();
    END IF;
    NEW.last_leased_at := now();
  END IF;

  IF OLD.status = 'listed' AND NEW.status NOT IN ('listed', 'occupied', 'edit_pending_review') THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$$;

-- B.4 Backfill existing active rent listings
UPDATE public.properties
SET availability_confirmed_at = listed_at
WHERE listing_type = 'rent'
  AND status IN ('listed', 'edit_pending_review')
  AND is_active = true
  AND availability_confirmed_at IS NULL
  AND listed_at IS NOT NULL;

ALTER TABLE public.properties
  VALIDATE CONSTRAINT chk_availability_confirmed_rent_only;

-- B.5 Controlled reconfirmation RPC
CREATE OR REPLACE FUNCTION public.confirm_availability_of_rental(
  p_property_id uuid
)
RETURNS TABLE (
  property_id          uuid,
  confirmed_at         timestamptz,
  next_confirmation_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prop           record;
  v_caller_id      uuid := auth.uid();
  v_confirmed_at   timestamptz;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING DETAIL = 'You must be signed in to confirm availability.';
  END IF;

  SELECT p.id, p.owner_id, p.listing_type, p.is_active, p.status,
         p.availability_confirmed_at
  INTO v_prop
  FROM public.properties p
  WHERE p.id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found'
      USING DETAIL = 'Property not found.';
  END IF;

  IF v_prop.owner_id != v_caller_id THEN
    RAISE EXCEPTION 'not_owner'
      USING DETAIL = 'Only the property owner can confirm availability.';
  END IF;

  IF v_prop.listing_type != 'rent' THEN
    RAISE EXCEPTION 'not_rental'
      USING DETAIL = 'Availability confirmation applies to rental listings only.';
  END IF;

  IF NOT v_prop.is_active THEN
    RAISE EXCEPTION 'not_active'
      USING DETAIL = 'Property must be active to confirm availability.';
  END IF;

  IF v_prop.status NOT IN ('listed', 'edit_pending_review') THEN
    RAISE EXCEPTION 'not_listed'
      USING DETAIL = 'Property must be publicly listed to confirm availability.';
  END IF;

  IF v_prop.availability_confirmed_at IS NOT NULL
     AND now() < v_prop.availability_confirmed_at + interval '7 days' THEN
    RAISE EXCEPTION 'cooldown_active'
      USING DETAIL = format(
        'Next confirmation available at %s.',
        to_char(v_prop.availability_confirmed_at + interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      );
  END IF;

  UPDATE public.properties
  SET availability_confirmed_at = now()
  WHERE id = p_property_id
  RETURNING availability_confirmed_at INTO v_confirmed_at;

  RETURN QUERY SELECT
    p_property_id,
    v_confirmed_at,
    v_confirmed_at + interval '7 days';
END;
$$;

-- Note: REVOKE ALL FROM PUBLIC is insufficient in Supabase — anon is auto-granted.
-- The explicit REVOKE from anon is required to match the live database state.
REVOKE ALL ON FUNCTION public.confirm_availability_of_rental(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_availability_of_rental(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_availability_of_rental(uuid) TO authenticated;
