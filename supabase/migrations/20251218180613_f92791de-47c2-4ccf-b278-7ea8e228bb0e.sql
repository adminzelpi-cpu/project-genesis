-- Add additional store settings columns
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS document TEXT, -- CNPJ or CPF
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'cpf', -- 'cpf' or 'cnpj'
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zip TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT,
ADD COLUMN IF NOT EXISTS default_shipping_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS order_prefix TEXT DEFAULT 'PED',
ADD COLUMN IF NOT EXISTS terms_url TEXT,
ADD COLUMN IF NOT EXISTS privacy_url TEXT,
ADD COLUMN IF NOT EXISTS return_policy_url TEXT;

-- Add comments
COMMENT ON COLUMN public.stores.document IS 'CNPJ or CPF number';
COMMENT ON COLUMN public.stores.document_type IS 'cpf or cnpj';
COMMENT ON COLUMN public.stores.free_shipping_threshold IS 'Minimum order value for free shipping';