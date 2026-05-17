
-- Table to store Meta OAuth connections per store
CREATE TABLE public.meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  meta_user_id TEXT NOT NULL,
  meta_user_name TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  selected_pages JSONB DEFAULT '[]',
  selected_ad_accounts JSONB DEFAULT '[]',
  selected_catalogs JSONB DEFAULT '[]',
  selected_pixels JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id)
);

ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their store meta connections"
ON public.meta_connections
FOR ALL
TO authenticated
USING (
  store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
);

CREATE TRIGGER update_meta_connections_updated_at
  BEFORE UPDATE ON public.meta_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
