ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS magic_link_token text,
  ADD COLUMN IF NOT EXISTS magic_link_token_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_customers_magic_link_token
  ON public.customers (magic_link_token)
  WHERE magic_link_token IS NOT NULL;