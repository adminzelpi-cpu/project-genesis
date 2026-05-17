-- Create brands table per store
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, slug)
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Merchants can manage their store brands
CREATE POLICY "Merchants can manage their store brands"
ON public.brands
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = brands.store_id
    AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = brands.store_id
    AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'::app_role))
  )
);

-- Public can view brands from active stores
CREATE POLICY "Public can view brands from active stores"
ON public.brands
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = brands.store_id
    AND stores.is_active = true
  )
);
