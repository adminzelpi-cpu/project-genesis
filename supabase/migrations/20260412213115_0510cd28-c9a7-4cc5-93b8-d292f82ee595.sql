
CREATE TABLE public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  email_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  send_after TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  cancel_if_payment_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  cancelled_reason TEXT
);

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage scheduled_emails"
  ON public.scheduled_emails
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Store owners can view their scheduled emails"
  ON public.scheduled_emails
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid())
  );

CREATE INDEX idx_scheduled_emails_pending ON public.scheduled_emails (status, send_after) WHERE status = 'pending';
