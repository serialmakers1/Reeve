-- Group 2 Phase 2C: remove the legacy SECURITY DEFINER public_profiles view.
-- All application callers migrated in Phases 2A/2B (get_owner_card RPC +
-- direct users/profiles reads). No DB object depends on it (verified).
-- Plain DROP (no CASCADE) so any unexpected dependency fails safely.
DROP VIEW public.public_profiles;
