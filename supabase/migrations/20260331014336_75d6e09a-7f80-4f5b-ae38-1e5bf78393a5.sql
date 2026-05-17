
-- Add twilio_sid and content_type columns to whatsapp_templates
ALTER TABLE public.whatsapp_templates 
  ADD COLUMN IF NOT EXISTS twilio_sid TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT;

-- Create unique constraint for upsert by store_id + twilio_sid
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_templates_store_twilio_sid 
  ON public.whatsapp_templates (store_id, twilio_sid) 
  WHERE twilio_sid IS NOT NULL;
