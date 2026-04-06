-- Create callback_requests table
-- Deliberately recreated with new schema (prior table was dropped in an earlier migration)

CREATE TABLE public.callback_requests (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES public.users(id),
  intent                text        NOT NULL CHECK (intent IN ('owner', 'tenant')),
  name                  varchar     NOT NULL,
  phone                 varchar,
  is_international      boolean     NOT NULL DEFAULT false,
  contact_channel       text        NOT NULL DEFAULT 'phone'
                                    CHECK (contact_channel IN ('phone', 'whatsapp', 'telegram', 'botim')),
  contact_handle        varchar,
  timezone              varchar,
  preferred_date        date        NOT NULL,
  preferred_slot        text        NOT NULL
                                    CHECK (preferred_slot IN (
                                      'asap', '09_10', '10_11', '11_12', '12_13', '13_14',
                                      '14_15', '15_16', '16_17', '17_18', '18_19', '19_20', '02_03'
                                    )),
  preferred_datetime_ist timestamptz,
  property_id           uuid        REFERENCES public.properties(id),
  status                text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'called', 'completed', 'missed', 'cancelled')),
  admin_notes           text,
  called_at             timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Phone is required for domestic requests
  CONSTRAINT phone_required_when_domestic CHECK (is_international = true OR phone IS NOT NULL)
);

-- Enable Row Level Security
ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated user: SELECT own rows
CREATE POLICY "callback_requests_select_own"
ON public.callback_requests
FOR SELECT
USING (user_id = auth.uid());

-- Authenticated user: INSERT own rows
CREATE POLICY "callback_requests_insert_own"
ON public.callback_requests
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Authenticated user: UPDATE own rows only while status is pending (cancel flow)
CREATE POLICY "callback_requests_update_own_pending"
ON public.callback_requests
FOR UPDATE
USING (user_id = auth.uid() AND status = 'pending');

-- Admin: SELECT all rows
CREATE POLICY "callback_requests_select_admin"
ON public.callback_requests
FOR SELECT
USING (is_admin());

-- Admin: UPDATE all rows
CREATE POLICY "callback_requests_update_admin"
ON public.callback_requests
FOR UPDATE
USING (is_admin());

-- Index for active-request lookups by user
CREATE INDEX idx_callback_requests_user_id_status
ON public.callback_requests (user_id, status);

-- Wire up existing updated_at trigger function
CREATE TRIGGER trg_callback_requests_updated_at
BEFORE UPDATE ON public.callback_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
