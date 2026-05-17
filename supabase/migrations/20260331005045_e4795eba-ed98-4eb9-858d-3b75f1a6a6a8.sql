
-- ============================================
-- WHATSAPP MARKETING MODULE - Database Schema
-- ============================================

-- Enum for provider type (portability)
CREATE TYPE public.whatsapp_provider_type AS ENUM ('twilio', 'meta_cloud_api');

-- Enum for message direction
CREATE TYPE public.whatsapp_message_direction AS ENUM ('inbound', 'outbound');

-- Enum for message status
CREATE TYPE public.whatsapp_message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed', 'undelivered');

-- Enum for template status
CREATE TYPE public.whatsapp_template_status AS ENUM ('pending', 'approved', 'rejected');

-- Enum for campaign status
CREATE TYPE public.whatsapp_campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'cancelled');

-- Enum for automation trigger type
CREATE TYPE public.whatsapp_automation_trigger AS ENUM ('abandoned_cart', 'post_purchase', 'welcome', 'birthday', 'restock', 'custom');

-- Enum for conversation status
CREATE TYPE public.whatsapp_conversation_status AS ENUM ('active', 'expired', 'closed');

-- ============================================
-- 1. WhatsApp Providers (config per store)
-- ============================================
CREATE TABLE public.whatsapp_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider_type whatsapp_provider_type NOT NULL DEFAULT 'twilio',
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

ALTER TABLE public.whatsapp_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage their whatsapp provider"
  ON public.whatsapp_providers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_providers.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_providers.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

-- ============================================
-- 2. WhatsApp Phone Numbers
-- ============================================
CREATE TABLE public.whatsapp_phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  display_name TEXT,
  provider_phone_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, phone_number)
);

ALTER TABLE public.whatsapp_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage their whatsapp phone numbers"
  ON public.whatsapp_phone_numbers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_phone_numbers.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_phone_numbers.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

-- ============================================
-- 3. WhatsApp Templates
-- ============================================
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT NOT NULL DEFAULT 'MARKETING',
  status whatsapp_template_status NOT NULL DEFAULT 'pending',
  header_type TEXT,
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '[]'::jsonb,
  provider_template_id TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, name)
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage their whatsapp templates"
  ON public.whatsapp_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_templates.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_templates.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

-- ============================================
-- 4. WhatsApp Campaigns
-- ============================================
CREATE TABLE public.whatsapp_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES public.whatsapp_templates(id),
  status whatsapp_campaign_status NOT NULL DEFAULT 'draft',
  segment_filter JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage their whatsapp campaigns"
  ON public.whatsapp_campaigns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_campaigns.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_campaigns.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

-- ============================================
-- 5. WhatsApp Campaign Recipients
-- ============================================
CREATE TABLE public.whatsapp_campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  phone_number TEXT NOT NULL,
  status whatsapp_message_status NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their campaign recipients"
  ON public.whatsapp_campaign_recipients FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM whatsapp_campaigns wc
    JOIN stores s ON s.id = wc.store_id
    WHERE wc.id = whatsapp_campaign_recipients.campaign_id
    AND (s.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))
  ));

-- ============================================
-- 6. WhatsApp Messages (all messages log)
-- ============================================
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  conversation_id UUID,
  direction whatsapp_message_direction NOT NULL,
  phone_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  template_name TEXT,
  template_variables JSONB,
  provider_message_id TEXT,
  status whatsapp_message_status NOT NULL DEFAULT 'queued',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their whatsapp messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_messages.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

-- ============================================
-- 7. WhatsApp Conversations (24h window tracking)
-- ============================================
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  phone_number TEXT NOT NULL,
  status whatsapp_conversation_status NOT NULL DEFAULT 'active',
  last_customer_message_at TIMESTAMPTZ,
  last_bot_message_at TIMESTAMPTZ,
  is_ai_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage their whatsapp conversations"
  ON public.whatsapp_conversations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_conversations.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_conversations.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

-- ============================================
-- 8. WhatsApp Automations (behavioral triggers)
-- ============================================
CREATE TABLE public.whatsapp_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type whatsapp_automation_trigger NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id),
  is_active BOOLEAN NOT NULL DEFAULT false,
  delay_minutes INTEGER NOT NULL DEFAULT 60,
  conditions JSONB DEFAULT '{}'::jsonb,
  max_sends_per_customer INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage their whatsapp automations"
  ON public.whatsapp_automations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_automations.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_automations.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

-- ============================================
-- 9. WhatsApp Opt-ins (consent tracking)
-- ============================================
CREATE TABLE public.whatsapp_opt_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  phone_number TEXT NOT NULL,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  opted_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opted_out_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'checkout',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, phone_number)
);

ALTER TABLE public.whatsapp_opt_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view their whatsapp opt-ins"
  ON public.whatsapp_opt_ins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_opt_ins.store_id AND (stores.merchant_id = auth.uid() OR has_role(auth.uid(), 'sellify_admin'))));

CREATE POLICY "Anyone can opt-in during checkout"
  ON public.whatsapp_opt_ins FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_opt_ins.store_id AND stores.is_active = true));

CREATE POLICY "Anyone can update opt-in status"
  ON public.whatsapp_opt_ins FOR UPDATE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = whatsapp_opt_ins.store_id AND stores.is_active = true));

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_whatsapp_messages_store_phone ON public.whatsapp_messages(store_id, phone_number);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_conversations_store_phone ON public.whatsapp_conversations(store_id, phone_number);
CREATE INDEX idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_campaign_recipients_campaign ON public.whatsapp_campaign_recipients(campaign_id);
CREATE INDEX idx_whatsapp_opt_ins_store_phone ON public.whatsapp_opt_ins(store_id, phone_number);
CREATE INDEX idx_whatsapp_automations_store_trigger ON public.whatsapp_automations(store_id, trigger_type);

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE TRIGGER update_whatsapp_providers_updated_at BEFORE UPDATE ON public.whatsapp_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_phone_numbers_updated_at BEFORE UPDATE ON public.whatsapp_phone_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_campaigns_updated_at BEFORE UPDATE ON public.whatsapp_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON public.whatsapp_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_automations_updated_at BEFORE UPDATE ON public.whatsapp_automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
