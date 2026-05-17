-- Tabela para configurações de e-mail por loja
CREATE TABLE public.store_email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- E-mails de pedido
  order_confirmed_enabled BOOLEAN NOT NULL DEFAULT true,
  order_preparing_enabled BOOLEAN NOT NULL DEFAULT true,
  order_shipped_enabled BOOLEAN NOT NULL DEFAULT true,
  order_delivered_enabled BOOLEAN NOT NULL DEFAULT true,
  order_cancelled_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- E-mails de pagamento
  payment_confirmed_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_failed_enabled BOOLEAN NOT NULL DEFAULT true,
  boleto_generated_enabled BOOLEAN NOT NULL DEFAULT true,
  pix_generated_enabled BOOLEAN NOT NULL DEFAULT true,
  pix_expired_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Configurações gerais
  sender_name VARCHAR(100) DEFAULT NULL,
  reply_to_email VARCHAR(255) DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT store_email_settings_store_unique UNIQUE(store_id)
);

-- Enable RLS
ALTER TABLE public.store_email_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: lojistas podem gerenciar suas próprias configurações
CREATE POLICY "Merchants can view their store email settings"
  ON public.store_email_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_id AND s.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can insert their store email settings"
  ON public.store_email_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_id AND s.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Merchants can update their store email settings"
  ON public.store_email_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_id AND s.merchant_id = auth.uid()
    )
  );

-- Tabela para log de e-mails enviados (útil para debug e histórico)
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  resend_id VARCHAR(100),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: lojistas podem ver logs de suas lojas
CREATE POLICY "Merchants can view their store email logs"
  ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s 
      WHERE s.id = store_id AND s.merchant_id = auth.uid()
    )
  );

-- Index para buscas comuns
CREATE INDEX idx_email_logs_store_id ON public.email_logs(store_id);
CREATE INDEX idx_email_logs_order_id ON public.email_logs(order_id);
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);

-- Trigger para updated_at
CREATE TRIGGER update_store_email_settings_updated_at
  BEFORE UPDATE ON public.store_email_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função RPC para edge function inserir logs (bypassando RLS)
CREATE OR REPLACE FUNCTION public.insert_email_log(
  p_store_id UUID,
  p_order_id UUID,
  p_email_type VARCHAR,
  p_recipient_email VARCHAR,
  p_recipient_name VARCHAR,
  p_subject VARCHAR,
  p_status VARCHAR,
  p_resend_id VARCHAR DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.email_logs (
    store_id, order_id, email_type, recipient_email, 
    recipient_name, subject, status, resend_id, error_message, sent_at
  )
  VALUES (
    p_store_id, p_order_id, p_email_type, p_recipient_email,
    p_recipient_name, p_subject, p_status, p_resend_id, p_error_message,
    CASE WHEN p_status = 'sent' THEN now() ELSE NULL END
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Função RPC para buscar configurações de e-mail (para edge function)
CREATE OR REPLACE FUNCTION public.get_store_email_settings(p_store_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'order_confirmed_enabled', COALESCE(s.order_confirmed_enabled, true),
    'order_preparing_enabled', COALESCE(s.order_preparing_enabled, true),
    'order_shipped_enabled', COALESCE(s.order_shipped_enabled, true),
    'order_delivered_enabled', COALESCE(s.order_delivered_enabled, true),
    'order_cancelled_enabled', COALESCE(s.order_cancelled_enabled, true),
    'payment_confirmed_enabled', COALESCE(s.payment_confirmed_enabled, true),
    'payment_failed_enabled', COALESCE(s.payment_failed_enabled, true),
    'boleto_generated_enabled', COALESCE(s.boleto_generated_enabled, true),
    'pix_generated_enabled', COALESCE(s.pix_generated_enabled, true),
    'pix_expired_enabled', COALESCE(s.pix_expired_enabled, true),
    'sender_name', COALESCE(s.sender_name, st.name),
    'reply_to_email', COALESCE(s.reply_to_email, st.email),
    'store_name', st.name,
    'store_logo', st.logo_url
  )
  INTO result
  FROM public.stores st
  LEFT JOIN public.store_email_settings s ON s.store_id = st.id
  WHERE st.id = p_store_id;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_email_log TO public;
GRANT EXECUTE ON FUNCTION public.get_store_email_settings TO public;