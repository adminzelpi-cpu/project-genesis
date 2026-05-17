-- Permitir NULL na coluna stock_quantity (NULL = estoque infinito)
ALTER TABLE public.product_variations_v2 
ALTER COLUMN stock_quantity DROP NOT NULL;

-- Atualizar variações com estoque 0 para NULL (infinito)
UPDATE public.product_variations_v2 
SET stock_quantity = NULL 
WHERE stock_quantity = 0;

-- Comentário explicativo na coluna
COMMENT ON COLUMN public.product_variations_v2.stock_quantity IS 'Quantidade em estoque. NULL significa estoque infinito (sem controle de estoque).';