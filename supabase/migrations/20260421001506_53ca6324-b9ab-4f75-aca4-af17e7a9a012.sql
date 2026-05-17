-- Add new auth fields to customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS platform_user_id UUID NOT NULL DEFAULT gen_random_uuid();

-- Ensure unique (store_id, email) — same email can exist in multiple stores, but only once per store
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_store_id_email_unique'
  ) THEN
    -- Drop any pre-existing global unique on email if present (safety)
    -- (no-op if not present)
    BEGIN
      ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_key;
    EXCEPTION WHEN others THEN NULL;
    END;

    ALTER TABLE public.customers
      ADD CONSTRAINT customers_store_id_email_unique UNIQUE (store_id, email);
  END IF;
END $$;

-- Index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_customers_password_reset_token 
  ON public.customers(password_reset_token) 
  WHERE password_reset_token IS NOT NULL;

-- Index for platform_user_id (internal analytics)
CREATE INDEX IF NOT EXISTS idx_customers_platform_user_id 
  ON public.customers(platform_user_id);

-- Index for store_id + email lookups (auth flow)
CREATE INDEX IF NOT EXISTS idx_customers_store_email 
  ON public.customers(store_id, email) 
  WHERE email IS NOT NULL;