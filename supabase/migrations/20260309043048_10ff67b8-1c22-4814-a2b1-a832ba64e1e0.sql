ALTER TABLE public.store_menu_items 
ADD COLUMN footer_section text DEFAULT NULL;

COMMENT ON COLUMN public.store_menu_items.footer_section IS 'For footer menus: "help" for Precisa de Ajuda section, "institutional" for Institucional section. NULL for header menus.';