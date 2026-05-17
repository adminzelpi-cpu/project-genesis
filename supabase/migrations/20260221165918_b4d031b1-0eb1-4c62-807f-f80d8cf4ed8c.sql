-- Allow anonymous users to SELECT customer_addresses during checkout (to check existing addresses)
CREATE POLICY "Anon can lookup customer addresses during checkout"
  ON public.customer_addresses FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN stores s ON s.id = c.store_id
      WHERE c.id = customer_addresses.customer_id AND s.is_active = true
    )
  );

-- Allow anonymous users to INSERT customer_addresses during checkout
CREATE POLICY "Anon can create customer addresses during checkout"
  ON public.customer_addresses FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      JOIN stores s ON s.id = c.store_id
      WHERE c.id = customer_addresses.customer_id AND s.is_active = true
    )
  );