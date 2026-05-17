-- Add shipping configuration to stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS shipping_config JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.stores.shipping_config IS 'Shipping configuration: { frenet_token, origin_cep, enabled, free_shipping_min_value }';

-- Update existing stores with empty config
UPDATE public.stores 
SET shipping_config = '{}'::jsonb 
WHERE shipping_config IS NULL;