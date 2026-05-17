-- Create table for home sections configuration
CREATE TABLE public.store_home_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN ('banner_carousel', 'featured_categories', 'featured_products', 'new_arrivals')),
  title TEXT,
  subtitle TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for banner slides (for banner_carousel sections)
CREATE TABLE public.store_home_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.store_home_sections(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_url_mobile TEXT,
  title TEXT,
  subtitle TEXT,
  button_text TEXT,
  button_link TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for featured items (categories or products in sections)
CREATE TABLE public.store_home_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.store_home_sections(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('category', 'product')),
  item_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_home_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_home_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_home_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_home_sections
CREATE POLICY "Public can view active home sections"
  ON public.store_home_sections
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Store owners can manage home sections"
  ON public.store_home_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_home_sections.store_id
      AND stores.merchant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_home_sections.store_id
      AND stores.merchant_id = auth.uid()
    )
  );

-- RLS Policies for store_home_banners
CREATE POLICY "Public can view active banners"
  ON public.store_home_banners
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Store owners can manage banners"
  ON public.store_home_banners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.store_home_sections shs
      JOIN public.stores s ON s.id = shs.store_id
      WHERE shs.id = store_home_banners.section_id
      AND s.merchant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_home_sections shs
      JOIN public.stores s ON s.id = shs.store_id
      WHERE shs.id = store_home_banners.section_id
      AND s.merchant_id = auth.uid()
    )
  );

-- RLS Policies for store_home_items
CREATE POLICY "Public can view active items"
  ON public.store_home_items
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Store owners can manage items"
  ON public.store_home_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.store_home_sections shs
      JOIN public.stores s ON s.id = shs.store_id
      WHERE shs.id = store_home_items.section_id
      AND s.merchant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_home_sections shs
      JOIN public.stores s ON s.id = shs.store_id
      WHERE shs.id = store_home_items.section_id
      AND s.merchant_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_store_home_sections_store_id ON public.store_home_sections(store_id);
CREATE INDEX idx_store_home_sections_position ON public.store_home_sections(store_id, position);
CREATE INDEX idx_store_home_banners_section_id ON public.store_home_banners(section_id);
CREATE INDEX idx_store_home_items_section_id ON public.store_home_items(section_id);

-- Trigger to update updated_at
CREATE TRIGGER update_store_home_sections_updated_at
  BEFORE UPDATE ON public.store_home_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_home_banners_updated_at
  BEFORE UPDATE ON public.store_home_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_home_items_updated_at
  BEFORE UPDATE ON public.store_home_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();