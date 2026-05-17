-- Tabela para configurações de pixels e tracking
CREATE TABLE public.store_tracking_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  
  -- Meta (Facebook/Instagram)
  meta_pixel_id TEXT,
  meta_access_token TEXT,
  meta_test_event_code TEXT,
  meta_enabled BOOLEAN DEFAULT false,
  
  -- Google Ads
  google_ads_id TEXT,
  google_ads_conversion_label TEXT,
  google_ads_enabled BOOLEAN DEFAULT false,
  
  -- Google Analytics 4
  ga4_measurement_id TEXT,
  ga4_enabled BOOLEAN DEFAULT false,
  
  -- TikTok
  tiktok_pixel_id TEXT,
  tiktok_access_token TEXT,
  tiktok_test_event_code TEXT,
  tiktok_enabled BOOLEAN DEFAULT false,
  
  -- Pinterest
  pinterest_tag_id TEXT,
  pinterest_enabled BOOLEAN DEFAULT false,
  
  -- Configurações gerais
  exclude_shipping_from_value BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(store_id)
);

-- Enable RLS
ALTER TABLE public.store_tracking_config ENABLE ROW LEVEL SECURITY;

-- Policies para lojistas
CREATE POLICY "Users can view their store tracking config"
  ON public.store_tracking_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = store_tracking_config.store_id 
      AND stores.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their store tracking config"
  ON public.store_tracking_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = store_tracking_config.store_id 
      AND stores.merchant_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their store tracking config"
  ON public.store_tracking_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id = store_tracking_config.store_id 
      AND stores.merchant_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_store_tracking_config_updated_at
  BEFORE UPDATE ON public.store_tracking_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para busca por store_id
CREATE INDEX idx_store_tracking_config_store_id ON public.store_tracking_config(store_id);