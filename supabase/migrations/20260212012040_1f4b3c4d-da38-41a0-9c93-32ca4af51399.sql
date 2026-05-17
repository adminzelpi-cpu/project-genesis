
-- 1. Add product_code (auto-increment sequential) to products
CREATE SEQUENCE IF NOT EXISTS public.products_product_code_seq START WITH 1;

ALTER TABLE public.products 
ADD COLUMN product_code INTEGER DEFAULT nextval('public.products_product_code_seq');

ALTER SEQUENCE public.products_product_code_seq OWNED BY public.products.product_code;

CREATE UNIQUE INDEX idx_products_product_code ON public.products(product_code);

-- 2. Add value_code to attribute_values (sequential per attribute_id)
ALTER TABLE public.attribute_values 
ADD COLUMN value_code INTEGER;

-- Trigger to auto-generate value_code per attribute_id on INSERT
CREATE OR REPLACE FUNCTION public.auto_generate_value_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.value_code IS NULL THEN
    SELECT COALESCE(MAX(value_code), 0) + 1 INTO NEW.value_code
    FROM public.attribute_values
    WHERE attribute_id = NEW.attribute_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_auto_value_code
BEFORE INSERT ON public.attribute_values
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_value_code();
