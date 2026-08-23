-- Group 5: optimize RLS auth.uid() InitPlan evaluation.
--
-- 42 policies across 21 tables contain bare auth.uid() calls that PostgreSQL
-- re-evaluates for every row. Wrapping as (SELECT auth.uid()) forces a single
-- InitPlan evaluation per statement. All rewrites are security-equivalent —
-- auth.uid() is constant within any statement and its NULL behavior is unchanged.
--
-- Mechanism: ALTER POLICY only. No DROP/CREATE. No authorization logic changes.
-- No is_admin() optimization (Group 6). No schema/index/function changes.
-- Resolves all 42 auth_rls_initplan advisor warnings.

-- ── A: Users / Profiles ───────────────────────────────────────────────────────

ALTER POLICY profiles_insert_own ON public.profiles
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY profiles_select_own ON public.profiles
  USING ((user_id = (SELECT auth.uid())) OR is_admin());

ALTER POLICY profiles_update_own ON public.profiles
  USING ((user_id = (SELECT auth.uid())) OR is_admin())
  WITH CHECK ((user_id = (SELECT auth.uid())) OR is_admin());

ALTER POLICY users_insert_own ON public.users
  WITH CHECK (id = (SELECT auth.uid()));

ALTER POLICY users_select_own ON public.users
  USING ((id = (SELECT auth.uid())) OR is_admin());

ALTER POLICY users_update_own ON public.users
  USING ((id = (SELECT auth.uid())) OR is_admin())
  WITH CHECK ((id = (SELECT auth.uid())) OR is_admin());

-- ── B: Core Property ──────────────────────────────────────────────────────────

ALTER POLICY properties_insert ON public.properties
  WITH CHECK (((SELECT auth.uid()) IS NOT NULL) AND (owner_id = (SELECT auth.uid())));

ALTER POLICY properties_update ON public.properties
  USING ((owner_id = (SELECT auth.uid())) OR is_admin())
  WITH CHECK ((owner_id = (SELECT auth.uid())) OR is_admin());

ALTER POLICY property_images_insert ON public.property_images
  WITH CHECK (is_admin() OR (EXISTS (
    SELECT 1 FROM properties
    WHERE (properties.id = property_images.property_id)
      AND (properties.owner_id = (SELECT auth.uid())))));

ALTER POLICY property_images_update ON public.property_images
  USING (is_admin() OR (EXISTS (
    SELECT 1 FROM properties
    WHERE (properties.id = property_images.property_id)
      AND (properties.owner_id = (SELECT auth.uid())))));

ALTER POLICY property_images_delete ON public.property_images
  USING (is_admin() OR (EXISTS (
    SELECT 1 FROM properties
    WHERE (properties.id = property_images.property_id)
      AND (properties.owner_id = (SELECT auth.uid())))));

ALTER POLICY property_geo_assoc_select_owner ON public.property_geo_associations
  USING (EXISTS (
    SELECT 1 FROM properties p
    WHERE (p.id = property_geo_associations.property_id)
      AND (p.owner_id = (SELECT auth.uid()))));

-- ── C: Favourites / Preferences ───────────────────────────────────────────────

ALTER POLICY favourites_select ON public.favourites
  USING ((user_id = (SELECT auth.uid())) OR is_admin());

ALTER POLICY favourites_insert ON public.favourites
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY favourites_delete ON public.favourites
  USING ((user_id = (SELECT auth.uid())) OR is_admin());

ALTER POLICY rental_preferences_select_own ON public.rental_preferences
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY rental_preferences_insert_own ON public.rental_preferences
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY rental_preferences_update_own ON public.rental_preferences
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY slp_select_own ON public.search_location_preferences
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY slp_insert_own ON public.search_location_preferences
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY slp_update_own ON public.search_location_preferences
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ── D: Geo / Search ───────────────────────────────────────────────────────────

ALTER POLICY geo_places_select ON public.geo_places
  USING ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY geo_provider_refs_select ON public.geo_provider_refs
  USING ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY geo_place_aliases_select ON public.geo_place_aliases
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ── E: Comments / Reactions ───────────────────────────────────────────────────

ALTER POLICY comments_update_own_delete ON public.property_comments
  USING (((SELECT auth.uid()) = user_id) OR ( SELECT is_admin() AS is_admin))
  WITH CHECK ((((SELECT auth.uid()) = user_id) AND (is_deleted = true)) OR ( SELECT is_admin() AS is_admin));

