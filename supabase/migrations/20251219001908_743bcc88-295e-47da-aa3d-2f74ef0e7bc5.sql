-- Add button customization fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS button_color VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS button_hover_color VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS button_border_radius VARCHAR(20) DEFAULT 'rounded' CHECK (button_border_radius IN ('none', 'rounded', 'full'));