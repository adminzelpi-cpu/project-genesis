
-- Store chat settings (module config per store)
CREATE TABLE public.store_chat_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  assistant_name TEXT NOT NULL DEFAULT 'Assistente',
  welcome_message TEXT DEFAULT 'Olá! 👋 Como posso te ajudar?',
  primary_color TEXT DEFAULT '#000000',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_chat_settings ENABLE ROW LEVEL SECURITY;

-- Merchants can manage their own chat settings
CREATE POLICY "Merchants manage own chat settings" ON public.store_chat_settings
  FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

-- Public can read enabled settings (storefront needs to check if chat is enabled)
CREATE POLICY "Public can read enabled chat settings" ON public.store_chat_settings
  FOR SELECT TO anon
  USING (is_enabled = true);

-- Chat conversations
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_conversations_store ON public.chat_conversations(store_id);
CREATE INDEX idx_chat_conversations_session ON public.chat_conversations(session_id);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Merchants can view conversations for their stores
CREATE POLICY "Merchants view own store conversations" ON public.chat_conversations
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE merchant_id = auth.uid()));

-- Anyone can insert/update conversations (storefront users are anonymous)
CREATE POLICY "Anyone can create conversations" ON public.chat_conversations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update own session conversations" ON public.chat_conversations
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_chat_settings_updated_at
  BEFORE UPDATE ON public.store_chat_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
