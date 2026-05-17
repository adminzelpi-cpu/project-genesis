-- Add font_family column to stores table for typography customization
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'system';