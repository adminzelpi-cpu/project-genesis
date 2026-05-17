-- Add is_system flag to menu items to protect auto-generated legal links
ALTER TABLE public.store_menu_items 
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;