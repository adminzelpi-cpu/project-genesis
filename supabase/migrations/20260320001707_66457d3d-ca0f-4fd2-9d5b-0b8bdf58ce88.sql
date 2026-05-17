
-- Fix: Add UPDATE policy for customers during checkout
-- Currently only merchants and users with matching auth_user_id can update.
-- During checkout, an authenticated customer might update a customer record where auth_user_id isn't yet linked.
CREATE POLICY "Anyone can update customers during checkout"
ON public.customers
FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = customers.store_id 
    AND stores.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = customers.store_id 
    AND stores.is_active = true
  )
);

-- Fix: Add SELECT policy for customers during checkout (anon/authenticated)
-- Currently only merchants and users with matching auth_user_id can view.
-- During checkout, we need to look up customers by CPF/email.
CREATE POLICY "Anyone can lookup customers during checkout"
ON public.customers
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = customers.store_id 
    AND stores.is_active = true
  )
);

-- Fix: Add INSERT policy for customer_addresses for authenticated users during checkout
-- Currently only anon has a checkout INSERT policy. Authenticated customers need it too.
CREATE POLICY "Authenticated can create customer addresses during checkout"
ON public.customer_addresses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN stores s ON s.id = c.store_id
    WHERE c.id = customer_addresses.customer_id 
    AND s.is_active = true
  )
);

-- Fix: Add SELECT policy for customer_addresses for authenticated users during checkout
-- (complementing the existing anon policy)
CREATE POLICY "Authenticated can lookup customer addresses during checkout"
ON public.customer_addresses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN stores s ON s.id = c.store_id
    WHERE c.id = customer_addresses.customer_id 
    AND s.is_active = true
  )
);

-- Fix: Add UPDATE policy for customer_addresses during checkout
CREATE POLICY "Authenticated can update customer addresses during checkout"
ON public.customer_addresses
FOR UPDATE
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN stores s ON s.id = c.store_id
    WHERE c.id = customer_addresses.customer_id 
    AND s.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    JOIN stores s ON s.id = c.store_id
    WHERE c.id = customer_addresses.customer_id 
    AND s.is_active = true
  )
);
