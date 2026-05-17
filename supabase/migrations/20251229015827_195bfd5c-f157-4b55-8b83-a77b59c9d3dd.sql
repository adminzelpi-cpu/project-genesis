-- Add preheader fields for abandoned cart emails
ALTER TABLE public.store_email_settings 
ADD COLUMN IF NOT EXISTS abandoned_cart_preheader_1 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS abandoned_cart_preheader_2 TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS abandoned_cart_preheader_3 TEXT DEFAULT NULL;

-- Update the RPC function to include new preheader fields
CREATE OR REPLACE FUNCTION public.get_store_email_settings(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', id,
    'store_id', store_id,
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
    'welcome_enabled', welcome_enabled,
    'tracking_code_enabled', tracking_code_enabled,
    'tracking_code_auto_send_enabled', tracking_code_auto_send_enabled,
    'refund_processed_enabled', refund_processed_enabled,
    'invoice_generated_enabled', invoice_generated_enabled,
    'abandoned_cart_enabled', abandoned_cart_enabled,
    'abandoned_cart_delay_1', abandoned_cart_delay_1,
    'abandoned_cart_delay_2', abandoned_cart_delay_2,
    'abandoned_cart_delay_3', abandoned_cart_delay_3,
    'abandoned_cart_subject_1', abandoned_cart_subject_1,
    'abandoned_cart_body_1', abandoned_cart_body_1,
    'abandoned_cart_enabled_1', abandoned_cart_enabled_1,
    'abandoned_cart_preheader_1', abandoned_cart_preheader_1,
    'abandoned_cart_subject_2', abandoned_cart_subject_2,
    'abandoned_cart_body_2', abandoned_cart_body_2,
    'abandoned_cart_enabled_2', abandoned_cart_enabled_2,
    'abandoned_cart_preheader_2', abandoned_cart_preheader_2,
    'abandoned_cart_subject_3', abandoned_cart_subject_3,
    'abandoned_cart_body_3', abandoned_cart_body_3,
    'abandoned_cart_enabled_3', abandoned_cart_enabled_3,
    'abandoned_cart_preheader_3', abandoned_cart_preheader_3,
    'sender_name', sender_name,
    'reply_to_email', reply_to_email
  ) INTO result
  FROM store_email_settings
  WHERE store_id = p_store_id;
  
  RETURN result;
END;
$$;