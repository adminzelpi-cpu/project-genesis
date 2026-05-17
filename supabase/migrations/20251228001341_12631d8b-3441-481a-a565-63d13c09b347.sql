-- Add columns to store email templates for abandoned cart
ALTER TABLE public.store_email_settings
ADD COLUMN IF NOT EXISTS abandoned_cart_subject_1 text DEFAULT 'Você esqueceu algo no carrinho!',
ADD COLUMN IF NOT EXISTS abandoned_cart_body_1 text DEFAULT 'Olá {{customer_name}}, notamos que você deixou alguns itens no seu carrinho. Que tal finalizar sua compra?',
ADD COLUMN IF NOT EXISTS abandoned_cart_enabled_1 boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS abandoned_cart_subject_2 text DEFAULT 'Seus produtos ainda estão esperando por você',
ADD COLUMN IF NOT EXISTS abandoned_cart_body_2 text DEFAULT 'Ei {{customer_name}}, os itens do seu carrinho ainda estão disponíveis. Não perca essa oportunidade!',
ADD COLUMN IF NOT EXISTS abandoned_cart_enabled_2 boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS abandoned_cart_subject_3 text DEFAULT 'Última chance! Seu carrinho vai expirar',
ADD COLUMN IF NOT EXISTS abandoned_cart_body_3 text DEFAULT '{{customer_name}}, esta é sua última chance de garantir os produtos do seu carrinho antes que eles se esgotem.',
ADD COLUMN IF NOT EXISTS abandoned_cart_enabled_3 boolean DEFAULT true;

-- Update the function to include new fields
CREATE OR REPLACE FUNCTION public.get_store_email_settings(p_store_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT row_to_json(t)
  INTO result
  FROM (
    SELECT 
      id,
      store_id,
      sender_name,
      reply_to_email,
      order_confirmed_enabled,
      payment_confirmed_enabled,
      payment_failed_enabled,
      order_preparing_enabled,
      order_shipped_enabled,
      order_delivered_enabled,
      order_cancelled_enabled,
      pix_generated_enabled,
      pix_expired_enabled,
      boleto_generated_enabled,
      tracking_code_enabled,
      tracking_code_auto_send_enabled,
      invoice_generated_enabled,
      refund_processed_enabled,
      welcome_enabled,
      abandoned_cart_enabled,
      abandoned_cart_delay_1,
      abandoned_cart_delay_2,
      abandoned_cart_delay_3,
      abandoned_cart_subject_1,
      abandoned_cart_body_1,
      abandoned_cart_enabled_1,
      abandoned_cart_subject_2,
      abandoned_cart_body_2,
      abandoned_cart_enabled_2,
      abandoned_cart_subject_3,
      abandoned_cart_body_3,
      abandoned_cart_enabled_3,
      created_at,
      updated_at
    FROM store_email_settings
    WHERE store_id = p_store_id
  ) t;
  
  RETURN result;
END;
$$;