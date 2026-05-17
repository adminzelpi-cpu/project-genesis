
-- Update mark_cart_recovered to DELETE the record if within 15-minute grace period
-- Otherwise mark as recovered (existing behavior)
CREATE OR REPLACE FUNCTION public.mark_cart_recovered(
  p_store_id UUID,
  p_customer_email TEXT,
  p_order_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cart_id UUID;
  v_abandoned_at TIMESTAMPTZ;
  v_grace_period INTERVAL := '15 minutes';
BEGIN
  -- Find the active abandoned cart
  SELECT id, abandoned_at
  INTO v_cart_id, v_abandoned_at
  FROM abandoned_carts
  WHERE store_id = p_store_id
    AND customer_email = p_customer_email
    AND recovered_at IS NULL
  LIMIT 1;

  -- No cart found, nothing to do
  IF v_cart_id IS NULL THEN
    RETURN;
  END IF;

  -- If cart was created within grace period (15 min), delete it entirely
  -- It was never truly "abandoned" — user just completed checkout normally
  IF NOW() - v_abandoned_at < v_grace_period THEN
    DELETE FROM abandoned_carts WHERE id = v_cart_id;
    RETURN;
  END IF;

  -- Cart is older than grace period — this is a genuine recovery
  UPDATE abandoned_carts
  SET recovered_at = NOW(),
      order_id = p_order_id,
      updated_at = NOW()
  WHERE id = v_cart_id;
END;
$$;
