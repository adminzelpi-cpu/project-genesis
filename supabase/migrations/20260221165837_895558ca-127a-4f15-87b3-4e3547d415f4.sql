-- Allow anonymous users to SELECT customers during checkout (to find existing by CPF/email)
CREATE POLICY "Anon can lookup customers during checkout"
  ON public.customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = customers.store_id AND stores.is_active = true
    )
  );

-- Allow anonymous users to UPDATE customers during checkout (to update name/email/phone)
CREATE POLICY "Anon can update customers during checkout"
  ON public.customers FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = customers.store_id AND stores.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = customers.store_id AND stores.is_active = true
    )
  );