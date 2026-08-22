-- Group 4 Phase 4A: revoke broad EXECUTE grants from all trigger-only functions.
--
-- These 29 functions are invoked exclusively through the trigger mechanism.
-- PostgreSQL checks EXECUTE only at CREATE TRIGGER time, never at invocation.
-- Granting anon/authenticated/PUBLIC direct EXECUTE is unnecessary attack surface.
-- Target ACL: postgres (owner, implicit) only — no service_role, no anon, no PUBLIC.
--
-- Safety: no function bodies, triggers, RLS, search_path, or SECURITY modes change.

-- ── Auth ──────────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM service_role;

REVOKE ALL ON FUNCTION public.handle_user_updated() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_user_updated() FROM anon;
REVOKE ALL ON FUNCTION public.handle_user_updated() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_user_updated() FROM service_role;

-- ── Security ──────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.prevent_user_privilege_escalation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_user_privilege_escalation() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_user_privilege_escalation() FROM authenticated;
REVOKE ALL ON FUNCTION public.prevent_user_privilege_escalation() FROM service_role;

REVOKE ALL ON FUNCTION public.trg_fn_assign_pseudonym() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_fn_assign_pseudonym() FROM anon;
REVOKE ALL ON FUNCTION public.trg_fn_assign_pseudonym() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_assign_pseudonym() FROM service_role;

-- ── Property / geo / image ────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.enforce_building_name_source_provenance() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_building_name_source_provenance() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_building_name_source_provenance() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_building_name_source_provenance() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_canonical_location_lock() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_canonical_location_lock() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_canonical_location_lock() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_canonical_location_lock() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_geo_association_rules() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_geo_association_rules() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_geo_association_rules() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_geo_association_rules() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_geo_place_sync() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_geo_place_sync() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_geo_place_sync() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_geo_place_sync() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_owner_edit_partition() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_owner_edit_partition() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_owner_edit_partition() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_owner_edit_partition() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_property_geom_sync() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_property_geom_sync() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_property_geom_sync() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_property_geom_sync() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_property_image_policy() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_property_image_policy() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_property_image_policy() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_property_image_policy() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_property_owner_transitions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_property_owner_transitions() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_property_owner_transitions() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_property_owner_transitions() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_publish_location_invariant() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_publish_location_invariant() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_publish_location_invariant() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_publish_location_invariant() FROM service_role;

REVOKE ALL ON FUNCTION public.enforce_single_primary_on_publish() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_single_primary_on_publish() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_single_primary_on_publish() FROM authenticated;
REVOKE ALL ON FUNCTION public.enforce_single_primary_on_publish() FROM service_role;

REVOKE ALL ON FUNCTION public.handle_property_status_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_property_status_change() FROM anon;
REVOKE ALL ON FUNCTION public.handle_property_status_change() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_property_status_change() FROM service_role;

REVOKE ALL ON FUNCTION public.log_property_price_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_property_price_change() FROM anon;
REVOKE ALL ON FUNCTION public.log_property_price_change() FROM authenticated;
REVOKE ALL ON FUNCTION public.log_property_price_change() FROM service_role;

REVOKE ALL ON FUNCTION public.prevent_owner_updating_admin_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_owner_updating_admin_fields() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_owner_updating_admin_fields() FROM authenticated;
REVOKE ALL ON FUNCTION public.prevent_owner_updating_admin_fields() FROM service_role;

REVOKE ALL ON FUNCTION public.property_activity_log_writer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.property_activity_log_writer() FROM anon;
REVOKE ALL ON FUNCTION public.property_activity_log_writer() FROM authenticated;
REVOKE ALL ON FUNCTION public.property_activity_log_writer() FROM service_role;

-- ── Contact request ───────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.auto_cancel_requests_on_archive() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_cancel_requests_on_archive() FROM anon;
REVOKE ALL ON FUNCTION public.auto_cancel_requests_on_archive() FROM authenticated;
REVOKE ALL ON FUNCTION public.auto_cancel_requests_on_archive() FROM service_role;

REVOKE ALL ON FUNCTION public.check_contact_request_limits() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_contact_request_limits() FROM anon;
REVOKE ALL ON FUNCTION public.check_contact_request_limits() FROM authenticated;
REVOKE ALL ON FUNCTION public.check_contact_request_limits() FROM service_role;

REVOKE ALL ON FUNCTION public.set_contact_request_event_timestamps() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_contact_request_event_timestamps() FROM anon;
REVOKE ALL ON FUNCTION public.set_contact_request_event_timestamps() FROM authenticated;
REVOKE ALL ON FUNCTION public.set_contact_request_event_timestamps() FROM service_role;

REVOKE ALL ON FUNCTION public.set_contact_requests_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_contact_requests_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_contact_requests_updated_at() FROM authenticated;
REVOKE ALL ON FUNCTION public.set_contact_requests_updated_at() FROM service_role;

REVOKE ALL ON FUNCTION public.trg_fn_create_rating_on_approval() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_fn_create_rating_on_approval() FROM anon;
REVOKE ALL ON FUNCTION public.trg_fn_create_rating_on_approval() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_create_rating_on_approval() FROM service_role;

-- ── Comments / ratings ────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.trg_fn_auto_hide_on_reports() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_fn_auto_hide_on_reports() FROM anon;
REVOKE ALL ON FUNCTION public.trg_fn_auto_hide_on_reports() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_auto_hide_on_reports() FROM service_role;

REVOKE ALL ON FUNCTION public.trg_fn_bump_comments_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_fn_bump_comments_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.trg_fn_bump_comments_updated_at() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_bump_comments_updated_at() FROM service_role;

REVOKE ALL ON FUNCTION public.trg_fn_bump_ratings_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_fn_bump_ratings_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.trg_fn_bump_ratings_updated_at() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_bump_ratings_updated_at() FROM service_role;

REVOKE ALL ON FUNCTION public.trg_fn_update_like_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_fn_update_like_count() FROM anon;
REVOKE ALL ON FUNCTION public.trg_fn_update_like_count() FROM authenticated;
REVOKE ALL ON FUNCTION public.trg_fn_update_like_count() FROM service_role;

-- ── Generic updated_at ────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.update_rental_preferences_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_rental_preferences_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.update_rental_preferences_updated_at() FROM authenticated;
REVOKE ALL ON FUNCTION public.update_rental_preferences_updated_at() FROM service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM service_role;
