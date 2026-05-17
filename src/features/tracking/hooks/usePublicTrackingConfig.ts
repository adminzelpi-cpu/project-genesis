import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicTrackingConfig {
  meta_pixel_id: string | null;
  meta_enabled: boolean;
  google_ads_id: string | null;
  google_ads_conversion_label: string | null;
  google_ads_enabled: boolean;
  ga4_measurement_id: string | null;
  ga4_enabled: boolean;
  tiktok_pixel_id: string | null;
  tiktok_enabled: boolean;
  pinterest_tag_id: string | null;
  pinterest_enabled: boolean;
  exclude_shipping_from_value: boolean;
}

export function usePublicTrackingConfig(storeId: string | undefined) {
  return useQuery({
    queryKey: ["public-tracking-config", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      
      // Fetch only public fields (no access tokens)
      const { data, error } = await supabase
        .from("store_tracking_config")
        .select(`
          meta_pixel_id,
          meta_enabled,
          google_ads_id,
          google_ads_conversion_label,
          google_ads_enabled,
          ga4_measurement_id,
          ga4_enabled,
          tiktok_pixel_id,
          tiktok_enabled,
          pinterest_tag_id,
          pinterest_enabled,
          exclude_shipping_from_value
        `)
        .eq("store_id", storeId)
        .maybeSingle();

      if (error) throw error;
      return data as PublicTrackingConfig | null;
    },
    enabled: !!storeId,
  });
}
