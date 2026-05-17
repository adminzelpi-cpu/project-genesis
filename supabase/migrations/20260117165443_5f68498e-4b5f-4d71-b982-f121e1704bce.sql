-- Create LGPD settings table for stores
CREATE TABLE public.store_lgpd_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  style_variant TEXT NOT NULL DEFAULT 'dark_transparent',
  title TEXT NOT NULL DEFAULT 'Política de Privacidade',
  description TEXT NOT NULL DEFAULT 'Utilizamos cookies para melhorar sua experiência de navegação. Ao continuar, você concorda com nossa política de privacidade.',
  accept_button_text TEXT NOT NULL DEFAULT 'Aceitar',
  reject_button_text TEXT NOT NULL DEFAULT 'Recusar',
  privacy_policy_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- Enable RLS
ALTER TABLE public.store_lgpd_settings ENABLE ROW LEVEL SECURITY;

-- Policy for public read (storefront needs to read settings)
CREATE POLICY "Anyone can view LGPD settings"
  ON public.store_lgpd_settings
  FOR SELECT
  USING (true);

-- Policy for store owners to manage their settings
CREATE POLICY "Store owners can manage LGPD settings"
  ON public.store_lgpd_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_lgpd_settings.store_id
      AND stores.merchant_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_store_lgpd_settings_updated_at
  BEFORE UPDATE ON public.store_lgpd_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();