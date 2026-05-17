
-- 1. Create secure function for checkout/thank-you page (single order by ID)
-- This replaces the dangerous anon SELECT true policy
CREATE OR REPLACE FUNCTION public.get_order_for_checkout_view(p_order_id UUID)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM orders WHERE id = p_order_id;
END;
$$;

-- 2. Create secure function for best-seller product ranking (storefront)
-- Returns only the products JSONB column, not sensitive order data
CREATE OR REPLACE FUNCTION public.get_store_order_products_for_ranking(
  p_store_id UUID,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE(products JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT o.products
    FROM orders o
    WHERE o.store_id = p_store_id
      AND (p_status IS NULL OR o.status_pedido = p_status)
    ORDER BY o.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 3. Drop the dangerous anonymous SELECT policy on orders
DROP POLICY IF EXISTS "Anonymous can view orders for payment flow" ON orders;
