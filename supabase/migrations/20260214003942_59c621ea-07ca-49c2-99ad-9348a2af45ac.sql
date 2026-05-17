
-- Add order_number column
ALTER TABLE public.orders ADD COLUMN order_number integer;

-- Create sequence-like trigger that starts at 1001 per store
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COALESCE(MAX(order_number), 1000) + 1 INTO next_number
  FROM orders
  WHERE store_id = NEW.store_id;
  
  NEW.order_number := next_number;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

-- Backfill existing orders with sequential numbers starting from 1001
WITH numbered AS (
  SELECT id, store_id, 
    ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at) + 1000 as num
  FROM orders
  WHERE order_number IS NULL
)
UPDATE orders SET order_number = numbered.num
FROM numbered WHERE orders.id = numbered.id;
