-- Create store_email_templates table for customizable email content
CREATE TABLE public.store_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  body TEXT,
  include_order_summary BOOLEAN NOT NULL DEFAULT true,
  cta_text TEXT,
  cta_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one template per email type per store
  UNIQUE(store_id, email_type)
);

-- Create index for faster lookups
CREATE INDEX idx_store_email_templates_store_id ON public.store_email_templates(store_id);
CREATE INDEX idx_store_email_templates_email_type ON public.store_email_templates(email_type);

-- Enable RLS
ALTER TABLE public.store_email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Merchants can view their store email templates"
ON public.store_email_templates
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM stores s
  WHERE s.id = store_email_templates.store_id
  AND s.merchant_id = auth.uid()
));

CREATE POLICY "Merchants can insert their store email templates"
ON public.store_email_templates
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM stores s
  WHERE s.id = store_email_templates.store_id
  AND s.merchant_id = auth.uid()
));

CREATE POLICY "Merchants can update their store email templates"
ON public.store_email_templates
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM stores s
  WHERE s.id = store_email_templates.store_id
  AND s.merchant_id = auth.uid()
));

CREATE POLICY "Merchants can delete their store email templates"
ON public.store_email_templates
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM stores s
  WHERE s.id = store_email_templates.store_id
  AND s.merchant_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_store_email_templates_updated_at
BEFORE UPDATE ON public.store_email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update get_store_email_settings function to include templates
CREATE OR REPLACE FUNCTION public.get_store_email_settings(p_store_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  store_record RECORD;
  settings_record RECORD;
  templates_json JSON;
BEGIN
  -- Get store info
  SELECT name, logo_url INTO store_record
  FROM stores
  WHERE id = p_store_id;

  -- Get email settings
  SELECT * INTO settings_record
  FROM store_email_settings
  WHERE store_id = p_store_id;

  -- Get email templates
  SELECT json_object_agg(
    email_type,
    json_build_object(
      'subject', subject,
      'preheader', preheader,
      'body', body,
      'include_order_summary', include_order_summary,
      'cta_text', cta_text,
      'cta_url', cta_url
    )
  ) INTO templates_json
  FROM store_email_templates
  WHERE store_id = p_store_id;

  -- Build result
  result := json_build_object(
    'store_name', store_record.name,
    'store_logo', store_record.logo_url,
    'sender_name', COALESCE(settings_record.sender_name, store_record.name),
    'reply_to_email', settings_record.reply_to_email,
    'order_confirmed_enabled', COALESCE(settings_record.order_confirmed_enabled, true),
    'order_preparing_enabled', COALESCE(settings_record.order_preparing_enabled, true),
    'order_shipped_enabled', COALESCE(settings_record.order_shipped_enabled, true),
    'order_delivered_enabled', COALESCE(settings_record.order_delivered_enabled, true),
    'order_cancelled_enabled', COALESCE(settings_record.order_cancelled_enabled, true),
    'payment_confirmed_enabled', COALESCE(settings_record.payment_confirmed_enabled, true),
    'payment_failed_enabled', COALESCE(settings_record.payment_failed_enabled, true),
    'boleto_generated_enabled', COALESCE(settings_record.boleto_generated_enabled, true),
    'pix_generated_enabled', COALESCE(settings_record.pix_generated_enabled, true),
    'pix_expired_enabled', COALESCE(settings_record.pix_expired_enabled, true),
    'welcome_enabled', COALESCE(settings_record.welcome_enabled, true),
    'tracking_code_enabled', COALESCE(settings_record.tracking_code_enabled, true),
    'refund_processed_enabled', COALESCE(settings_record.refund_processed_enabled, true),
    'invoice_generated_enabled', COALESCE(settings_record.invoice_generated_enabled, true),
    'templates', COALESCE(templates_json, '{}'::json)
  );

  RETURN result;
END;
$$;