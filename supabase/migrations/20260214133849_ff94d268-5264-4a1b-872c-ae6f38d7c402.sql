-- Add Pinterest access token for Conversions API
ALTER TABLE public.store_tracking_config 
ADD COLUMN IF NOT EXISTS pinterest_access_token TEXT,
ADD COLUMN IF NOT EXISTS pinterest_test_event_code TEXT;

-- Add Google Ads Enhanced Conversions flag
ALTER TABLE public.store_tracking_config
ADD COLUMN IF NOT EXISTS google_enhanced_conversions_enabled BOOLEAN DEFAULT false;