-- Create store_media table to store media library files
CREATE TABLE public.store_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  file_size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  folder TEXT DEFAULT 'root',
  tags TEXT[],
  used_in_products INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_media ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_store_media_store_id ON public.store_media(store_id);
CREATE INDEX idx_store_media_file_type ON public.store_media(file_type);
CREATE INDEX idx_store_media_folder ON public.store_media(folder);
CREATE INDEX idx_store_media_created_at ON public.store_media(created_at DESC);

-- RLS policies for store_media
-- View: Store owners can view their own media
CREATE POLICY "Users can view their store media"
ON public.store_media
FOR SELECT
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
);

-- Insert: Store owners can add media
CREATE POLICY "Users can add media to their store"
ON public.store_media
FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
);

-- Update: Store owners can update their media
CREATE POLICY "Users can update their store media"
ON public.store_media
FOR UPDATE
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
);

-- Delete: Store owners can delete their media
CREATE POLICY "Users can delete their store media"
ON public.store_media
FOR DELETE
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE merchant_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_store_media_updated_at
BEFORE UPDATE ON public.store_media
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();