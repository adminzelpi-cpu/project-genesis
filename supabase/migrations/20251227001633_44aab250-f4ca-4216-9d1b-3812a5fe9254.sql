-- Create abandoned_carts table
CREATE TABLE public.abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  cart_items JSONB NOT NULL DEFAULT '[]',
  cart_total NUMERIC NOT NULL DEFAULT 0,
  abandoned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recovery_token UUID NOT NULL DEFAULT gen_random_uuid(),
  emails_sent INTEGER NOT NULL DEFAULT 0,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  recovered_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - store owners can manage their abandoned carts
CREATE POLICY "Store owners can view abandoned carts"
  ON public.abandoned_carts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = abandoned_carts.store_id
      AND stores.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can update abandoned carts"
  ON public.abandoned_carts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = abandoned_carts.store_id
      AND stores.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert abandoned carts"
  ON public.abandoned_carts FOR INSERT
  WITH CHECK (true);

-- Add abandoned cart email settings to store_email_settings
ALTER TABLE public.store_email_settings 
ADD COLUMN IF NOT EXISTS abandoned_cart_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS abandoned_cart_delay_1 INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS abandoned_cart_delay_2 INTEGER DEFAULT 1440,
ADD COLUMN IF NOT EXISTS abandoned_cart_delay_3 INTEGER DEFAULT 4320;

-- Update the get_store_email_settings function to include abandoned cart settings
CREATE OR REPLACE FUNCTION public.get_store_email_settings(p_store_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'sender_name', COALESCE(sender_name, ''),
    'reply_to_email', COALESCE(reply_to_email, ''),
    'order_confirmed_enabled', order_confirmed_enabled,
    'order_preparing_enabled', order_preparing_enabled,
    'order_shipped_enabled', order_shipped_enabled,
    'order_delivered_enabled', order_delivered_enabled,
    'order_cancelled_enabled', order_cancelled_enabled,
    'payment_confirmed_enabled', payment_confirmed_enabled,
    'payment_failed_enabled', payment_failed_enabled,
    'boleto_generated_enabled', boleto_generated_enabled,
    'pix_generated_enabled', pix_generated_enabled,
    'pix_expired_enabled', pix_expired_enabled,
    'welcome_enabled', COALESCE(welcome_enabled, true),
    'tracking_code_enabled', COALESCE(tracking_code_enabled, true),
    'tracking_code_auto_send_enabled', COALESCE(tracking_code_auto_send_enabled, true),
    'refund_processed_enabled', COALESCE(refund_processed_enabled, true),
    'invoice_generated_enabled', COALESCE(invoice_generated_enabled, true),
    'abandoned_cart_enabled', COALESCE(abandoned_cart_enabled, true),
    'abandoned_cart_delay_1', COALESCE(abandoned_cart_delay_1, 60),
    'abandoned_cart_delay_2', COALESCE(abandoned_cart_delay_2, 1440),
    'abandoned_cart_delay_3', COALESCE(abandoned_cart_delay_3, 4320)
  ) INTO result
  FROM store_email_settings
  WHERE store_id = p_store_id;
  
  IF result IS NULL THEN
    result := json_build_object(
      'sender_name', '',
      'reply_to_email', '',
      'order_confirmed_enabled', true,
      'order_preparing_enabled', true,
      'order_shipped_enabled', true,
      'order_delivered_enabled', true,
      'order_cancelled_enabled', true,
      'payment_confirmed_enabled', true,
      'payment_failed_enabled', true,
      'boleto_generated_enabled', true,
      'pix_generated_enabled', true,
      'pix_expired_enabled', true,
      'welcome_enabled', true,
      'tracking_code_enabled', true,
      'tracking_code_auto_send_enabled', true,
      'refund_processed_enabled', true,
      'invoice_generated_enabled', true,
      'abandoned_cart_enabled', true,
      'abandoned_cart_delay_1', 60,
      'abandoned_cart_delay_2', 1440,
      'abandoned_cart_delay_3', 4320
    );
  END IF;
  
  RETURN result;
END;
$function$;

-- Create index for faster queries
CREATE INDEX idx_abandoned_carts_store_id ON public.abandoned_carts(store_id);
CREATE INDEX idx_abandoned_carts_recovery ON public.abandoned_carts(recovery_token);
CREATE INDEX idx_abandoned_carts_pending ON public.abandoned_carts(store_id, emails_sent, recovered_at) 
  WHERE recovered_at IS NULL;