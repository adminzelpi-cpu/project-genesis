import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/features/auth";

export interface CustomerStore {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  favicon_url: string | null;
  theme_primary_color: string | null;
  theme_secondary_color: string | null;
  button_color: string | null;
  button_hover_color: string | null;
  button_text_color: string | null;
  primary_text_color: string | null;
  secondary_text_color: string | null;
  button_border_radius: string | null;
  element_border_radius: string | null;
  font_family: string | null;
  // Header
  header_bg_color: string | null;
  header_text_color: string | null;
  header_layout: string | null;
  header_show_favorites: boolean | null;
  header_show_search: boolean | null;
  header_mobile_logo_position: string | null;
  // Footer
  footer_bg_color: string | null;
  footer_text_color: string | null;
  footer_newsletter_enabled: boolean | null;
  footer_newsletter_title: string | null;
  footer_newsletter_subtitle: string | null;
  footer_show_payment_methods: boolean | null;
  footer_show_social_links: boolean | null;
  footer_copyright_text: string | null;
  // Contact / social used by footer
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  tiktok: string | null;
  email: string | null;
  phone: string | null;
}

export function useCustomerStore() {
  const { customer } = useCustomerAuth();
  const storeId = customer?.store_id ?? null;

  return useQuery({
    queryKey: ["customer-store", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<CustomerStore | null> => {
      if (!storeId) return null;

      const { data: store, error } = await supabase
        .from("stores")
        .select(`
          id,
          name,
          slug,
          logo_url,
          favicon_url,
          theme_primary_color,
          theme_secondary_color,
          button_color,
          button_hover_color,
          button_text_color,
          primary_text_color,
          secondary_text_color,
          button_border_radius,
          element_border_radius,
          font_family,
          header_bg_color,
          header_text_color,
          header_layout,
          header_show_favorites,
          header_show_search,
          header_mobile_logo_position,
          footer_bg_color,
          footer_text_color,
          footer_newsletter_enabled,
          footer_newsletter_title,
          footer_newsletter_subtitle,
          footer_show_payment_methods,
          footer_show_social_links,
          footer_copyright_text,
          instagram,
          facebook,
          whatsapp,
          tiktok,
          email,
          phone
        `)
        .eq("id", storeId)
        .single();

      if (error || !store) return null;
      return store as unknown as CustomerStore;
    },
  });
}
