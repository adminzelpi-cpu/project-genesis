-- Allow anonymous/public INSERT on orders for checkout process
CREATE POLICY "Allow anonymous order creation during checkout"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous SELECT on orders for thank-you page
CREATE POLICY "Allow anonymous order lookup during checkout"
ON public.orders
FOR SELECT
TO anon, authenticated
USING (true);