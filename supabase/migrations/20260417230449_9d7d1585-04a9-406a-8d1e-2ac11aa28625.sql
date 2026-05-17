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
BEGIN
  SELECT * INTO order_record FROM orders WHERE id = order_id_param;
  
  IF order_record.stock_updated = true THEN
    RETURN;
  END IF;
  
  FOR product_item IN SELECT * FROM jsonb_array_elements(order_record.products)
  LOOP
    product_id_val := (product_item->>'product_id')::UUID;
    variation_id_val := (product_item->>'variation_id')::UUID;
    quantity_val := COALESCE((product_item->>'quantity')::INTEGER, 1);
    
    -- Decrement only when stock_quantity IS NOT NULL (NULL = infinite stock, never decrement)
    IF variation_id_val IS NOT NULL THEN
      UPDATE product_variations_v2
      SET stock_quantity = GREATEST(0, stock_quantity - quantity_val)
      WHERE id = variation_id_val
        AND stock_quantity IS NOT NULL;
    ELSE
      UPDATE products
      SET stock_quantity = GREATEST(0, stock_quantity - quantity_val)
      WHERE id = product_id_val
        AND stock_quantity IS NOT NULL;
    END IF;
  END LOOP;
  
  UPDATE orders SET stock_updated = true WHERE id = order_id_param;
END;
$function$;