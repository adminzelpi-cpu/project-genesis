-- Add accepted payment methods to gateway config (all enabled by default)
ALTER TABLE public.store_payment_gateways
  ADD COLUMN IF NOT EXISTS accept_credit_card boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accept_pix boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accept_boleto boolean NOT NULL DEFAULT true;