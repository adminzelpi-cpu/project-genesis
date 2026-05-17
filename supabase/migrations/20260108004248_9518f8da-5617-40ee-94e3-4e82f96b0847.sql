-- Adicionar colunas de cor para banners
ALTER TABLE public.store_home_banners
ADD COLUMN IF NOT EXISTS title_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS subtitle_color text DEFAULT '#ffffffcc',
ADD COLUMN IF NOT EXISTS button_bg_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS button_text_color text DEFAULT '#ffffff';

-- Adicionar colunas de cor para itens de categoria (featured categories)
ALTER TABLE public.store_home_items
ADD COLUMN IF NOT EXISTS title_color text DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS subtitle_color text DEFAULT '#ffffffcc';