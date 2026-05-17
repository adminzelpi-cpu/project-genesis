
-- Add password_setup_token to customers for secure password setup
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS password_setup_token TEXT,
ADD COLUMN IF NOT EXISTS password_setup_token_expires_at TIMESTAMPTZ;

-- Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_customers_password_setup_token 
ON public.customers(password_setup_token) 
WHERE password_setup_token IS NOT NULL;
