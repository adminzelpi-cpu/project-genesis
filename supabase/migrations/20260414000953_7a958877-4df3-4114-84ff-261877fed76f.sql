
-- Create function to auto-create default menus when a store is created
CREATE OR REPLACE FUNCTION public.create_default_store_menus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create header menu
  INSERT INTO public.store_menus (store_id, name, location, is_active)
  VALUES (NEW.id, 'Menu Principal', 'header', true)
  ON CONFLICT (store_id, location) DO NOTHING;

  -- Create footer menu
  INSERT INTO public.store_menus (store_id, name, location, is_active)
  VALUES (NEW.id, 'Menu Rodapé', 'footer', true)
  ON CONFLICT (store_id, location) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on stores table
CREATE TRIGGER trigger_create_default_menus
AFTER INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.create_default_store_menus();

-- Fix existing stores that are missing menus
INSERT INTO public.store_menus (store_id, name, location, is_active)
SELECT s.id, 'Menu Principal', 'header', true
FROM public.stores s
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_menus sm 
  WHERE sm.store_id = s.id AND sm.location = 'header'
)
ON CONFLICT (store_id, location) DO NOTHING;

INSERT INTO public.store_menus (store_id, name, location, is_active)
SELECT s.id, 'Menu Rodapé', 'footer', true
FROM public.stores s
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_menus sm 
  WHERE sm.store_id = s.id AND sm.location = 'footer'
)
ON CONFLICT (store_id, location) DO NOTHING;
