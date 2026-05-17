-- Tabela para configurações de gateway de pagamento por loja
CREATE TABLE public.store_payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  gateway_type TEXT NOT NULL CHECK (gateway_type IN ('mercado_pago', 'pagarme', 'manual')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_sandbox BOOLEAN NOT NULL DEFAULT true,
  
  -- Credenciais (armazenadas de forma segura)
  credentials JSONB DEFAULT '{}'::jsonb,
  
  -- OAuth tokens (Mercado Pago)
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at TIMESTAMP WITH TIME ZONE,
  oauth_user_id TEXT,
  
  -- Metadados
  display_name TEXT,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Apenas um gateway ativo por tipo por loja
  UNIQUE(store_id, gateway_type)
);

-- Tabela para transações de pagamento
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  gateway_type TEXT NOT NULL,
  
  -- Identificadores externos
  external_id TEXT,
  external_reference TEXT,
  
  -- Valores
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'cancelled', 'refunded')),
  status_detail TEXT,
  
  -- Método de pagamento
  payment_method TEXT,
  payment_type TEXT,
  installments INTEGER DEFAULT 1,
  
  -- Dados adicionais
  payer_email TEXT,
  payer_document TEXT,
  
  -- PIX/Boleto específicos
  qr_code TEXT,
  qr_code_base64 TEXT,
  barcode TEXT,
  barcode_url TEXT,
  expiration_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadados do gateway
  gateway_response JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_store_payment_gateways_store ON public.store_payment_gateways(store_id);
CREATE INDEX idx_store_payment_gateways_active ON public.store_payment_gateways(store_id, is_active) WHERE is_active = true;
CREATE INDEX idx_payment_transactions_order ON public.payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_store ON public.payment_transactions(store_id);
CREATE INDEX idx_payment_transactions_external ON public.payment_transactions(external_id);

-- Enable RLS
ALTER TABLE public.store_payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para store_payment_gateways
CREATE POLICY "Merchants can view their store payment gateways"
  ON public.store_payment_gateways FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = store_payment_gateways.store_id 
    AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))
  ));

CREATE POLICY "Merchants can manage their store payment gateways"
  ON public.store_payment_gateways FOR ALL
  USING (EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = store_payment_gateways.store_id 
    AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))
  ));

-- RLS Policies para payment_transactions
CREATE POLICY "Merchants can view their store transactions"
  ON public.payment_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = payment_transactions.store_id 
    AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))
  ));

CREATE POLICY "System can create transactions"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update transactions"
  ON public.payment_transactions FOR UPDATE
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_store_payment_gateways_updated_at
  BEFORE UPDATE ON public.store_payment_gateways
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();