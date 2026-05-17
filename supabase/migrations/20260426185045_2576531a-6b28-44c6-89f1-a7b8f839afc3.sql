ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS purchase_event_id UUID,
  ADD COLUMN IF NOT EXISTS purchase_event_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_purchase_event_sent_at
  ON public.orders(purchase_event_sent_at)
  WHERE purchase_event_sent_at IS NULL;