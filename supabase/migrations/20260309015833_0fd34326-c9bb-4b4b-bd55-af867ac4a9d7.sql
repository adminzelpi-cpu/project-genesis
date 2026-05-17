-- Allow sellify_admin to read ALL email_logs
CREATE POLICY "Admins can view all email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sellify_admin'::app_role));

-- Allow sellify_admin to read ALL payment_transactions
CREATE POLICY "Admins can view all payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sellify_admin'::app_role));

-- Allow sellify_admin to read ALL orders (for monitoring)
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'sellify_admin'::app_role));
