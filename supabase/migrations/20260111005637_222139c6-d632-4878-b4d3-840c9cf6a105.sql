-- Add footer configuration columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS footer_bg_color TEXT DEFAULT '#1f2937',
ADD COLUMN IF NOT EXISTS footer_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS footer_newsletter_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS footer_newsletter_title TEXT DEFAULT 'Receba novidades e promoções',
ADD COLUMN IF NOT EXISTS footer_newsletter_subtitle TEXT DEFAULT 'Cadastre-se e seja o primeiro a saber sobre ofertas exclusivas',
ADD COLUMN IF NOT EXISTS footer_show_payment_methods BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS footer_show_social_links BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS footer_copyright_text TEXT;