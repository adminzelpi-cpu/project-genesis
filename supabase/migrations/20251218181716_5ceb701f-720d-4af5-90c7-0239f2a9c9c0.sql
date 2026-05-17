-- Função para decrementar estoque de um pedido
CREATE OR REPLACE FUNCTION public.decrement_stock_for_order(order_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  product_item JSONB;
  product_id_val UUID;
  variation_id_val UUID;
  quantity_val INTEGER;
BEGIN
  -- Buscar o pedido
  SELECT * INTO order_record FROM orders WHERE id = order_id_param;
  
  -- Se já atualizou estoque, não fazer nada
  IF order_record.stock_updated = true THEN
    RETURN;
  END IF;
  
  -- Iterar sobre os produtos do pedido
  FOR product_item IN SELECT * FROM jsonb_array_elements(order_record.products)
  LOOP
    product_id_val := (product_item->>'product_id')::UUID;
    variation_id_val := (product_item->>'variation_id')::UUID;
    quantity_val := COALESCE((product_item->>'quantity')::INTEGER, 1);
    
    -- Se tem variation_id, decrementar da variação
    IF variation_id_val IS NOT NULL THEN
      UPDATE product_variations_v2
      SET stock_quantity = GREATEST(0, stock_quantity - quantity_val)
      WHERE id = variation_id_val;
    ELSE
      -- Senão, decrementar do produto principal
      UPDATE products
      SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - quantity_val)
      WHERE id = product_id_val;
    END IF;
  END LOOP;
  
  -- Marcar que o estoque foi atualizado
  UPDATE orders SET stock_updated = true WHERE id = order_id_param;
END;
$$;

-- Trigger function para chamar decrement_stock quando pagamento é aprovado
CREATE OR REPLACE FUNCTION public.handle_payment_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se o status_pagamento mudou para 'aprovado' ou 'pago' e ainda não atualizou estoque
  IF (NEW.status_pagamento IN ('aprovado', 'pago')) 
     AND (OLD.status_pagamento NOT IN ('aprovado', 'pago') OR OLD.status_pagamento IS NULL)
     AND (NEW.stock_updated = false OR NEW.stock_updated IS NULL) THEN
    PERFORM decrement_stock_for_order(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar o trigger na tabela orders
DROP TRIGGER IF EXISTS on_payment_confirmed ON orders;
CREATE TRIGGER on_payment_confirmed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_confirmed();

-- Função para validar estoque antes do checkout
CREATE OR REPLACE FUNCTION public.validate_stock_for_checkout(items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item JSONB;
  product_id_val UUID;
  variation_id_val UUID;
  quantity_val INTEGER;
  available_stock INTEGER;
  product_name TEXT;
  result JSONB := '{"valid": true, "errors": []}'::JSONB;
  errors JSONB := '[]'::JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    product_id_val := (item->>'product_id')::UUID;
    variation_id_val := (item->>'variation_id')::UUID;
    quantity_val := COALESCE((item->>'quantity')::INTEGER, 1);
    
    -- Buscar nome do produto
    SELECT name INTO product_name FROM products WHERE id = product_id_val;
    
    -- Verificar estoque
    IF variation_id_val IS NOT NULL THEN
      SELECT stock_quantity INTO available_stock 
      FROM product_variations_v2 
      WHERE id = variation_id_val AND is_active = true;
    ELSE
      SELECT stock_quantity INTO available_stock 
      FROM products 
      WHERE id = product_id_val AND is_active = true;
    END IF;
    
    -- Se stock_quantity é NULL, considerar como estoque infinito
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
    result := jsonb_build_object('valid', false, 'errors', errors);
  END IF;
  
  RETURN result;
END;
$$;