ALTER POLICY likes_delete_own ON public.comment_likes
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY likes_insert_verified ON public.comment_likes
  WITH CHECK (((SELECT auth.uid()) = user_id) AND (
    SELECT (users.phone_verified AND users.email_verified)
    FROM users WHERE (users.id = (SELECT auth.uid()))));

ALTER POLICY reports_select ON public.comment_reports
  USING ((reporter_id = (SELECT auth.uid())) OR ( SELECT is_admin() AS is_admin));

ALTER POLICY reports_insert_verified ON public.comment_reports
  WITH CHECK (((SELECT auth.uid()) = reporter_id) AND (
    SELECT (users.phone_verified AND users.email_verified)
    FROM users WHERE (users.id = (SELECT auth.uid()))));

-- ── F: Callbacks / Inspection Callbacks ───────────────────────────────────────

ALTER POLICY inspection_callbacks_select ON public.inspection_callbacks
  USING ((owner_id = (SELECT auth.uid())) OR is_admin());

ALTER POLICY inspection_callbacks_insert ON public.inspection_callbacks
  WITH CHECK (owner_id = (SELECT auth.uid()));

ALTER POLICY inspection_callbacks_update ON public.inspection_callbacks
  USING ((owner_id = (SELECT auth.uid())) OR is_admin());

ALTER POLICY callback_requests_select_own ON public.callback_requests
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY callback_requests_insert_own ON public.callback_requests
  WITH CHECK (((SELECT auth.uid()) IS NOT NULL) AND (user_id = (SELECT auth.uid())));

ALTER POLICY callback_requests_update_own_pending ON public.callback_requests
  USING ((user_id = (SELECT auth.uid())) AND (status = 'pending'::text));

-- ── G: Analytics ──────────────────────────────────────────────────────────────

ALTER POLICY views_select_owner_admin ON public.property_views
  USING ((( SELECT properties.owner_id FROM properties
    WHERE (properties.id = property_views.property_id)) = (SELECT auth.uid()))
    OR ( SELECT is_admin() AS is_admin));

-- ── H: Ratings ────────────────────────────────────────────────────────────────

ALTER POLICY ratings_select_participants ON public.interaction_ratings
  USING ((owner_id = (SELECT auth.uid())) OR (tenant_id = (SELECT auth.uid())) OR
    ( SELECT is_admin() AS is_admin));

ALTER POLICY ratings_update_owner ON public.interaction_ratings
  USING ((((SELECT auth.uid()) = owner_id) AND (o_submitted_at IS NULL)) OR
    ( SELECT is_admin() AS is_admin))
  WITH CHECK ((owner_id = (SELECT auth.uid())) OR ( SELECT is_admin() AS is_admin));

ALTER POLICY ratings_update_tenant ON public.interaction_ratings
  USING ((((SELECT auth.uid()) = tenant_id) AND (t_submitted_at IS NULL)) OR
    ( SELECT is_admin() AS is_admin))
  WITH CHECK ((tenant_id = (SELECT auth.uid())) OR ( SELECT is_admin() AS is_admin));

-- ── I: Inspection Operations ──────────────────────────────────────────────────

ALTER POLICY "Admin/ops full access on property_inspections" ON public.property_inspections
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE ((users.id = (SELECT auth.uid())) AND
      (users.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role,
        'ops'::user_role, 'field_team'::user_role])))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE ((users.id = (SELECT auth.uid())) AND
      (users.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role,
        'ops'::user_role, 'field_team'::user_role])))));

ALTER POLICY "Admin/ops full access on inspection_rooms" ON public.inspection_rooms
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE ((users.id = (SELECT auth.uid())) AND
      (users.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role,
        'ops'::user_role, 'field_team'::user_role])))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE ((users.id = (SELECT auth.uid())) AND
      (users.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role,
        'ops'::user_role, 'field_team'::user_role])))));

ALTER POLICY "Admin/ops full access on inspection_appliances" ON public.inspection_appliances
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE ((users.id = (SELECT auth.uid())) AND
      (users.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role,
        'ops'::user_role, 'field_team'::user_role])))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE ((users.id = (SELECT auth.uid())) AND
      (users.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role,
        'ops'::user_role, 'field_team'::user_role])))));
