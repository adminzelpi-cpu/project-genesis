
-- Table to map custom domains to stores
CREATE TABLE public.custom_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT custom_domains_domain_unique UNIQUE(domain)
);

-- Enable RLS
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- Public can look up domains (needed for routing resolution)
CREATE POLICY "Anyone can look up domains"
  ON public.custom_domains FOR SELECT
  USING (true);

-- Only store owner can manage their domains
CREATE POLICY "Merchants can manage their custom domains"
  ON public.custom_domains FOR ALL
  USING (EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = custom_domains.store_id
    AND stores.merchant_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = custom_domains.store_id
    AND stores.merchant_id = auth.uid()
  ));

-- Index for fast domain lookups
CREATE INDEX idx_custom_domains_domain ON public.custom_domains(domain);
CREATE INDEX idx_custom_domains_store_id ON public.custom_domains(store_id);

-- Updated_at trigger
CREATE TRIGGER update_custom_domains_updated_at
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
