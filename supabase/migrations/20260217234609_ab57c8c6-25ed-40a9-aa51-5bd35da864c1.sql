
-- Add button style and text position to banners
ALTER TABLE public.store_home_banners 
ADD COLUMN IF NOT EXISTS button_style text DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS button_border_color text,
ADD COLUMN IF NOT EXISTS text_position text DEFAULT 'left';

-- Add button style and border color to home items (categories)
ALTER TABLE public.store_home_items
ADD COLUMN IF NOT EXISTS button_style text DEFAULT 'solid',
ADD COLUMN IF NOT EXISTS button_border_color text,
ADD COLUMN IF NOT EXISTS button_bg_color text,
ADD COLUMN IF NOT EXISTS button_text_color text;
