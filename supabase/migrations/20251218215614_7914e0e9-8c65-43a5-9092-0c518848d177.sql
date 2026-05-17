-- Create store_pages table for institutional pages
CREATE TABLE public.store_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  is_published BOOLEAN DEFAULT false,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, slug)
);

-- Enable RLS
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Merchants can view their own store pages"
ON public.store_pages
FOR SELECT
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
);

CREATE POLICY "Merchants can create pages for their stores"
ON public.store_pages
FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
);

CREATE POLICY "Merchants can update their own store pages"
ON public.store_pages
FOR UPDATE
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
);

CREATE POLICY "Merchants can delete their own store pages"
ON public.store_pages
FOR DELETE
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
);

-- Public can view published pages
CREATE POLICY "Anyone can view published pages"
ON public.store_pages
FOR SELECT
USING (is_published = true);

-- Create trigger for updated_at
CREATE TRIGGER update_store_pages_updated_at
BEFORE UPDATE ON public.store_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();