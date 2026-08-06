-- Stale-listing system (5/6): confirmation RPCs.
-- Rental: cooldown computed from the same effective timestamp the UI/sweep use;
-- sets 'confirm_rent' marker; logs 'availability_confirmed'.
-- Sale: new confirm_sale_listing, sale-only, 15-day cooldown, 'confirm_sale'
-- marker, logs 'sale_listing_confirmed'.

CREATE OR REPLACE FUNCTION public.confirm_availability_of_rental(p_property_id uuid)
 RETURNS TABLE(property_id uuid, confirmed_at timestamp with time zone, next_confirmation_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prop         record;
  v_caller_id    uuid := auth.uid();
  v_confirmed_at timestamptz;
  v_effective    timestamptz;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING DETAIL = 'You must be signed in to confirm availability.';
  END IF;

  SELECT p.id, p.owner_id, p.listing_type, p.is_active, p.status,
         p.availability_confirmed_at, p.current_listed_period_started_at, p.listed_at
  INTO v_prop
  FROM public.properties p
  WHERE p.id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING DETAIL = 'Property not found.';
  END IF;
  IF v_prop.owner_id != v_caller_id THEN
    RAISE EXCEPTION 'not_owner' USING DETAIL = 'Only the property owner can confirm availability.';
  END IF;
  IF v_prop.listing_type != 'rent' THEN
    RAISE EXCEPTION 'not_rental' USING DETAIL = 'Availability confirmation applies to rental listings only.';
  END IF;
  IF NOT v_prop.is_active THEN
    RAISE EXCEPTION 'not_active' USING DETAIL = 'Property must be active to confirm availability.';
  END IF;
  IF v_prop.status NOT IN ('listed', 'edit_pending_review') THEN
    RAISE EXCEPTION 'not_listed' USING DETAIL = 'Property must be publicly listed to confirm availability.';
  END IF;

  -- Cooldown from the effective timestamp (matches UI + sweep fallback chain).
  v_effective := COALESCE(v_prop.availability_confirmed_at, v_prop.current_listed_period_started_at, v_prop.listed_at);
  IF v_effective IS NOT NULL AND now() < v_effective + interval '7 days' THEN
    RAISE EXCEPTION 'cooldown_active'
      USING DETAIL = format('Next confirmation available at %s.',
        to_char(v_effective + interval '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  END IF;

  PERFORM set_config('reeve.system_action', 'confirm_rent', true);

  UPDATE public.properties
  SET availability_confirmed_at = now()
  WHERE id = p_property_id
  RETURNING availability_confirmed_at INTO v_confirmed_at;

  INSERT INTO public.property_activity_log
    (property_id, actor_id, actor_role, action, payload, is_public)
  VALUES
    (p_property_id, v_caller_id, 'owner', 'availability_confirmed',
     jsonb_build_object('summary', 'You confirmed this rental is still available'), false);

  RETURN QUERY SELECT p_property_id, v_confirmed_at, v_confirmed_at + interval '7 days';
END;
$function$;


CREATE OR REPLACE FUNCTION public.confirm_sale_listing(p_property_id uuid)
 RETURNS TABLE(property_id uuid, confirmed_at timestamp with time zone, next_confirmation_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prop         record;
  v_caller_id    uuid := auth.uid();
  v_confirmed_at timestamptz;
  v_effective    timestamptz;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING DETAIL = 'You must be signed in to confirm your listing.';
  END IF;

  SELECT p.id, p.owner_id, p.listing_type, p.is_active, p.status,
         p.sale_listing_confirmed_at, p.current_listed_period_started_at, p.listed_at
  INTO v_prop
  FROM public.properties p
  WHERE p.id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING DETAIL = 'Property not found.';
  END IF;
  IF v_prop.owner_id != v_caller_id THEN
    RAISE EXCEPTION 'not_owner' USING DETAIL = 'Only the property owner can confirm this listing.';
  END IF;
  IF v_prop.listing_type != 'sale' THEN
    RAISE EXCEPTION 'not_sale' USING DETAIL = 'Sale-listing confirmation applies to sale listings only.';
  END IF;
  IF NOT v_prop.is_active THEN
    RAISE EXCEPTION 'not_active' USING DETAIL = 'Property must be active to confirm the listing.';
  END IF;
  IF v_prop.status NOT IN ('listed', 'edit_pending_review') THEN
    RAISE EXCEPTION 'not_listed' USING DETAIL = 'Property must be publicly listed to confirm the listing.';
  END IF;

  -- 15-day cooldown from the effective timestamp.
  v_effective := COALESCE(v_prop.sale_listing_confirmed_at, v_prop.current_listed_period_started_at, v_prop.listed_at);
  IF v_effective IS NOT NULL AND now() < v_effective + interval '15 days' THEN
    RAISE EXCEPTION 'cooldown_active'
      USING DETAIL = format('Next confirmation available at %s.',
        to_char(v_effective + interval '15 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  END IF;

  PERFORM set_config('reeve.system_action', 'confirm_sale', true);

  UPDATE public.properties
  SET sale_listing_confirmed_at = now()
  WHERE id = p_property_id
  RETURNING sale_listing_confirmed_at INTO v_confirmed_at;

  INSERT INTO public.property_activity_log
    (property_id, actor_id, actor_role, action, payload, is_public)
  VALUES
    (p_property_id, v_caller_id, 'owner', 'sale_listing_confirmed',
     jsonb_build_object('summary', 'You confirmed this sale listing is still available'), false);

  RETURN QUERY SELECT p_property_id, v_confirmed_at, v_confirmed_at + interval '15 days';
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_sale_listing(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_sale_listing(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_sale_listing(uuid) TO authenticated;
