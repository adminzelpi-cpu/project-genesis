-- Create store_menus table for menu definitions
CREATE TABLE public.store_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'header', -- header, footer, sidebar
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, location)
);

-- Create store_menu_items table for menu items
CREATE TABLE public.store_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.store_menus(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.store_menu_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  link_type TEXT NOT NULL DEFAULT 'custom', -- custom, page, category, product
  link_reference_id UUID, -- ID of page/category/product if link_type is not custom
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  open_in_new_tab BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_menu_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for store_menus
CREATE POLICY "Merchants can view their store menus"
ON public.store_menus FOR SELECT
USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can create menus for their stores"
ON public.store_menus FOR INSERT
WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can update their store menus"
ON public.store_menus FOR UPDATE
USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants can delete their store menus"
ON public.store_menus FOR DELETE
USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Anyone can view active menus from active stores"
ON public.store_menus FOR SELECT
USING (is_active = true AND store_id IN (SELECT id FROM public.stores WHERE is_active = true));

-- RLS policies for store_menu_items
CREATE POLICY "Merchants can view their menu items"
ON public.store_menu_items FOR SELECT
USING (menu_id IN (
  SELECT id FROM public.store_menus WHERE store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
));

CREATE POLICY "Merchants can create menu items"
ON public.store_menu_items FOR INSERT
WITH CHECK (menu_id IN (
  SELECT id FROM public.store_menus WHERE store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
));

CREATE POLICY "Merchants can update their menu items"
ON public.store_menu_items FOR UPDATE
USING (menu_id IN (
  SELECT id FROM public.store_menus WHERE store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
));

CREATE POLICY "Merchants can delete their menu items"
ON public.store_menu_items FOR DELETE
USING (menu_id IN (
  SELECT id FROM public.store_menus WHERE store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
));

CREATE POLICY "Anyone can view active menu items"
ON public.store_menu_items FOR SELECT
USING (is_active = true AND menu_id IN (
  SELECT id FROM public.store_menus WHERE is_active = true
));

-- Triggers for updated_at
CREATE TRIGGER update_store_menus_updated_at
BEFORE UPDATE ON public.store_menus
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_menu_items_updated_at
BEFORE UPDATE ON public.store_menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();