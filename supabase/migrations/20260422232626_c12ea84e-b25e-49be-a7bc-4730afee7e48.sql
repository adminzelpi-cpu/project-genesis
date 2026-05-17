-- Remove legacy FK on favorites.user_id pointing to auth.users (no longer used by custom customer auth)
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_product_id_color_key;
ALTER TABLE public.favorites ALTER COLUMN user_id DROP NOT NULL;
-- New unique on customer scope
CREATE UNIQUE INDEX IF NOT EXISTS favorites_customer_product_color_key
  ON public.favorites (customer_id, product_id, COALESCE(color_value_id, '00000000-0000-0000-0000-000000000000'::uuid));