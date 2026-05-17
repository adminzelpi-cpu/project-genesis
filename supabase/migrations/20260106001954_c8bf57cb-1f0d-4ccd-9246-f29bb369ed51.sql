-- Add image support for category items in home sections
ALTER TABLE public.store_home_items 
ADD COLUMN IF NOT EXISTS custom_image_url TEXT,
ADD COLUMN IF NOT EXISTS custom_title TEXT,
ADD COLUMN IF NOT EXISTS custom_subtitle TEXT,
ADD COLUMN IF NOT EXISTS custom_button_text TEXT,
ADD COLUMN IF NOT EXISTS custom_button_link TEXT;

-- Add settings to store display preferences per section
-- This will store: carousel_visible_items, carousel_autoplay, title_alignment, etc.
COMMENT ON COLUMN public.store_home_sections.settings IS 'JSON with display settings: carousel_visible_items_mobile, carousel_visible_items_tablet, carousel_visible_items_desktop, autoplay, autoplay_interval, title_alignment, show_subtitle, show_button';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_store_home_sections_store_active 
ON public.store_home_sections(store_id, is_active, position);