
-- Allow anyone to SELECT abandoned_carts by recovery_token (needed for cart recovery page)
CREATE POLICY "Anyone can recover carts by token"
  ON public.abandoned_carts FOR SELECT
  USING (recovery_token IS NOT NULL);
