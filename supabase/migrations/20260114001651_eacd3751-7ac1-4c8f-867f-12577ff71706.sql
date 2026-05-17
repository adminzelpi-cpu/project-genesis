-- Create table for storing generated policies
CREATE TABLE public.store_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL, -- 'terms', 'privacy', 'returns', 'shipping'
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  is_published BOOLEAN DEFAULT false,
  is_auto_generated BOOLEAN DEFAULT true,
  generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(store_id, policy_type)
);

-- Enable RLS
ALTER TABLE public.store_policies ENABLE ROW LEVEL SECURITY;

-- Merchants can view their policies
CREATE POLICY "Merchants can view their store policies"
  ON public.store_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_policies.store_id
      AND stores.merchant_id = auth.uid()
    )
  );

-- Merchants can manage their policies
CREATE POLICY "Merchants can manage their store policies"
  ON public.store_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_policies.store_id
      AND stores.merchant_id = auth.uid()
    )
  );

-- Public can view published policies
CREATE POLICY "Anyone can view published policies"
  ON public.store_policies
  FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_policies.store_id
      AND stores.is_active = true
    )
  );

-- Add fields for policy generation to stores if needed
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS policies_auto_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS policies_generated_at TIMESTAMP WITH TIME ZONE;