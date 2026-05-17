-- Allow anonymous/public INSERT on customer_addresses for checkout process
CREATE POLICY "Allow anonymous address creation during checkout"
ON public.customer_addresses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous SELECT on customer_addresses for checkout
CREATE POLICY "Allow anonymous address lookup during checkout"
ON public.customer_addresses
FOR SELECT
TO anon, authenticated
USING (true);