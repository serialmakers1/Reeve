-- R1 + R2: Wrap auth.uid() / is_admin() across 84 public-schema RLS policies;
--          drop 4 redundant SELECT policies proven to be strict subsets.
--
-- Wrap pattern:
--   auth.uid()  → (SELECT auth.uid())   per-query caching, not per-row
--   is_admin()  → (SELECT is_admin())   same
--   is_property_owner(prop_id) → UNTOUCHED (per-row argument, not wrappable)
--
-- inspection_appliances / inspection_rooms / property_inspections policies:
--   Only auth.uid() wrapped. Inline role array covers ops/field_team which
--   is_admin() does NOT cover — role check body left byte-identical.
--
-- R2 subset proofs (dropped policies are strict subsets of surviving policy):
--   payments_select_admin  ⊂  payments_select  (via is_admin() branch)
--   payments_select_own    ⊂  payments_select  (via payer_id branch)
--   app_notes_select_admin ⊂  app_notes_select (via is_admin() branch in EXISTS)
--   app_notes_select_owner ⊂  app_notes_select (via is_property_owner branch in EXISTS)
--
-- DOWN:
--   Re-run with bare auth.uid() / is_admin() to revert. No data is affected.
--   To restore the 4 dropped policies, recreate with their original USING expressions
--   (available in git history of this migration file header and pg_policy snapshot).
--   payments_select_admin original: USING (is_admin())
--   payments_select_own   original: USING (auth.uid() = payer_id)
--   app_notes_select_admin original: USING (is_admin())
--   app_notes_select_owner original: USING (EXISTS (SELECT 1 FROM applications a JOIN properties p ON p.id=a.property_id WHERE a.id=application_notes.application_id AND p.owner_id=auth.uid() AND a.platform_approved=true))

BEGIN;

-- ── R2: Drop 4 redundant policies ─────────────────────────────────────────────

DROP POLICY IF EXISTS "payments_select_admin"    ON public.payments;
DROP POLICY IF EXISTS "payments_select_own"      ON public.payments;
DROP POLICY IF EXISTS "app_notes_select_admin"   ON public.application_notes;
DROP POLICY IF EXISTS "app_notes_select_owner"   ON public.application_notes;

-- ── agreements ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "agreements_insert_admin" ON public.agreements;
CREATE POLICY "agreements_insert_admin" ON public.agreements
  AS PERMISSIVE FOR INSERT
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "agreements_select" ON public.agreements;
CREATE POLICY "agreements_select" ON public.agreements
  AS PERMISSIVE FOR SELECT
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "agreements_update_admin" ON public.agreements;
CREATE POLICY "agreements_update_admin" ON public.agreements
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT is_admin()));

-- ── application_notes ────────────────────────────────────────────────────────
-- app_notes_select_admin and app_notes_select_owner already dropped above (R2).

DROP POLICY IF EXISTS "app_notes_insert" ON public.application_notes;
CREATE POLICY "app_notes_insert" ON public.application_notes
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_notes.application_id
        AND a.tenant_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "app_notes_select" ON public.application_notes;
CREATE POLICY "app_notes_select" ON public.application_notes
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_notes.application_id
        AND (
          a.tenant_id = (SELECT auth.uid())
          OR (is_property_owner(a.property_id) AND a.platform_approved = true)
          OR (SELECT is_admin())
        )
    )
  );

DROP POLICY IF EXISTS "app_notes_update_admin" ON public.application_notes;
CREATE POLICY "app_notes_update_admin" ON public.application_notes
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT is_admin()));

-- ── application_residents ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "app_residents_delete" ON public.application_residents;
CREATE POLICY "app_residents_delete" ON public.application_residents
  AS PERMISSIVE FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_residents.application_id
        AND (
          ((a.tenant_id = (SELECT auth.uid())) AND (a.status = 'draft'::application_status))
          OR (SELECT is_admin())
        )
    )
  );

DROP POLICY IF EXISTS "app_residents_insert" ON public.application_residents;
CREATE POLICY "app_residents_insert" ON public.application_residents
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_residents.application_id
        AND a.tenant_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "app_residents_select" ON public.application_residents;
CREATE POLICY "app_residents_select" ON public.application_residents
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_residents.application_id
        AND (
          a.tenant_id = (SELECT auth.uid())
          OR (is_property_owner(a.property_id) AND a.platform_approved = true)
          OR (SELECT is_admin())
        )
    )
  );

