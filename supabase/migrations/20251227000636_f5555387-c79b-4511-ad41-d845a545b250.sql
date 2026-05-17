-- Add tracking_carrier column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_carrier TEXT;