-- Tabela de configurações de feed por loja/plataforma
CREATE TABLE public.feed_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'pinterest', 'tiktok', 'custom')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  feed_url_slug TEXT,
  custom_settings JSONB DEFAULT '{}'::jsonb,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, platform)
);

-- Tabela de templates de plataforma
CREATE TABLE public.feed_platform_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL UNIQUE,
  platform_icon TEXT NOT NULL,
  platform_color TEXT NOT NULL,
  xml_template TEXT NOT NULL,
  required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_fields JSONB DEFAULT '[]'::jsonb,
  documentation_url TEXT,
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de logs de acesso aos feeds (para analytics)
CREATE TABLE public.feed_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_config_id UUID REFERENCES public.feed_configurations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.feed_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_platform_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_access_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para feed_configurations
CREATE POLICY "Merchants can view their own feed configurations"
  ON public.feed_configurations FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can insert their own feed configurations"
  ON public.feed_configurations FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can update their own feed configurations"
  ON public.feed_configurations FOR UPDATE
  USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can delete their own feed configurations"
  ON public.feed_configurations FOR DELETE
  USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

-- Políticas para feed_platform_templates (leitura pública para templates do sistema)
CREATE POLICY "Anyone can view system platform templates"
  ON public.feed_platform_templates FOR SELECT
  USING (is_system = true);

CREATE POLICY "Authenticated users can view all templates"
  ON public.feed_platform_templates FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para feed_access_logs
CREATE POLICY "Merchants can view their own feed access logs"
  ON public.feed_access_logs FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_feed_configurations_updated_at
  BEFORE UPDATE ON public.feed_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feed_platform_templates_updated_at
  BEFORE UPDATE ON public.feed_platform_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates padrão das 4 plataformas
