
-- Add available_* columns (all assets from OAuth) and separate from selected_* (user choices)
-- Also add instagram_accounts, business_managers, and configuration_status

ALTER TABLE public.meta_connections
  ADD COLUMN IF NOT EXISTS available_pages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_ad_accounts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_catalogs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_pixels jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_instagram_accounts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS available_business_managers jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_instagram_account jsonb,
  ADD COLUMN IF NOT EXISTS selected_business_manager jsonb,
  ADD COLUMN IF NOT EXISTS selected_page jsonb,
  ADD COLUMN IF NOT EXISTS selected_ad_account jsonb,
  ADD COLUMN IF NOT EXISTS selected_pixel jsonb,
  ADD COLUMN IF NOT EXISTS selected_catalog jsonb,
  ADD COLUMN IF NOT EXISTS configuration_status text NOT NULL DEFAULT 'pending_selection';

-- configuration_status: 'pending_selection' | 'configured'
