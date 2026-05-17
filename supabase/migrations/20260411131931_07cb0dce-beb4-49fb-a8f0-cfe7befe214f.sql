
-- Add Meta Cloud API specific columns to whatsapp_providers
ALTER TABLE public.whatsapp_providers 
  ADD COLUMN IF NOT EXISTS waba_id TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_verify_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex');

-- Add Meta-specific fields to whatsapp_phone_numbers
ALTER TABLE public.whatsapp_phone_numbers 
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT;

-- Replace twilio_sid with meta_template_id on templates (keep provider_template_id as generic)
ALTER TABLE public.whatsapp_templates 
  ADD COLUMN IF NOT EXISTS meta_template_id TEXT;

-- Add retry_count and idempotency_key to whatsapp_messages
ALTER TABLE public.whatsapp_messages 
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index for idempotency on webhook processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_provider_msg_id 
  ON public.whatsapp_messages(provider_message_id) 
  WHERE provider_message_id IS NOT NULL;

-- Create unique index for idempotency key  
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_idempotency 
  ON public.whatsapp_messages(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Update default provider type to meta_cloud_api
ALTER TABLE public.whatsapp_providers 
  ALTER COLUMN provider_type SET DEFAULT 'meta_cloud_api';
