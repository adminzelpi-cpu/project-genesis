
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_external_id text,
  ADD COLUMN IF NOT EXISTS refund_response jsonb;
