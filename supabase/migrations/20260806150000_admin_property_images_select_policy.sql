-- Admin SELECT access to property_images.
--
-- Root cause: property_images had owner + public SELECT policies but no admin
-- SELECT policy. Admins (who are not the owner) therefore received zero image
-- rows for any property not in ('listed','edit_pending_review') + is_active,
-- i.e. draft / pending_review / changes_requested / unlisted / archived /
-- legacy statuses. The sibling properties table already grants is_admin() in
-- SELECT, so the property row loaded but its images did not.
--
-- Additive fix: Postgres OR-combines SELECT policies, so this preserves the
-- existing owner (owner_id = auth.uid()) and public (listed/edit_pending_review
-- + is_active) visibility unchanged. Reversible: DROP POLICY.

DROP POLICY IF EXISTS property_images_select_admin ON public.property_images;

CREATE POLICY property_images_select_admin
  ON public.property_images
  FOR SELECT
  USING (public.is_admin());
