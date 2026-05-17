
-- Newsletter subscribers table
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'footer',
  status TEXT NOT NULL DEFAULT 'active',
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, email)
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND is_active = true)
);

CREATE POLICY "Store owners can view subscribers"
ON public.newsletter_subscribers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE id = store_id AND merchant_id = auth.uid()
  )
);

CREATE POLICY "Store owners can update subscribers"
ON public.newsletter_subscribers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE id = store_id AND merchant_id = auth.uid()
  )
);

CREATE POLICY "Store owners can delete subscribers"
ON public.newsletter_subscribers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.stores 
    WHERE id = store_id AND merchant_id = auth.uid()
  )
);

CREATE TRIGGER update_newsletter_subscribers_updated_at
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_newsletter_subscribers_store_id ON public.newsletter_subscribers(store_id);
CREATE INDEX idx_newsletter_subscribers_status ON public.newsletter_subscribers(store_id, status);