INSERT INTO public.feed_platform_templates (platform_name, platform_icon, platform_color, xml_template, required_fields, optional_fields, documentation_url, is_system) VALUES
('meta', 'Facebook', '#1877F2', '<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
  <title>{{store_name}} - Product Catalog</title>
  <link href="{{store_url}}"/>
  <updated>{{updated_at}}</updated>
  {{#products}}
  <entry>
    <g:id>{{id}}</g:id>
    <g:title>{{title}}</g:title>
    <g:description>{{description}}</g:description>
    <g:link>{{link}}</g:link>
    <g:image_link>{{image_link}}</g:image_link>
    <g:availability>{{availability}}</g:availability>
    <g:price>{{price}}</g:price>
    <g:brand>{{brand}}</g:brand>
    <g:condition>{{condition}}</g:condition>
    {{#sale_price}}<g:sale_price>{{sale_price}}</g:sale_price>{{/sale_price}}
    {{#item_group_id}}<g:item_group_id>{{item_group_id}}</g:item_group_id>{{/item_group_id}}
    {{#additional_image_link}}<g:additional_image_link>{{additional_image_link}}</g:additional_image_link>{{/additional_image_link}}
    {{#color}}<g:color>{{color}}</g:color>{{/color}}
    {{#size}}<g:size>{{size}}</g:size>{{/size}}
    {{#google_product_category}}<g:google_product_category>{{google_product_category}}</g:google_product_category>{{/google_product_category}}
    {{#custom_label_0}}<g:custom_label_0>{{custom_label_0}}</g:custom_label_0>{{/custom_label_0}}
  </entry>
  {{/products}}
</feed>', 
'["id", "title", "description", "link", "image_link", "availability", "price", "brand", "condition"]'::jsonb,
'["sale_price", "sale_price_effective_date", "item_group_id", "additional_image_link", "color", "size", "material", "pattern", "gender", "age_group", "google_product_category", "product_type", "custom_label_0", "custom_label_1", "custom_label_2", "custom_label_3", "custom_label_4", "gtin", "mpn"]'::jsonb,
'https://developers.facebook.com/docs/marketing-api/catalog/reference/', true),

('google', 'Search', '#4285F4', '<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>{{store_name}}</title>
    <link>{{store_url}}</link>
    <description>Product feed for Google Merchant Center</description>
    {{#products}}
    <item>
      <g:id>{{id}}</g:id>
      <g:title>{{title}}</g:title>
      <g:description>{{description}}</g:description>
      <g:link>{{link}}</g:link>
      <g:image_link>{{image_link}}</g:image_link>
      <g:availability>{{availability}}</g:availability>
      <g:price>{{price}}</g:price>
      <g:brand>{{brand}}</g:brand>
      <g:condition>{{condition}}</g:condition>
      <g:google_product_category>{{google_product_category}}</g:google_product_category>
      {{#gtin}}<g:gtin>{{gtin}}</g:gtin>{{/gtin}}
      {{#mpn}}<g:mpn>{{mpn}}</g:mpn>{{/mpn}}
      {{#sale_price}}<g:sale_price>{{sale_price}}</g:sale_price>{{/sale_price}}
      {{#shipping}}<g:shipping>{{shipping}}</g:shipping>{{/shipping}}
      {{#color}}<g:color>{{color}}</g:color>{{/color}}
      {{#size}}<g:size>{{size}}</g:size>{{/size}}
      {{#item_group_id}}<g:item_group_id>{{item_group_id}}</g:item_group_id>{{/item_group_id}}
    </item>
    {{/products}}
  </channel>
</rss>',
'["id", "title", "description", "link", "image_link", "availability", "price", "brand", "condition", "google_product_category"]'::jsonb,
'["gtin", "mpn", "sale_price", "sale_price_effective_date", "shipping", "tax", "color", "size", "material", "pattern", "gender", "age_group", "item_group_id", "product_type", "custom_label_0", "custom_label_1", "custom_label_2", "custom_label_3", "custom_label_4", "additional_image_link"]'::jsonb,
'https://support.google.com/merchants/answer/7052112', true),

('pinterest', 'Pin', '#E60023', '<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>{{store_name}}</title>
    <link>{{store_url}}</link>
    <description>Product catalog for Pinterest</description>
    {{#products}}
    <item>
      <g:id>{{id}}</g:id>
      <title>{{title}}</title>
      <description>{{description}}</description>
      <link>{{link}}</link>
      <g:image_link>{{image_link}}</g:image_link>
      <g:availability>{{availability}}</g:availability>
      <g:price>{{price}}</g:price>
      <g:brand>{{brand}}</g:brand>
      <g:condition>{{condition}}</g:condition>
      {{#product_type}}<g:product_type>{{product_type}}</g:product_type>{{/product_type}}
      {{#color}}<g:color>{{color}}</g:color>{{/color}}
      {{#size}}<g:size>{{size}}</g:size>{{/size}}
      {{#additional_image_link}}<g:additional_image_link>{{additional_image_link}}</g:additional_image_link>{{/additional_image_link}}
    </item>
    {{/products}}
  </channel>
</rss>',
'["id", "title", "description", "link", "image_link", "availability", "price"]'::jsonb,
'["brand", "condition", "product_type", "google_product_category", "color", "size", "gender", "age_group", "additional_image_link", "sale_price", "item_group_id"]'::jsonb,
'https://help.pinterest.com/en/business/article/before-you-get-started-with-catalogs', true),

('tiktok', 'Music2', '#000000', '<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{{store_name}}</title>
    <link>{{store_url}}</link>
    <description>Product catalog for TikTok</description>
    {{#products}}
    <item>
      <sku_id>{{id}}</sku_id>
      <title>{{title}}</title>
      <description>{{description}}</description>
      <availability>{{availability}}</availability>
      <condition>{{condition}}</condition>
      <price>{{price}}</price>
      <link>{{link}}</link>
      <image_link>{{image_link}}</image_link>
      {{#brand}}<brand>{{brand}}</brand>{{/brand}}
      {{#video_link}}<video_link>{{video_link}}</video_link>{{/video_link}}
      {{#color}}<color>{{color}}</color>{{/color}}
      {{#size}}<size>{{size}}</size>{{/size}}
    </item>
    {{/products}}
  </channel>
</rss>',
'["id", "title", "description", "availability", "condition", "price", "link", "image_link"]'::jsonb,
'["brand", "video_link", "color", "size", "sale_price", "item_group_id", "google_product_category", "product_type", "gender", "age_group"]'::jsonb,
'https://ads.tiktok.com/help/article/catalog-product-data-specification', true);

-- Criar índices para performance
CREATE INDEX idx_feed_configurations_store_id ON public.feed_configurations(store_id);
CREATE INDEX idx_feed_configurations_platform ON public.feed_configurations(platform);
CREATE INDEX idx_feed_access_logs_store_id ON public.feed_access_logs(store_id);
CREATE INDEX idx_feed_access_logs_accessed_at ON public.feed_access_logs(accessed_at DESC);