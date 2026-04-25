-- Migration: R4 — add 27 missing FK indexes
--
-- IMPORTANT: This file has NO BEGIN/COMMIT wrapper.
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- Apply this migration last (after 000005, 000006, 000008).
--
-- All indexes use IF NOT EXISTS — safe to re-run if partially applied.
-- Naming convention: idx_{table}_{column}
--
-- DOWN:
--   DROP INDEX CONCURRENTLY IF EXISTS idx_{table}_{column}; for each index below.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agreements_agency_user_id
  ON public.agreements (agency_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agreements_document_id
  ON public.agreements (document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_eligibility_id
  ON public.applications (eligibility_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_previous_application_id
  ON public.applications (previous_application_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_visit_id
  ON public.applications (visit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_callback_requests_property_id
  ON public.callback_requests (property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_uploaded_by
  ON public.documents (uploaded_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_verified_by
  ON public.documents (verified_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_external_queries_assigned_to
  ON public.external_queries (assigned_to);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favourites_property_id
  ON public.favourites (property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspection_callbacks_property_id
  ON public.inspection_callbacks (property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keys_tracking_created_by
  ON public.keys_tracking (created_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keys_tracking_held_by_user_id
  ON public.keys_tracking (held_by_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keys_tracking_maintenance_id
  ON public.keys_tracking (maintenance_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_keys_tracking_signed_off_by
  ON public.keys_tracking (signed_off_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_assigned_to
  ON public.leads (assigned_to);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_converted_property_id
  ON public.leads (converted_property_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_agreement_id
  ON public.leases (agreement_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_parent_lease_id
  ON public.leases (parent_lease_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_requests_assigned_to
  ON public.maintenance_requests (assigned_to);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owner_action_log_application_id
  ON public.owner_action_log (application_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owner_action_log_team_member_id
  ON public.owner_action_log (team_member_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payee_id
  ON public.payments (payee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_service_agreement_id
  ON public.properties (service_agreement_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_condition_reports_conducted_by
  ON public.property_condition_reports (conducted_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_images_uploaded_by
  ON public.property_images (uploaded_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_property_inspections_inspector_user_id
  ON public.property_inspections (inspector_user_id);
