-- Add favicon_url column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS favicon_url TEXT;