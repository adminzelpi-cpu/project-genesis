-- Allow anonymous/public INSERT on customers for checkout process
-- This is needed because customers are created during checkout when not logged in
CREATE POLICY "Allow anonymous customer creation during checkout"
ON public.customers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous UPDATE on customers for checkout (updating existing customer data)
CREATE POLICY "Allow anonymous customer update during checkout"
ON public.customers
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Allow anonymous SELECT on customers by CPF for checkout recognition
CREATE POLICY "Allow anonymous customer lookup during checkout"
ON public.customers
FOR SELECT
TO anon, authenticated
USING (true);