-- Group 6B: add missing index on favourites.property_id.
--
-- FK: favourites_property_id_fkey (property_id → properties.id, ON DELETE CASCADE)
--
-- The existing indexes on favourites are:
--   favourites_pkey              (id)
--   idx_favourites_user_id       (user_id)
--   uq_favourites_user_property  (user_id, property_id)  ← user_id is leading column
--
-- None efficiently cover lookups where property_id is the sole/leading condition:
--   - ON DELETE CASCADE from properties needs to locate all favourites by property_id
--   - Property-centric queries (who favourited this property?) scan by property_id
--   - uq_favourites_user_property cannot be used for property_id-only seeks
--
-- Table is 56 kB; plain CREATE INDEX is appropriate (transactional, instant).
-- Resolves the favourites_property_id_fkey unindexed_foreign_keys advisor finding.
-- All other 14 unindexed FK findings remain DEFERRED.

CREATE INDEX idx_favourites_property_id
ON public.favourites(property_id);
