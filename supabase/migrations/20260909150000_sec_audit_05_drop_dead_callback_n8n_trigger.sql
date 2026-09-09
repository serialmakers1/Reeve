-- SEC-AUDIT-05 (part 1/3) — Remove the dead, unauthenticated callback -> n8n egress.
--
-- ROOT CAUSE (confirmed against live state + live n8n, read-only)
--   Trigger "n8n-callbacks" fired AFTER INSERT OR UPDATE on public.callback_requests and
--   POSTed the full row to https://n8n.reeve.in/webhook/callbacks via
--   supabase_functions.http_request(), sending only a Content-type header (no Authorization,
--   no shared secret, no signature). The connected n8n instance has NO workflow registered on
--   /webhook/callbacks (the three real webhook workflows are /contact-reveal,
--   /contact-resend-reveal, /property-service-enquiry, all headerAuth). The trigger therefore
--   produced only dead HTTP egress / 404s, and was a latent unauthenticated-forgery surface if
--   a consumer were ever added without matching auth. The product decision (SEC-AUDIT-05) is to
--   REMOVE the dead egress and NOT revive any n8n callback workflow.
--
-- SCOPE — narrowest possible
--   Drops ONLY the "n8n-callbacks" trigger. Leaves trg_callback_requests_updated_at,
--   supabase_functions.http_request, pg_net, all other Database Webhooks, and every n8n
--   workflow untouched. No CASCADE.
--
-- IF EXISTS is defensive/idempotent (object verified present in live DB at authoring time).

DROP TRIGGER IF EXISTS "n8n-callbacks" ON public.callback_requests;

-- Fail loudly if the drop did not take effect.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.callback_requests'::regclass
      AND tgname = 'n8n-callbacks'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'SEC-AUDIT-05: n8n-callbacks trigger still present after DROP';
  END IF;

  -- The updated_at trigger MUST remain.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.callback_requests'::regclass
      AND tgname = 'trg_callback_requests_updated_at'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'SEC-AUDIT-05: trg_callback_requests_updated_at unexpectedly missing';
  END IF;
END $$;
