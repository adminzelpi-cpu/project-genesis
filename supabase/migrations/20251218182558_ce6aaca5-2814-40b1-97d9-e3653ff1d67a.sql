-- Adicionar campo de limite de estoque baixo nas lojas
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5;

-- Função para verificar estoque baixo e criar alertas
CREATE OR REPLACE FUNCTION public.check_low_stock_after_decrement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_record RECORD;
  store_record RECORD;
  threshold INTEGER;
  alert_title TEXT;
  alert_description TEXT;
BEGIN
  -- Verificar se é uma variação
  IF TG_TABLE_NAME = 'product_variations_v2' THEN
    -- Buscar produto e loja
    SELECT p.*, s.low_stock_threshold, s.id as store_id, s.name as store_name
    INTO product_record
    FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = NEW.product_id;
    
    threshold := COALESCE(product_record.low_stock_threshold, 5);
    
    -- Se estoque ficou abaixo do limite
    IF NEW.stock_quantity <= threshold AND NEW.stock_quantity > 0 THEN
      alert_title := 'Estoque baixo: ' || product_record.name;
      alert_description := 'A variação do produto "' || product_record.name || '" está com apenas ' || NEW.stock_quantity || ' unidade(s) em estoque.';
      
      -- Inserir ou atualizar alerta
      INSERT INTO public.system_alerts (
        store_id, category, severity, title, description, 
        metadata, status
      )
      VALUES (
        product_record.store_id, 'other', 'medium', alert_title, alert_description,
        jsonb_build_object(
          'product_id', product_record.id,
          'variation_id', NEW.id,
          'current_stock', NEW.stock_quantity,
          'threshold', threshold
        ),
        'new'
      )
      ON CONFLICT (store_id, category, title) 
      WHERE status != 'resolved'
      DO UPDATE SET
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        last_occurrence = now(),
        updated_at = now();
    END IF;
    
    -- Se esgotou
    IF NEW.stock_quantity = 0 THEN
      alert_title := 'Produto esgotado: ' || product_record.name;
      alert_description := 'A variação do produto "' || product_record.name || '" está ESGOTADA!';
      
      INSERT INTO public.system_alerts (
        store_id, category, severity, title, description,
        metadata, status
      )
      VALUES (
        product_record.store_id, 'other', 'high', alert_title, alert_description,
        jsonb_build_object(
          'product_id', product_record.id,
          'variation_id', NEW.id,
          'current_stock', 0
        ),
        'new'
      )
      ON CONFLICT (store_id, category, title) 
      WHERE status != 'resolved'
      DO UPDATE SET
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        last_occurrence = now(),
        updated_at = now();
    END IF;
  END IF;
  
  -- Verificar se é produto principal (sem variação)
  IF TG_TABLE_NAME = 'products' THEN
    SELECT s.low_stock_threshold, s.id as store_id
    INTO store_record
    FROM stores s
    WHERE s.id = NEW.store_id;
    
    threshold := COALESCE(store_record.low_stock_threshold, 5);
    
    -- Se estoque ficou abaixo do limite
    IF NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity <= threshold AND NEW.stock_quantity > 0 THEN
      alert_title := 'Estoque baixo: ' || NEW.name;
      alert_description := 'O produto "' || NEW.name || '" está com apenas ' || NEW.stock_quantity || ' unidade(s) em estoque.';
      
      INSERT INTO public.system_alerts (
        store_id, category, severity, title, description,
        metadata, status
      )
      VALUES (
        NEW.store_id, 'other', 'medium', alert_title, alert_description,
        jsonb_build_object(
          'product_id', NEW.id,
          'current_stock', NEW.stock_quantity,
          'threshold', threshold
        ),
        'new'
      )
      ON CONFLICT (store_id, category, title) 
      WHERE status != 'resolved'
      DO UPDATE SET
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        last_occurrence = now(),
        updated_at = now();
    END IF;
    
    -- Se esgotou
    IF NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity = 0 THEN
      alert_title := 'Produto esgotado: ' || NEW.name;
      alert_description := 'O produto "' || NEW.name || '" está ESGOTADO!';
      
      INSERT INTO public.system_alerts (
        store_id, category, severity, title, description,
        metadata, status
      )
      VALUES (
        NEW.store_id, 'other', 'high', alert_title, alert_description,
        jsonb_build_object(
          'product_id', NEW.id,
          'current_stock', 0
        ),
        'new'
      )
      ON CONFLICT (store_id, category, title) 
      WHERE status != 'resolved'
      DO UPDATE SET
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata,
        last_occurrence = now(),
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para variações
DROP TRIGGER IF EXISTS on_variation_stock_change ON product_variations_v2;
CREATE TRIGGER on_variation_stock_change
  AFTER UPDATE OF stock_quantity ON product_variations_v2
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock_after_decrement();

-- Trigger para produtos
DROP TRIGGER IF EXISTS on_product_stock_change ON products;
CREATE TRIGGER on_product_stock_change
  AFTER UPDATE OF stock_quantity ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock_after_decrement();