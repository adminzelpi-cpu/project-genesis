
-- Customer preferences table for storing extracted insights
CREATE TABLE public.customer_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  preference_type TEXT NOT NULL, -- body_measurements, style, color, size, general
  preference_key TEXT NOT NULL, -- e.g. 'peso', 'altura', 'cor_favorita', 'estilo'
  preference_value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'chat', -- chat, behavior, purchase
  confidence NUMERIC(3,2) DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, store_id, preference_type, preference_key)
);

ALTER TABLE public.customer_preferences ENABLE ROW LEVEL SECURITY;

-- Only service role can access (used by edge functions)
CREATE POLICY "Service role full access on customer_preferences"
  ON public.customer_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Customer activity log for tracking interactions
CREATE TABLE public.customer_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  session_id TEXT,
  user_auth_id UUID,
  activity_type TEXT NOT NULL, -- product_view, page_view, add_to_cart, purchase, favorite_add, favorite_remove, search, chat_message
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for tracking
CREATE POLICY "Anyone can insert activity logs"
  ON public.customer_activity_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role can read (used by edge functions)
CREATE POLICY "Service role can read activity logs"
  ON public.customer_activity_log
  FOR SELECT
  TO service_role
  USING (true);

-- Add customer_id to chat_conversations for linking
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_customer_preferences_lookup ON public.customer_preferences(customer_id, store_id);
CREATE INDEX idx_activity_log_customer ON public.customer_activity_log(customer_id, store_id);
CREATE INDEX idx_activity_log_session ON public.customer_activity_log(session_id, store_id);
CREATE INDEX idx_activity_log_auth ON public.customer_activity_log(user_auth_id, store_id);
CREATE INDEX idx_activity_log_type ON public.customer_activity_log(activity_type, store_id, created_at DESC);

-- Trigger to auto-update updated_at on preferences
CREATE TRIGGER update_customer_preferences_updated_at
  BEFORE UPDATE ON public.customer_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
