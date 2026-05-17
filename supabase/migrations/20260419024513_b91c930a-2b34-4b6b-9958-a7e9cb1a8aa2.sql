-- Cleanup: drop all old WhatsApp tables
DROP TABLE IF EXISTS public.whatsapp_orchestration_queue CASCADE;
DROP TABLE IF EXISTS public.whatsapp_automations CASCADE;
DROP TABLE IF EXISTS public.whatsapp_campaign_recipients CASCADE;
DROP TABLE IF EXISTS public.whatsapp_campaigns CASCADE;
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;
DROP TABLE IF EXISTS public.whatsapp_conversations CASCADE;
DROP TABLE IF EXISTS public.whatsapp_opt_ins CASCADE;
DROP TABLE IF EXISTS public.whatsapp_templates CASCADE;
DROP TABLE IF EXISTS public.whatsapp_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.whatsapp_providers CASCADE;
DROP TABLE IF EXISTS public.whatsapp_connections CASCADE;

-- New table: WhatsApp Business Account connections (one per store)
CREATE TABLE public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,
  business_id TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  meta_user_id TEXT,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phone numbers registered under each WABA
CREATE TABLE public.whatsapp_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  display_phone_number TEXT NOT NULL,
  verified_name TEXT,
  quality_rating TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_phone_numbers_connection ON public.whatsapp_phone_numbers(connection_id);
CREATE INDEX idx_wa_phone_numbers_store ON public.whatsapp_phone_numbers(store_id);

-- RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Merchants can manage their own store's WhatsApp connection
CREATE POLICY "Merchants view own whatsapp connection"
  ON public.whatsapp_connections FOR SELECT
  USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants insert own whatsapp connection"
  ON public.whatsapp_connections FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants update own whatsapp connection"
  ON public.whatsapp_connections FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants delete own whatsapp connection"
  ON public.whatsapp_connections FOR DELETE
  USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants view own whatsapp phone numbers"
  ON public.whatsapp_phone_numbers FOR SELECT
  USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants insert own whatsapp phone numbers"
  ON public.whatsapp_phone_numbers FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants update own whatsapp phone numbers"
  ON public.whatsapp_phone_numbers FOR UPDATE
  USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

CREATE POLICY "Merchants delete own whatsapp phone numbers"
  ON public.whatsapp_phone_numbers FOR DELETE
  USING (store_id IN (SELECT id FROM public.stores WHERE merchant_id = auth.uid()));

-- Service role full access (edge functions use service role)
CREATE POLICY "Service role full access connections"
  ON public.whatsapp_connections FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access phone numbers"
  ON public.whatsapp_phone_numbers FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Triggers para updated_at
CREATE TRIGGER set_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_whatsapp_phone_numbers_updated_at
  BEFORE UPDATE ON public.whatsapp_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();