-- Add hide_parent_product column to products table
-- When display_variations_separately is true, this controls if the parent product is shown
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS hide_parent_product boolean DEFAULT true;

-- Add comment explaining the column
COMMENT ON COLUMN public.products.hide_parent_product IS 'When display_variations_separately is true, determines if the parent product is hidden from category listings';