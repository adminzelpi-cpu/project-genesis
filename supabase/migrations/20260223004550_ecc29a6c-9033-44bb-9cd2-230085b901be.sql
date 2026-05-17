
-- Create SECURITY DEFINER function to save abandoned cart (bypasses RLS for anon users)
CREATE OR REPLACE FUNCTION public.save_abandoned_cart(
  p_store_id UUID,
  p_customer_email TEXT,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_cart_items JSONB DEFAULT '[]'::JSONB,
  p_cart_total NUMERIC DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  v_existing_id UUID;
  v_emails_sent INT;
  v_last_email TIMESTAMPTZ;
  v_cooldown INTERVAL := '24 hours';
BEGIN
  -- Check if there's already an abandoned cart for this email that wasn't recovered
  SELECT id, emails_sent, last_email_sent_at 
  INTO v_existing_id, v_emails_sent, v_last_email
  FROM public.abandoned_carts
  WHERE store_id = p_store_id
    AND customer_email = p_customer_email
    AND recovered_at IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Anti-spam: if all 3 emails were sent, only reset after 24h cooldown
    IF v_emails_sent >= 3 AND v_last_email IS NOT NULL THEN
      IF NOW() - v_last_email < v_cooldown THEN
        RETURN v_existing_id;
      END IF;
    END IF;

    -- Reset inteligente: update items, reset timer and email count
    UPDATE public.abandoned_carts
    SET cart_items = p_cart_items,
        cart_total = p_cart_total,
        customer_name = COALESCE(p_customer_name, customer_name),
        customer_id = COALESCE(p_customer_id, customer_id),
        abandoned_at = NOW(),
        emails_sent = 0,
        last_email_sent_at = NULL,
        updated_at = NOW()
    WHERE id = v_existing_id;

    RETURN v_existing_id;
  END IF;

  -- Create new abandoned cart
  INSERT INTO public.abandoned_carts (store_id, customer_email, customer_name, customer_id, cart_items, cart_total)
  VALUES (p_store_id, p_customer_email, p_customer_name, p_customer_id, p_cart_items, p_cart_total)
  RETURNING id INTO v_existing_id;

  RETURN v_existing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create SECURITY DEFINER function to mark cart as recovered
CREATE OR REPLACE FUNCTION public.mark_cart_recovered(
  p_store_id UUID,
  p_customer_email TEXT,
  p_order_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.abandoned_carts
  SET recovered_at = NOW(),
      order_id = p_order_id,
      updated_at = NOW()
  WHERE store_id = p_store_id
    AND customer_email = p_customer_email
    AND recovered_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
