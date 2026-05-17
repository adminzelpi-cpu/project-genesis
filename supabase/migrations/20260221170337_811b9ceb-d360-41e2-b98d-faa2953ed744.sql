-- Allow anon to SELECT their own subscription (needed for upsert conflict detection)
CREATE POLICY "Anon can check own newsletter subscription"
  ON public.newsletter_subscribers FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = newsletter_subscribers.store_id AND stores.is_active = true
    )
  );