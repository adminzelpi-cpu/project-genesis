-- Prevent duplicate favorites (same user + product + color)
-- For non-null color_value_id:
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_unique_with_color
ON public.favorites (user_id, product_id, color_value_id)
WHERE color_value_id IS NOT NULL;

-- For null color_value_id:
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_unique_no_color
ON public.favorites (user_id, product_id)
WHERE color_value_id IS NULL;