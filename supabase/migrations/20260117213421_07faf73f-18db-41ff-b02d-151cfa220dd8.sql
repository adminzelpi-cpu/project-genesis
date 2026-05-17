
-- Create table for store announcements (top bar)
CREATE TABLE public.store_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  link TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add announcement bar settings to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS announcement_bar_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS announcement_bar_bg_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS announcement_bar_text_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS announcement_bar_speed INTEGER DEFAULT 30;

-- Enable RLS
ALTER TABLE public.store_announcements ENABLE ROW LEVEL SECURITY;

-- Public can view active announcements
CREATE POLICY "Anyone can view active announcements" 
ON public.store_announcements 
FOR SELECT 
USING (is_active = true);

-- Store owners can manage their announcements
CREATE POLICY "Store owners can manage announcements" 
ON public.store_announcements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE stores.id = store_id 
    AND stores.merchant_id = auth.uid()
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_store_announcements_updated_at
BEFORE UPDATE ON public.store_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_store_announcements_store_id ON public.store_announcements(store_id);
CREATE INDEX idx_store_announcements_active ON public.store_announcements(store_id, is_active, position);
