
-- ============================================
-- Orchestration: Email → WhatsApp cascade
-- ============================================
CREATE TABLE public.whatsapp_orchestration_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- abandoned_cart, pix_generated, boleto_generated, post_purchase, welcome
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  template_name TEXT NOT NULL, -- whatsapp template to use
  template_variables JSONB NOT NULL DEFAULT '{}',
  
  -- Orchestration state
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  email_clicked_at TIMESTAMPTZ,
  whatsapp_send_after TIMESTAMPTZ, -- when to send WhatsApp if email not engaged
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_status TEXT DEFAULT 'waiting', -- waiting, email_engaged, whatsapp_sent, cancelled, expired
  
  -- References
  order_id UUID,
  abandoned_cart_id UUID,
  email_log_id UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_orchestration_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their orchestration queue"
  ON public.whatsapp_orchestration_queue FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_orchestration_queue.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_orchestration_queue.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

CREATE INDEX idx_orchestration_queue_pending ON public.whatsapp_orchestration_queue(whatsapp_status, whatsapp_send_after) WHERE whatsapp_status = 'waiting';
CREATE INDEX idx_orchestration_queue_store ON public.whatsapp_orchestration_queue(store_id, trigger_type);

CREATE TRIGGER update_orchestration_queue_updated_at 
  BEFORE UPDATE ON public.whatsapp_orchestration_queue 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
