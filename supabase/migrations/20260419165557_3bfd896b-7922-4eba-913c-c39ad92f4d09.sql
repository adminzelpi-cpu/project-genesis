-- ============= WhatsApp Marketing & Inbox =============

-- 1) Templates: cache local de templates da WABA (sincronizados da Meta + criados pelo lojista)
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  meta_template_id TEXT,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT NOT NULL DEFAULT 'MARKETING', -- MARKETING | UTILITY | AUTHENTICATION
  status TEXT NOT NULL DEFAULT 'PENDING',     -- PENDING | APPROVED | REJECTED | PAUSED
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  rejected_reason TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, name, language)
);
CREATE INDEX idx_whatsapp_templates_store ON public.whatsapp_templates(store_id);
CREATE INDEX idx_whatsapp_templates_status ON public.whatsapp_templates(store_id, status);

-- 2) Conversations: 1 por contato (telefone)
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES public.whatsapp_phone_numbers(id) ON DELETE SET NULL,
  contact_phone TEXT NOT NULL,                 -- E.164 sem '+' (ex: 5511999999999)
  contact_name TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',          -- open | closed
  assigned_to UUID,                             -- futuro: atendente
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, contact_phone)
);
CREATE INDEX idx_whatsapp_conv_store_recent ON public.whatsapp_conversations(store_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_whatsapp_conv_customer ON public.whatsapp_conversations(customer_id);

-- 3) Messages
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  wa_message_id TEXT,                           -- id retornado pela Meta
  direction TEXT NOT NULL,                      -- inbound | outbound
  type TEXT NOT NULL DEFAULT 'text',            -- text | template | image | document | etc
  body TEXT,
  template_name TEXT,
  template_variables JSONB,
  media_url TEXT,
  media_mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent',          -- sent | delivered | read | failed | received
  error_code TEXT,
  error_message TEXT,
  campaign_id UUID,                             -- FK adicionada abaixo
  sent_by UUID,                                 -- auth.uid do atendente, se outbound manual
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_msg_conv ON public.whatsapp_messages(conversation_id, created_at);
CREATE INDEX idx_whatsapp_msg_store ON public.whatsapp_messages(store_id, created_at DESC);
CREATE INDEX idx_whatsapp_msg_wa_id ON public.whatsapp_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- 4) Campaigns
CREATE TABLE public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES public.whatsapp_templates(id) ON DELETE RESTRICT,
  template_name_snapshot TEXT NOT NULL,
  template_language_snapshot TEXT NOT NULL DEFAULT 'pt_BR',
  audience_type TEXT NOT NULL,                  -- customers | abandoned_carts | manual
  audience_filter JSONB DEFAULT '{}'::jsonb,
  variables_template JSONB DEFAULT '{}'::jsonb, -- {"1": "{{customer_first_name}}", "2": "{{store_name}}"}
  status TEXT NOT NULL DEFAULT 'draft',         -- draft | sending | completed | failed | cancelled
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_camp_store ON public.whatsapp_campaigns(store_id, created_at DESC);

-- 5) Campaign recipients
CREATE TABLE public.whatsapp_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  name TEXT,
  variables JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',       -- pending | sent | delivered | read | failed
  wa_message_id TEXT,
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  error_code TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_camp_rec_campaign ON public.whatsapp_campaign_recipients(campaign_id, status);

ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_campaign_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL;

-- ============= RLS =============
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Helper: merchant da loja
-- (usa o padrão existente: stores.merchant_id = auth.uid())

-- TEMPLATES
CREATE POLICY "Merchant manages own templates" ON public.whatsapp_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()));

-- CONVERSATIONS
CREATE POLICY "Merchant manages own conversations" ON public.whatsapp_conversations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()));

-- MESSAGES
CREATE POLICY "Merchant manages own messages" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()));

-- CAMPAIGNS
CREATE POLICY "Merchant manages own campaigns" ON public.whatsapp_campaigns
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()));

-- CAMPAIGN RECIPIENTS
CREATE POLICY "Merchant manages own campaign recipients" ON public.whatsapp_campaign_recipients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id AND s.merchant_id = auth.uid()));

-- Triggers updated_at
CREATE TRIGGER trg_whatsapp_templates_updated BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_whatsapp_conversations_updated BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_whatsapp_campaigns_updated BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para inbox ao vivo
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_conversations REPLICA IDENTITY FULL;