DROP POLICY IF EXISTS "app_residents_update" ON public.application_residents;
CREATE POLICY "app_residents_update" ON public.application_residents
  AS PERMISSIVE FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.id = application_residents.application_id
        AND (
          a.tenant_id = (SELECT auth.uid())
          OR (SELECT is_admin())
        )
    )
  );

-- ── applications ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "applications_delete" ON public.applications;
CREATE POLICY "applications_delete" ON public.applications
  AS PERMISSIVE FOR DELETE
  USING (
    (tenant_id = (SELECT auth.uid()))
    AND (status = 'draft'::application_status)
  );

DROP POLICY IF EXISTS "applications_insert" ON public.applications;
CREATE POLICY "applications_insert" ON public.applications
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    ((SELECT auth.uid()) IS NOT NULL)
    AND (tenant_id = (SELECT auth.uid()))
    AND NOT (
      EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = applications.property_id
          AND properties.owner_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "applications_select" ON public.applications;
CREATE POLICY "applications_select" ON public.applications
  AS PERMISSIVE FOR SELECT
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR (
      EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = applications.property_id
          AND properties.owner_id = (SELECT auth.uid())
      )
      AND status <> 'draft'::application_status
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "applications_update" ON public.applications;
CREATE POLICY "applications_update" ON public.applications
  AS PERMISSIVE FOR UPDATE
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = applications.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
    OR (SELECT is_admin())
  );

