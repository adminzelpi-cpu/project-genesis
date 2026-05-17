-- Add new email type columns to store_email_settings
ALTER TABLE public.store_email_settings
ADD COLUMN IF NOT EXISTS welcome_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS tracking_code_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS refund_processed_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_generated_enabled boolean DEFAULT true;

-- Drop and recreate the RPC function with new fields
DROP FUNCTION IF EXISTS public.get_store_email_settings(uuid);

CREATE FUNCTION public.get_store_email_settings(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  store_name text;
  store_logo text;
BEGIN
  -- Get store info
  SELECT s.name, s.logo_url INTO store_name, store_logo
  FROM stores s
  WHERE s.id = p_store_id;

  -- Get email settings or return defaults
  SELECT json_build_object(
    'order_confirmed_enabled', COALESCE(ses.order_confirmed_enabled, true),
    'order_preparing_enabled', COALESCE(ses.order_preparing_enabled, true),
    'order_shipped_enabled', COALESCE(ses.order_shipped_enabled, true),
    'order_delivered_enabled', COALESCE(ses.order_delivered_enabled, true),
    'order_cancelled_enabled', COALESCE(ses.order_cancelled_enabled, true),
    'payment_confirmed_enabled', COALESCE(ses.payment_confirmed_enabled, true),
    'payment_failed_enabled', COALESCE(ses.payment_failed_enabled, true),
    'boleto_generated_enabled', COALESCE(ses.boleto_generated_enabled, true),
    'pix_generated_enabled', COALESCE(ses.pix_generated_enabled, true),
    'pix_expired_enabled', COALESCE(ses.pix_expired_enabled, true),
    'welcome_enabled', COALESCE(ses.welcome_enabled, true),
    'tracking_code_enabled', COALESCE(ses.tracking_code_enabled, true),
    'refund_processed_enabled', COALESCE(ses.refund_processed_enabled, true),
    'invoice_generated_enabled', COALESCE(ses.invoice_generated_enabled, true),
    'sender_name', ses.sender_name,
    'reply_to_email', ses.reply_to_email,
    'store_name', store_name,
    'store_logo', store_logo
  ) INTO result
  FROM stores s
  LEFT JOIN store_email_settings ses ON ses.store_id = s.id
  WHERE s.id = p_store_id;

  RETURN COALESCE(result, json_build_object(
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
    'refund_processed_enabled', true,
    'invoice_generated_enabled', true,
    'sender_name', null,
    'reply_to_email', null,
    'store_name', store_name,
    'store_logo', store_logo
  ));
END;
$$;