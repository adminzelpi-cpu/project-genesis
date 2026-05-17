-- Add header configuration columns to stores table
ALTER TABLE public.stores
ADD COLUMN header_bg_color TEXT DEFAULT '#ffffff',
ADD COLUMN header_text_color TEXT DEFAULT '#000000',
ADD COLUMN header_layout TEXT DEFAULT 'default' CHECK (header_layout IN ('default', 'wide', 'full')),
ADD COLUMN header_show_favorites BOOLEAN DEFAULT true,
ADD COLUMN header_show_search BOOLEAN DEFAULT true,
ADD COLUMN header_mobile_logo_position TEXT DEFAULT 'center' CHECK (header_mobile_logo_position IN ('left', 'center'));