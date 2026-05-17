-- Add color_value_id to favorites for per-color favoriting
ALTER TABLE public.favorites ADD COLUMN color_value_id uuid NULL;

-- Drop old unique constraint if exists and create new one
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_product_id_key;
ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_id_product_id_color_key UNIQUE (user_id, product_id, color_value_id);

-- Create partial unique for null color_value_id (product-level favorites)
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_product_no_color_idx 
ON public.favorites (user_id, product_id) 
WHERE color_value_id IS NULL;