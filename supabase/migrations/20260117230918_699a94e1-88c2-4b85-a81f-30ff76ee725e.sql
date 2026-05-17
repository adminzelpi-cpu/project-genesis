-- Adicionar coluna para linkar customer com auth.users
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Adicionar flag para indicar que precisa definir senha
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS needs_password_setup BOOLEAN DEFAULT true;

-- Criar índice para busca por auth_user_id
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers(auth_user_id);

-- Criar índice para busca por email
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Adicionar configuração de email "set_password" na tabela store_email_settings
ALTER TABLE public.store_email_settings
ADD COLUMN IF NOT EXISTS set_password_enabled BOOLEAN DEFAULT true;