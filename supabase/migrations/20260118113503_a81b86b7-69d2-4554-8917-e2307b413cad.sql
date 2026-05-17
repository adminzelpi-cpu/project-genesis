-- Tabela principal de guias de tamanho
CREATE TABLE public.size_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT DEFAULT 'custom', -- 'polo', 'camiseta', 'calca', 'vestido', 'calcado', 'custom'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Colunas/dimensões do guia (ex: Largura, Comprimento, Manga...)
CREATE TABLE public.size_guide_dimensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  size_guide_id UUID NOT NULL REFERENCES public.size_guides(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  position INTEGER DEFAULT 0,
  measurement_type TEXT DEFAULT 'piece', -- 'piece' (da peça) ou 'body' (do corpo)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Linhas/tamanhos do guia (P, M, G, GG...)
CREATE TABLE public.size_guide_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  size_guide_id UUID NOT NULL REFERENCES public.size_guides(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Valores das medidas (cruzamento dimensão x tamanho)
CREATE TABLE public.size_guide_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  size_guide_id UUID NOT NULL REFERENCES public.size_guides(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES public.size_guide_dimensions(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.size_guide_sizes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dimension_id, size_id)
);

-- Vinculação do guia com categorias (aplicação automática)
CREATE TABLE public.size_guide_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  size_guide_id UUID NOT NULL REFERENCES public.size_guides(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(size_guide_id, category_id)
);

-- Adicionar coluna size_guide_id na tabela products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_guide_id UUID REFERENCES public.size_guides(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.size_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_guide_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_guide_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_guide_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_guide_categories ENABLE ROW LEVEL SECURITY;

-- Policies para size_guides (usando merchant_id)
CREATE POLICY "Merchants can view their store size guides" 
ON public.size_guides FOR SELECT 
USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can create size guides for their store" 
ON public.size_guides FOR INSERT 
WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can update their store size guides" 
ON public.size_guides FOR UPDATE 
USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can delete their store size guides" 
ON public.size_guides FOR DELETE 
USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

-- Policy para leitura pública (storefront)
CREATE POLICY "Public can view active size guides" 
ON public.size_guides FOR SELECT 
USING (is_active = true);

-- Policies para dimensions
CREATE POLICY "Merchants can manage dimensions of their guides" 
ON public.size_guide_dimensions FOR ALL 
USING (size_guide_id IN (
  SELECT id FROM public.size_guides WHERE store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
));

CREATE POLICY "Public can view dimensions of active guides" 
ON public.size_guide_dimensions FOR SELECT 
USING (size_guide_id IN (SELECT id FROM public.size_guides WHERE is_active = true));

-- Policies para sizes
CREATE POLICY "Merchants can manage sizes of their guides" 
ON public.size_guide_sizes FOR ALL 
USING (size_guide_id IN (
  SELECT id FROM public.size_guides WHERE store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
));

CREATE POLICY "Public can view sizes of active guides" 
ON public.size_guide_sizes FOR SELECT 
USING (size_guide_id IN (SELECT id FROM public.size_guides WHERE is_active = true));

-- Policies para values
CREATE POLICY "Merchants can manage values of their guides" 
ON public.size_guide_values FOR ALL 
USING (size_guide_id IN (
  SELECT id FROM public.size_guides WHERE store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
));

CREATE POLICY "Public can view values of active guides" 
ON public.size_guide_values FOR SELECT 
USING (size_guide_id IN (SELECT id FROM public.size_guides WHERE is_active = true));

-- Policies para categories
CREATE POLICY "Merchants can manage category links of their guides" 
ON public.size_guide_categories FOR ALL 
USING (size_guide_id IN (
  SELECT id FROM public.size_guides WHERE store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
));

CREATE POLICY "Public can view category links of active guides" 
ON public.size_guide_categories FOR SELECT 
USING (size_guide_id IN (SELECT id FROM public.size_guides WHERE is_active = true));

-- Trigger para updated_at
CREATE TRIGGER update_size_guides_updated_at
BEFORE UPDATE ON public.size_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_size_guides_store_id ON public.size_guides(store_id);
CREATE INDEX idx_size_guide_dimensions_guide_id ON public.size_guide_dimensions(size_guide_id);
CREATE INDEX idx_size_guide_sizes_guide_id ON public.size_guide_sizes(size_guide_id);
CREATE INDEX idx_size_guide_values_guide_id ON public.size_guide_values(size_guide_id);
CREATE INDEX idx_size_guide_categories_guide_id ON public.size_guide_categories(size_guide_id);
CREATE INDEX idx_products_size_guide_id ON public.products(size_guide_id);