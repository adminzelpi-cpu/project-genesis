-- Allow anonymous/public INSERT on payment_transactions for checkout process
CREATE POLICY "Allow anonymous payment transaction creation during checkout"
ON public.payment_transactions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anonymous SELECT on payment_transactions for thank-you page
CREATE POLICY "Allow anonymous payment transaction lookup during checkout"
ON public.payment_transactions
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anonymous UPDATE on payment_transactions for webhook updates
CREATE POLICY "Allow anonymous payment transaction update"
ON public.payment_transactions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);