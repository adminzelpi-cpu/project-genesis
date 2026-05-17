
-- Drop the unique constraint on store_id,name to allow duplicate names from Twilio
ALTER TABLE public.whatsapp_templates DROP CONSTRAINT IF EXISTS whatsapp_templates_store_id_name_key;
