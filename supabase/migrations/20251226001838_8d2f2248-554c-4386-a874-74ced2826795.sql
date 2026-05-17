-- Add tracking_code column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_code TEXT,
ADD COLUMN IF NOT EXISTS tracking_code_sent_at TIMESTAMPTZ;