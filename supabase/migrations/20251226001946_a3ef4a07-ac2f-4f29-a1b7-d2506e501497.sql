-- Add auto-send tracking code toggle
ALTER TABLE public.store_email_settings 
ADD COLUMN IF NOT EXISTS tracking_code_auto_send_enabled BOOLEAN DEFAULT true;

-- Update the RPC function to include the new field
DROP FUNCTION IF EXISTS public.get_store_email_settings(uuid);

CREATE OR REPLACE FUNCTION public.get_store_email_settings(p_store_id uuid)
RETURNS json AS $$
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
    'invoice_generated_enabled', COALESCE(invoice_generated_enabled, true)
  ) INTO result
  FROM store_email_settings
  WHERE store_id = p_store_id;
  
  -- Return default settings if none exist
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
      'invoice_generated_enabled', true
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;