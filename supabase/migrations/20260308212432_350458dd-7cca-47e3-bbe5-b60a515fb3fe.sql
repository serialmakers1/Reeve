
-- Recreate properties_public with security_invoker = true
DROP VIEW IF EXISTS public.properties_public;
CREATE VIEW public.properties_public
WITH (security_invoker = true)
AS
SELECT id,
    owner_id,
    building_name,
    floor_number,
    street_address,
    locality,
    city,
    state,
    pincode,
    latitude,
    longitude,
    map_pin_url,
    bhk,
    square_footage,
    floor_plan_url,
    furnishing,
    parking_4w,
    parking_2w,
    listed_rent,
    society_maintenance_approx,
    security_deposit_months,
    utility_water_included,
    utility_gas_included,
    utility_electricity_included,
    building_rules,
    main_door_lock_type,
    pet_policy,
    amenities,
    status,
    flat_number_revealed,
    is_active,
    board_status,
    board_qr_code,
    auto_accept_enabled,
    listed_at,
    off_market_at,
    last_leased_at,
    created_at,
    updated_at,
    title,
    description,
    property_type,
    total_floors,
    available_from
FROM properties;

-- Recreate properties_with_flat_number with security_invoker = true
DROP VIEW IF EXISTS public.properties_with_flat_number;
CREATE VIEW public.properties_with_flat_number
WITH (security_invoker = true)
AS
SELECT id,
    flat_number,
    building_name,
    floor_number,
    flat_number_revealed
FROM properties p
WHERE ((owner_id = auth.uid()) OR is_admin() OR (EXISTS ( SELECT 1
           FROM visits v
          WHERE ((v.property_id = p.id) AND (v.tenant_id = auth.uid()) AND (v.status = ANY (ARRAY['scheduled'::visit_status, 'completed'::visit_status]))))) OR (EXISTS ( SELECT 1
           FROM (payments pay
             JOIN applications a ON ((a.id = pay.application_id)))
          WHERE ((a.property_id = p.id) AND (pay.payer_id = auth.uid()) AND (pay.status = 'success'::payment_status)))));
