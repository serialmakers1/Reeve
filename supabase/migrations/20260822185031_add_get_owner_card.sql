-- Group 2 Phase 2A: narrow property-scoped identity RPC for anonymous owner card.
-- Returns (name, profile_photo_url) only for publicly-visible properties.
-- Accepts property_id — not user_id — so it cannot be used as a user directory.
-- SECURITY DEFINER with empty search_path + fully-qualified relations.
-- public_profiles view is NOT dropped here (Phase 2C).

CREATE OR REPLACE FUNCTION public.get_owner_card(p_property_id uuid)
RETURNS TABLE(name text, profile_photo_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT
      COALESCE(p.display_name, u.full_name)::text AS name,
      p.profile_photo_url::text
    FROM public.properties pr
    JOIN public.users u ON u.id = pr.owner_id
    LEFT JOIN public.profiles p ON p.user_id = pr.owner_id
    WHERE pr.id = p_property_id
      AND pr.status IN ('listed', 'edit_pending_review')
      AND pr.is_active = true;
END;
$$;

-- Remove default PUBLIC grant, then grant only to the roles that need it.
-- anon: anonymous Property Detail visitors (the primary consumer).
-- authenticated: logged-in visitors viewing a property they don't own.
REVOKE ALL ON FUNCTION public.get_owner_card(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_card(uuid) TO anon, authenticated;
