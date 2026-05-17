-- Adicionar campos para feeds de catálogo na tabela products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS age_group text,
ADD COLUMN IF NOT EXISTS material text;

-- Criar índices para melhor performance nas queries de feed
CREATE INDEX IF NOT EXISTS idx_products_gender ON public.products(gender) WHERE gender IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_age_group ON public.products(age_group) WHERE age_group IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.products.gender IS 'Gênero do produto: male, female, unisex';
COMMENT ON COLUMN public.products.age_group IS 'Faixa etária: adult, kids, toddler, infant, newborn';
COMMENT ON COLUMN public.products.material IS 'Material principal do produto (ex: algodão, poliéster)';