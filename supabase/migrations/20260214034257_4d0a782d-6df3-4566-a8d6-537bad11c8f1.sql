-- Allow public (anonymous) read access to tracking config for storefront pixel injection
CREATE POLICY "Public can view tracking config for active stores"
ON public.store_tracking_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = store_tracking_config.store_id
    AND stores.is_active = true
  )
);