ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS button_text_color text,
  ADD COLUMN IF NOT EXISTS primary_text_color text;

COMMENT ON COLUMN public.stores.button_text_color IS 'Hex color for button text. NULL = automatic contrast based on button background.';
COMMENT ON COLUMN public.stores.primary_text_color IS 'Hex color for text/icons on primary color surfaces (e.g., cart badge). NULL = automatic contrast.';