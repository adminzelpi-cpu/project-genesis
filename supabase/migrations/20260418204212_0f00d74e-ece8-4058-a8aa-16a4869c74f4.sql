
CREATE OR REPLACE FUNCTION public.confirm_order_payment_atomic(
  p_order_id uuid,
  p_new_status text DEFAULT 'aprovado'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lock_key bigint;
  current_status text;
  v_store_id uuid;
BEGIN
  -- Acquire transaction-scoped advisory lock for this order
  lock_key := ('x' || substr(replace(p_order_id::text, '-', ''), 1, 16))::bit(64)::bigint;

  IF NOT pg_try_advisory_xact_lock(lock_key) THEN
    RETURN jsonb_build_object('status', 'locked', 'updated', false);
  END IF;

  -- Lock the order row and check current status
  SELECT status_pagamento, store_id INTO current_status, v_store_id
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'updated', false);
  END IF;

  IF current_status IN ('aprovado', 'pago') THEN
    RETURN jsonb_build_object(
      'status', 'already_paid',
      'updated', false,
      'store_id', v_store_id
    );
  END IF;

  UPDATE orders
  SET status_pagamento = p_new_status,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'status', 'confirmed',
    'updated', true,
    'store_id', v_store_id,
    'previous_status', current_status
  );
END;
$function$;
