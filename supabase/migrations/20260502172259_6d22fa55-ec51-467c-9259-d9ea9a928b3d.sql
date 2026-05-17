-- 1. Adicionar coluna currency nas lojas (default BRL)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL';

-- 2. Garantir que product_code seja sempre preenchido em novos produtos.
-- Estratégia: trigger BEFORE INSERT que auto-gera próximo product_code por loja
-- caso não venha preenchido. Em seguida, NOT NULL constraint.

CREATE OR REPLACE FUNCTION public.auto_generate_product_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_code IS NULL THEN
    SELECT COALESCE(MAX(product_code), 0) + 1 INTO NEW.product_code
    FROM public.products
    WHERE store_id = NEW.store_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_generate_product_code ON public.products;
CREATE TRIGGER trg_auto_generate_product_code
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_product_code();

-- Backfill defensivo (já está 100%, mas garante consistência futura caso reapliquem)
UPDATE public.products p
SET product_code = sub.new_code
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at) +
         COALESCE((SELECT MAX(product_code) FROM products p2 WHERE p2.store_id = p1.store_id AND p2.product_code IS NOT NULL), 0) AS new_code
  FROM public.products p1
  WHERE product_code IS NULL
) sub
WHERE p.id = sub.id;

-- Constraint NOT NULL
ALTER TABLE public.products
  ALTER COLUMN product_code SET NOT NULL;