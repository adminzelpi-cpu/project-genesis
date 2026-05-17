
-- 1. Create chat_analytics table
CREATE TABLE public.chat_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for store queries
CREATE INDEX idx_chat_analytics_store_id ON public.chat_analytics(store_id);
CREATE INDEX idx_chat_analytics_event_type ON public.chat_analytics(store_id, event_type);
CREATE INDEX idx_chat_analytics_created_at ON public.chat_analytics(store_id, created_at DESC);

-- RLS
ALTER TABLE public.chat_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (anonymous storefront visitors)
CREATE POLICY "Anyone can insert chat analytics"
  ON public.chat_analytics FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores WHERE id = chat_analytics.store_id AND is_active = true
  ));

-- Merchants can view their store analytics
CREATE POLICY "Merchants can view chat analytics"
  ON public.chat_analytics FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores WHERE id = chat_analytics.store_id AND merchant_id = auth.uid()
  ));

-- 2. Add new columns to store_chat_settings
ALTER TABLE public.store_chat_settings
  ADD COLUMN IF NOT EXISTS tone TEXT NOT NULL DEFAULT 'casual',
  ADD COLUMN IF NOT EXISTS proactivity_level TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS proactive_delay_seconds INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS whatsapp_fallback TEXT;