-- ── callback_requests ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "callback_requests_insert_own" ON public.callback_requests;
CREATE POLICY "callback_requests_insert_own" ON public.callback_requests
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    ((SELECT auth.uid()) IS NOT NULL)
    AND (user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "callback_requests_select_admin" ON public.callback_requests;
CREATE POLICY "callback_requests_select_admin" ON public.callback_requests
  AS PERMISSIVE FOR SELECT
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "callback_requests_select_own" ON public.callback_requests;
CREATE POLICY "callback_requests_select_own" ON public.callback_requests
  AS PERMISSIVE FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "callback_requests_update_admin" ON public.callback_requests;
CREATE POLICY "callback_requests_update_admin" ON public.callback_requests
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "callback_requests_update_own_pending" ON public.callback_requests;
CREATE POLICY "callback_requests_update_own_pending" ON public.callback_requests
  AS PERMISSIVE FOR UPDATE
  USING (
    (user_id = (SELECT auth.uid()))
    AND (status = 'pending'::text)
  );

-- ── documents ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "documents_delete_own_uploads" ON public.documents;
CREATE POLICY "documents_delete_own_uploads" ON public.documents
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (uploaded_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents
  AS PERMISSIVE FOR INSERT
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents
  AS PERMISSIVE FOR SELECT
  USING (
    (owner_user_id = (SELECT auth.uid()))
    OR (uploaded_by = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "documents_update" ON public.documents;
CREATE POLICY "documents_update" ON public.documents
  AS PERMISSIVE FOR UPDATE
  USING (
    (uploaded_by = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── eligibility ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "eligibility_insert" ON public.eligibility;
CREATE POLICY "eligibility_insert" ON public.eligibility
  AS PERMISSIVE FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "eligibility_owner_read" ON public.eligibility;
CREATE POLICY "eligibility_owner_read" ON public.eligibility
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM applications a
      JOIN properties p ON p.id = a.property_id
      WHERE a.tenant_id = eligibility.user_id
        AND p.owner_id = (SELECT auth.uid())
        AND a.platform_approved = true
    )
  );

DROP POLICY IF EXISTS "eligibility_select" ON public.eligibility;
CREATE POLICY "eligibility_select" ON public.eligibility
  AS PERMISSIVE FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "eligibility_update" ON public.eligibility;
CREATE POLICY "eligibility_update" ON public.eligibility
  AS PERMISSIVE FOR UPDATE
  USING (
    (user_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── external_queries ──────────────────────────────────────────────────────────
-- external_queries_insert_public has no auth.uid()/is_admin() call — not recreated.

DROP POLICY IF EXISTS "external_queries_select" ON public.external_queries;
CREATE POLICY "external_queries_select" ON public.external_queries
  AS PERMISSIVE FOR SELECT
  USING (
    is_property_owner(property_id)
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "external_queries_update_admin" ON public.external_queries;
CREATE POLICY "external_queries_update_admin" ON public.external_queries
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT is_admin()));

-- ── favourites ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "favourites_delete" ON public.favourites;
CREATE POLICY "favourites_delete" ON public.favourites
  AS PERMISSIVE FOR DELETE
  USING (
    (user_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "favourites_insert" ON public.favourites;
CREATE POLICY "favourites_insert" ON public.favourites
  AS PERMISSIVE FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "favourites_select" ON public.favourites;
CREATE POLICY "favourites_select" ON public.favourites
  AS PERMISSIVE FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── inspection_appliances ─────────────────────────────────────────────────────
-- Wrap auth.uid() ONLY. Inline role array covers ops/field_team — is_admin() substitution
-- would drop those roles. Body otherwise byte-identical.

DROP POLICY IF EXISTS "Admin/ops full access on inspection_appliances" ON public.inspection_appliances;
CREATE POLICY "Admin/ops full access on inspection_appliances" ON public.inspection_appliances
  AS PERMISSIVE FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = ANY (ARRAY[
          'admin'::user_role, 'super_admin'::user_role,
          'ops'::user_role, 'field_team'::user_role
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = ANY (ARRAY[
          'admin'::user_role, 'super_admin'::user_role,
          'ops'::user_role, 'field_team'::user_role
        ])
    )
  );

-- ── inspection_callbacks ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "inspection_callbacks_insert" ON public.inspection_callbacks;
CREATE POLICY "inspection_callbacks_insert" ON public.inspection_callbacks
  AS PERMISSIVE FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "inspection_callbacks_select" ON public.inspection_callbacks;
CREATE POLICY "inspection_callbacks_select" ON public.inspection_callbacks
  AS PERMISSIVE FOR SELECT
  USING (
    (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "inspection_callbacks_update" ON public.inspection_callbacks;
CREATE POLICY "inspection_callbacks_update" ON public.inspection_callbacks
  AS PERMISSIVE FOR UPDATE
  USING (
    (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── inspection_rooms ──────────────────────────────────────────────────────────
-- Same rule as inspection_appliances: wrap auth.uid() only.

DROP POLICY IF EXISTS "Admin/ops full access on inspection_rooms" ON public.inspection_rooms;
CREATE POLICY "Admin/ops full access on inspection_rooms" ON public.inspection_rooms
  AS PERMISSIVE FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = ANY (ARRAY[
          'admin'::user_role, 'super_admin'::user_role,
          'ops'::user_role, 'field_team'::user_role
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = ANY (ARRAY[
          'admin'::user_role, 'super_admin'::user_role,
          'ops'::user_role, 'field_team'::user_role
        ])
    )
  );

-- ── keys_tracking ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "keys_insert_admin" ON public.keys_tracking;
CREATE POLICY "keys_insert_admin" ON public.keys_tracking
  AS PERMISSIVE FOR INSERT
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "keys_select" ON public.keys_tracking;
CREATE POLICY "keys_select" ON public.keys_tracking
  AS PERMISSIVE FOR SELECT
  USING (
    is_property_owner(property_id)
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "keys_update_admin" ON public.keys_tracking;
CREATE POLICY "keys_update_admin" ON public.keys_tracking
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT is_admin()));

-- ── leads ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "leads_insert" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads
  AS PERMISSIVE FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "leads_select" ON public.leads;
CREATE POLICY "leads_select" ON public.leads
  AS PERMISSIVE FOR SELECT
  USING (
    (referred_by_tenant_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "leads_update_admin" ON public.leads;
CREATE POLICY "leads_update_admin" ON public.leads
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT is_admin()));

-- ── leases ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "leases_insert_admin" ON public.leases;
CREATE POLICY "leases_insert_admin" ON public.leases
  AS PERMISSIVE FOR INSERT
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "leases_select" ON public.leases;
CREATE POLICY "leases_select" ON public.leases
  AS PERMISSIVE FOR SELECT
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "leases_update" ON public.leases;
CREATE POLICY "leases_update" ON public.leases
  AS PERMISSIVE FOR UPDATE
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── maintenance_requests ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "maintenance_insert_tenant" ON public.maintenance_requests;
CREATE POLICY "maintenance_insert_tenant" ON public.maintenance_requests
  AS PERMISSIVE FOR INSERT
  WITH CHECK (raised_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "maintenance_select" ON public.maintenance_requests;
CREATE POLICY "maintenance_select" ON public.maintenance_requests
  AS PERMISSIVE FOR SELECT
  USING (
    (raised_by = (SELECT auth.uid()))
    OR is_property_owner(property_id)
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "maintenance_update" ON public.maintenance_requests;
CREATE POLICY "maintenance_update" ON public.maintenance_requests
  AS PERMISSIVE FOR UPDATE
  USING (
    (raised_by = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── owner_action_log ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "owner_action_log_admin_all" ON public.owner_action_log;
CREATE POLICY "owner_action_log_admin_all" ON public.owner_action_log
  AS PERMISSIVE FOR ALL
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "owner_action_log_owner_read" ON public.owner_action_log;
CREATE POLICY "owner_action_log_owner_read" ON public.owner_action_log
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM applications a
      JOIN properties p ON p.id = a.property_id
      WHERE a.id = owner_action_log.application_id
        AND p.owner_id = (SELECT auth.uid())
    )
  );

-- ── owner_bank_details ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "owner_bank_details_insert" ON public.owner_bank_details;
CREATE POLICY "owner_bank_details_insert" ON public.owner_bank_details
  AS PERMISSIVE FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner_bank_details_select" ON public.owner_bank_details;
CREATE POLICY "owner_bank_details_select" ON public.owner_bank_details
  AS PERMISSIVE FOR SELECT
  USING (
    (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "owner_bank_details_update" ON public.owner_bank_details;
CREATE POLICY "owner_bank_details_update" ON public.owner_bank_details
  AS PERMISSIVE FOR UPDATE
  USING (
    (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── payments ──────────────────────────────────────────────────────────────────
-- payments_select_admin and payments_select_own already dropped above (R2).

DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert" ON public.payments
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    (payer_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select" ON public.payments
  AS PERMISSIVE FOR SELECT
  USING (
    (payer_id = (SELECT auth.uid()))
    OR (payee_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "payments_update_admin" ON public.payments;
CREATE POLICY "payments_update_admin" ON public.payments
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT is_admin()));

-- ── profiles ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  AS PERMISSIVE FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  AS PERMISSIVE FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  AS PERMISSIVE FOR UPDATE
  USING (
    (user_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── properties ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "properties_delete" ON public.properties;
CREATE POLICY "properties_delete" ON public.properties
  AS PERMISSIVE FOR DELETE
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "properties_insert" ON public.properties;
CREATE POLICY "properties_insert" ON public.properties
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    ((SELECT auth.uid()) IS NOT NULL)
    AND (owner_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "properties_select" ON public.properties;
CREATE POLICY "properties_select" ON public.properties
  AS PERMISSIVE FOR SELECT
  USING (
    ((status = 'listed'::property_status) AND (is_active = true))
    OR (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "properties_update" ON public.properties;
CREATE POLICY "properties_update" ON public.properties
  AS PERMISSIVE FOR UPDATE
  USING (
    (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── property_condition_reports ────────────────────────────────────────────────

DROP POLICY IF EXISTS "condition_reports_insert_admin" ON public.property_condition_reports;
CREATE POLICY "condition_reports_insert_admin" ON public.property_condition_reports
  AS PERMISSIVE FOR INSERT
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "condition_reports_select" ON public.property_condition_reports;
CREATE POLICY "condition_reports_select" ON public.property_condition_reports
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leases l
      WHERE l.id = property_condition_reports.lease_id
        AND (
          l.tenant_id = (SELECT auth.uid())
          OR l.owner_id = (SELECT auth.uid())
        )
    )
    OR is_property_owner(property_id)
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "condition_reports_update" ON public.property_condition_reports;
CREATE POLICY "condition_reports_update" ON public.property_condition_reports
  AS PERMISSIVE FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leases l
      WHERE l.id = property_condition_reports.lease_id
        AND l.tenant_id = (SELECT auth.uid())
    )
    OR (SELECT is_admin())
  );

-- ── property_images ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "property_images_delete" ON public.property_images;
CREATE POLICY "property_images_delete" ON public.property_images
  AS PERMISSIVE FOR DELETE
  USING (
    (SELECT is_admin())
    OR EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_images.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "property_images_insert" ON public.property_images;
CREATE POLICY "property_images_insert" ON public.property_images
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    (SELECT is_admin())
    OR EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_images.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "property_images_select_public" ON public.property_images;
CREATE POLICY "property_images_select_public" ON public.property_images
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_images.property_id
        AND (p.status)::text = 'listed'::text
        AND p.is_active = true
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "property_images_update" ON public.property_images;
CREATE POLICY "property_images_update" ON public.property_images
  AS PERMISSIVE FOR UPDATE
  USING (
    (SELECT is_admin())
    OR EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_images.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- ── property_inspections ──────────────────────────────────────────────────────
-- Wrap auth.uid() ONLY. Same reasoning as inspection_appliances/rooms.

DROP POLICY IF EXISTS "Admin/ops full access on property_inspections" ON public.property_inspections;
CREATE POLICY "Admin/ops full access on property_inspections" ON public.property_inspections
  AS PERMISSIVE FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = ANY (ARRAY[
          'admin'::user_role, 'super_admin'::user_role,
          'ops'::user_role, 'field_team'::user_role
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = ANY (ARRAY[
          'admin'::user_role, 'super_admin'::user_role,
          'ops'::user_role, 'field_team'::user_role
        ])
    )
  );

-- ── users ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  AS PERMISSIVE FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_owner_read_tenant_name" ON public.users;
CREATE POLICY "users_owner_read_tenant_name" ON public.users
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM applications a
      JOIN properties p ON p.id = a.property_id
      WHERE a.tenant_id = users.id
        AND p.owner_id = (SELECT auth.uid())
        AND a.platform_approved = true
    )
  );

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  AS PERMISSIVE FOR SELECT
  USING (
    (id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  AS PERMISSIVE FOR UPDATE
  USING (
    (id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── visit_events ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "visit_events_delete_admin" ON public.visit_events;
CREATE POLICY "visit_events_delete_admin" ON public.visit_events
  AS PERMISSIVE FOR DELETE
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "visit_events_insert" ON public.visit_events;
CREATE POLICY "visit_events_insert" ON public.visit_events
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    (tenant_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "visit_events_select" ON public.visit_events;
CREATE POLICY "visit_events_select" ON public.visit_events
  AS PERMISSIVE FOR SELECT
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "visit_events_update_admin" ON public.visit_events;
CREATE POLICY "visit_events_update_admin" ON public.visit_events
  AS PERMISSIVE FOR UPDATE
  USING ((SELECT is_admin()));

-- ── visits ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "visits_delete_admin" ON public.visits;
CREATE POLICY "visits_delete_admin" ON public.visits
  AS PERMISSIVE FOR DELETE
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "visits_insert" ON public.visits;
CREATE POLICY "visits_insert" ON public.visits
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    (
      ((SELECT auth.uid()) IS NOT NULL)
      AND (tenant_id = (SELECT auth.uid()))
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "visits_select" ON public.visits;
CREATE POLICY "visits_select" ON public.visits
  AS PERMISSIVE FOR SELECT
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = visits.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
    OR (SELECT is_admin())
  );

DROP POLICY IF EXISTS "visits_update" ON public.visits;
CREATE POLICY "visits_update" ON public.visits
  AS PERMISSIVE FOR UPDATE
  USING (
    (tenant_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ── Verification ──────────────────────────────────────────────────────────────

-- 1. Zero unwrapped auth.uid() in USING (qual)
--    Expected: 0 rows
SELECT policyname, tablename, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%auth.uid()%'
  AND qual NOT LIKE '%(select auth.uid())%'
  AND qual NOT LIKE '%( SELECT auth.uid())%';

-- 2. Zero unwrapped auth.uid() in WITH CHECK
--    Expected: 0 rows
SELECT policyname, tablename, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND with_check LIKE '%auth.uid()%'
  AND with_check NOT LIKE '%(select auth.uid())%'
  AND with_check NOT LIKE '%( SELECT auth.uid())%';

-- 3. Zero unwrapped is_admin() in USING (excluding is_property_owner which is intentional)
--    Expected: 0 rows
SELECT policyname, tablename, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%is_admin()%'
  AND qual NOT LIKE '%(select is_admin())%'
  AND qual NOT LIKE '%( SELECT is_admin())%';

-- 4. Zero unwrapped is_admin() in WITH CHECK
--    Expected: 0 rows
SELECT policyname, tablename, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND with_check LIKE '%is_admin()%'
  AND with_check NOT LIKE '%(select is_admin())%'
  AND with_check NOT LIKE '%( SELECT is_admin())%';

-- 5. Dropped policies are gone — expected: 0 rows
SELECT policyname FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'payments_select_admin', 'payments_select_own',
    'app_notes_select_admin', 'app_notes_select_owner'
  );

-- 6. Spot-check: simple wrap
SELECT policyname, qual FROM pg_policies
WHERE schemaname = 'public' AND policyname = 'visit_events_select';
-- Expected USING: (tenant_id = ( SELECT auth.uid())) OR ( SELECT is_admin())

-- 7. Spot-check: EXISTS wrap
SELECT policyname, qual FROM pg_policies
WHERE schemaname = 'public' AND policyname = 'app_notes_select';
-- Expected: is_property_owner() NOT wrapped; auth.uid() and is_admin() ARE wrapped

-- 8. Policy count per table (informational)
SELECT tablename, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

COMMIT;
