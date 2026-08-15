-- =====================================================================================
-- Corrective — drop the obsolete "n8n-properties" database webhook on public.properties
--
-- supabase_functions.http_request() (SECURITY DEFINER, owner supabase_functions_admin) builds
-- jsonb_build_object('record', NEW, ...) for POST. Since properties gained a geom_exact
-- geometry column (PostGIS in the `extensions` schema, Phase 1 Prompt 1), serializing that
-- geometry emits GeoJSON, which reads extensions.spatial_ref_sys. supabase_functions_admin
-- has SELECT on spatial_ref_sys but NOT USAGE on schema extensions, so EVERY insert/update on a
-- property with a non-null geom_exact failed (including apply_property_location and any owner/
-- admin edit). The "n8n-properties" webhook is obsolete and no active application flow depends
-- on it, so drop ONLY this trigger. Do NOT broaden extensions grants merely to keep it alive.
-- Do NOT touch property_activity_log_writer_trigger or any other property trigger.
-- =====================================================================================

DROP TRIGGER IF EXISTS "n8n-properties" ON public.properties;
