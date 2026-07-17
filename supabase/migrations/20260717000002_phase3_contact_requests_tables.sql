-- Phase 3 Prompt 1 — contact_requests + email_send_log tables.
-- Applied via Supabase MCP on 2026-07-17; documentation only.

CREATE TABLE IF NOT EXISTS public.contact_requests (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id               uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id                 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_id                  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status                    public.contact_request_status NOT NULL DEFAULT 'pending',
  attempt_number            integer NOT NULL DEFAULT 1 CHECK (attempt_number BETWEEN 1 AND 3),
  decline_reason            public.contact_request_decline_reason,
  tenant_message            text CHECK (tenant_message IS NULL OR char_length(tenant_message) <= 200),
  tenant_profile_snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_checked_at        timestamptz NOT NULL DEFAULT now(),
  consent_terms_version     integer NOT NULL DEFAULT 1,
  withdrawn_at              timestamptz,
  auto_cancelled_at         timestamptz,
  declined_at               timestamptz,
  approved_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_one_active_per_property
  ON public.contact_requests (tenant_id, property_id)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_contact_requests_property_id ON public.contact_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_tenant_id   ON public.contact_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_owner_id    ON public.contact_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status      ON public.contact_requests(status);

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_request_id    uuid REFERENCES public.contact_requests(id) ON DELETE CASCADE,
  resend_message_id     text,
  event_type            text NOT NULL,      -- 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed' | ...
  recipient_user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_email       text,
  error_reason          text,
  raw_payload           jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_log_contact_request_id ON public.email_send_log(contact_request_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_resend_message_id  ON public.email_send_log(resend_message_id);
