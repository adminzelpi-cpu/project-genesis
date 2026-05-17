
ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS customer_phone text;

CREATE OR REPLACE FUNCTION public.save_abandoned_cart(
  p_store_id uuid,
  p_customer_email text,
  p_customer_name text DEFAULT NULL::text,
  p_customer_id uuid DEFAULT NULL::uuid,
  p_cart_items jsonb DEFAULT '[]'::jsonb,
  p_cart_total numeric DEFAULT 0,
  p_customer_phone text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id UUID;
  v_emails_sent INT;
  v_last_email TIMESTAMPTZ;
  v_cooldown INTERVAL := '24 hours';
BEGIN
  SELECT id, emails_sent, last_email_sent_at
  INTO v_existing_id, v_emails_sent, v_last_email
  FROM abandoned_carts
  WHERE store_id = p_store_id
    AND customer_email = p_customer_email
    AND recovered_at IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF v_emails_sent >= 3 AND v_last_email IS NOT NULL THEN
      IF NOW() - v_last_email < v_cooldown THEN
        RETURN v_existing_id;
      END IF;
    END IF;

    UPDATE abandoned_carts
    SET cart_items = p_cart_items,
        cart_total = p_cart_total,
        customer_name = COALESCE(p_customer_name, customer_name),
        customer_id = COALESCE(p_customer_id, customer_id),
        customer_phone = COALESCE(p_customer_phone, customer_phone),
        abandoned_at = NOW(),
        emails_sent = 0,
        last_email_sent_at = NULL,
        updated_at = NOW()
    WHERE id = v_existing_id;

    RETURN v_existing_id;
  END IF;

  INSERT INTO abandoned_carts (
    store_id, customer_email, customer_name, customer_id,
    cart_items, cart_total, customer_phone
  ) VALUES (
    p_store_id, p_customer_email, p_customer_name, p_customer_id,
    p_cart_items, p_cart_total, p_customer_phone
  )
  RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$function$;
