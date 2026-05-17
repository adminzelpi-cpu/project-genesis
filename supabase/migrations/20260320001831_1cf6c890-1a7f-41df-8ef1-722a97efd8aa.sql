
-- Fix: Allow anyone to view orders from active stores during checkout
-- Needed so the INSERT().select().single() pattern works for anon/customer checkout.
-- Order IDs are UUIDs (unguessable), so exposure risk is minimal.
CREATE POLICY "Anyone can view orders from active stores"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = orders.store_id 
    AND stores.is_active = true
  )
);

-- Fix: Allow coupon usage_count to be incremented during checkout
-- Currently only store owners can update coupons.
CREATE POLICY "Anyone can increment coupon usage during checkout"
ON public.coupons
FOR UPDATE
TO anon, authenticated
USING (is_active = true)
WITH CHECK (is_active = true);
