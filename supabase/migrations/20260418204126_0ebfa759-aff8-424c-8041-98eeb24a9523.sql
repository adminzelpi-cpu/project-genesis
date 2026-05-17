
-- ============================================================
-- A) ATOMIC STOCK DECREMENT WITH ROW LOCKING
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrement_stock_for_order(order_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_record RECORD;
  product_item JSONB;
  product_id_val UUID;
  variation_id_val UUID;
  quantity_val INTEGER;
  current_stock INTEGER;
  prod_name TEXT;
BEGIN
  -- Lock the order row to prevent concurrent stock updates for the same order
  SELECT * INTO order_record FROM orders WHERE id = order_id_param FOR UPDATE;

  IF order_record.stock_updated = true THEN
    RETURN;
  END IF;

  FOR product_item IN SELECT * FROM jsonb_array_elements(order_record.products)
  LOOP
    product_id_val := (product_item->>'product_id')::UUID;
    variation_id_val := (product_item->>'variation_id')::UUID;
    quantity_val := COALESCE((product_item->>'quantity')::INTEGER, 1);

    IF variation_id_val IS NOT NULL THEN
      -- Lock variation row, then check + decrement atomically
      SELECT stock_quantity INTO current_stock
      FROM product_variations_v2
      WHERE id = variation_id_val
      FOR UPDATE;

      -- NULL stock = infinite, skip decrement
      IF current_stock IS NOT NULL THEN
        IF current_stock < quantity_val THEN
          SELECT name INTO prod_name FROM products WHERE id = product_id_val;
          RAISE EXCEPTION 'Estoque insuficiente para "%": disponível %, solicitado %',
            COALESCE(prod_name, 'produto'), current_stock, quantity_val
            USING ERRCODE = 'P0001';
        END IF;

        UPDATE product_variations_v2
        SET stock_quantity = current_stock - quantity_val
        WHERE id = variation_id_val;
      END IF;
    ELSE
      -- Lock product row, then check + decrement atomically
      SELECT stock_quantity, name INTO current_stock, prod_name
      FROM products
      WHERE id = product_id_val
      FOR UPDATE;

      IF current_stock IS NOT NULL THEN
        IF current_stock < quantity_val THEN
          RAISE EXCEPTION 'Estoque insuficiente para "%": disponível %, solicitado %',
            COALESCE(prod_name, 'produto'), current_stock, quantity_val
            USING ERRCODE = 'P0001';
        END IF;

        UPDATE products
        SET stock_quantity = current_stock - quantity_val
        WHERE id = product_id_val;
      END IF;
    END IF;
  END LOOP;

  UPDATE orders SET stock_updated = true WHERE id = order_id_param;
END;
$function$;

-- ============================================================
-- B) STRICT STOCK VALIDATION WITH LOCK (for pre-payment check)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_stock_for_checkout_strict(items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item JSONB;
  product_id_val UUID;
  variation_id_val UUID;
  quantity_val INTEGER;
  available_stock INTEGER;
  product_name TEXT;
  errors JSONB := '[]'::JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    product_id_val := (item->>'product_id')::UUID;
    variation_id_val := (item->>'variation_id')::UUID;
    quantity_val := COALESCE((item->>'quantity')::INTEGER, 1);

    SELECT name INTO product_name FROM products WHERE id = product_id_val;

    -- Use FOR SHARE to allow concurrent reads but prevent stock decrement during validation
    IF variation_id_val IS NOT NULL THEN
      SELECT stock_quantity INTO available_stock
      FROM product_variations_v2
      WHERE id = variation_id_val AND is_active = true
      FOR SHARE;
    ELSE
      SELECT stock_quantity INTO available_stock
      FROM products
      WHERE id = product_id_val AND is_active = true
      FOR SHARE;
    END IF;

    IF available_stock IS NOT NULL AND available_stock < quantity_val THEN
      errors := errors || jsonb_build_object(
        'product_id', product_id_val,
        'variation_id', variation_id_val,
        'product_name', product_name,
        'requested', quantity_val,
        'available', available_stock
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(errors) > 0 THEN
    RETURN jsonb_build_object('valid', false, 'errors', errors);
  END IF;

  RETURN jsonb_build_object('valid', true, 'errors', '[]'::jsonb);
END;
$function$;

-- ============================================================
-- C) WEBHOOK IDEMPOTENCY HELPER (advisory lock per order)
-- ============================================================
CREATE OR REPLACE FUNCTION public.try_lock_order_processing(order_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lock_key bigint;
BEGIN
  -- Convert UUID to bigint for advisory lock (use first 8 bytes)
  lock_key := ('x' || substr(replace(order_id_param::text, '-', ''), 1, 16))::bit(64)::bigint;
  -- Transaction-scoped advisory lock; auto-released on commit/rollback
  RETURN pg_try_advisory_xact_lock(lock_key);
END;
$function$;

-- ============================================================
-- D) PER-STORE ORDER NUMBER SEQUENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_order_sequences (
  store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 1000
);

ALTER TABLE public.store_order_sequences ENABLE ROW LEVEL SECURITY;

-- Only service role / SECURITY DEFINER functions touch this table; no public policies needed.

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  -- Atomic upsert + increment using ON CONFLICT to handle first-order-per-store
  INSERT INTO public.store_order_sequences (store_id, last_number)
  VALUES (
    NEW.store_id,
    GREATEST(1000, COALESCE((SELECT MAX(order_number) FROM orders WHERE store_id = NEW.store_id), 1000)) + 1
  )
  ON CONFLICT (store_id) DO UPDATE
    SET last_number = store_order_sequences.last_number + 1
  RETURNING last_number INTO next_num;

  NEW.order_number := next_num;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- E) PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_store_active
  ON public.products (store_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_variations_v2_product_active
  ON public.product_variations_v2 (product_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_orders_store_status
  ON public.orders (store_id, status_pagamento, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_pedido
  ON public.orders (store_id, status_pedido, created_at DESC);
