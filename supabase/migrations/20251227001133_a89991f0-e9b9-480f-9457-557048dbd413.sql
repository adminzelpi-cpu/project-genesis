-- Add tracking_url column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;