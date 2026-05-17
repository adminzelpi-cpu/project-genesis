import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrackingConfig {
  id: string;
  store_id: string;
  // Meta
  meta_pixel_id: string | null;
  meta_access_token: string | null;
  meta_test_event_code: string | null;
  meta_enabled: boolean;
  // Google Ads
  google_ads_id: string | null;
  google_ads_conversion_label: string | null;
  google_ads_enabled: boolean;
  // GA4
  ga4_measurement_id: string | null;
  ga4_enabled: boolean;
  // TikTok
  tiktok_pixel_id: string | null;
  tiktok_access_token: string | null;
  tiktok_test_event_code: string | null;
  tiktok_enabled: boolean;
  // Pinterest
  pinterest_tag_id: string | null;
  pinterest_access_token: string | null;
  pinterest_enabled: boolean;
  // Google Enhanced Conversions
  google_enhanced_conversions_enabled: boolean;
  // Config
  exclude_shipping_from_value: boolean;
  created_at: string;
  updated_at: string;
}

export function useTrackingConfig(storeId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ["tracking-config", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      
      const { data, error } = await supabase
        .from("store_tracking_config")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();

      if (error) throw error;
      return data as TrackingConfig | null;
    },
    enabled: !!storeId,
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: Partial<TrackingConfig>) => {
      if (!storeId) throw new Error("Store ID required");

      const { data: existing } = await supabase
        .from("store_tracking_config")
        .select("id")
        .eq("store_id", storeId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("store_tracking_config")
          .update(updates)
          .eq("store_id", storeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_tracking_config")
          .insert({ store_id: storeId, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-config", storeId] });
      toast({
        title: "Configurações salvas",
        description: "As configurações de tracking foram atualizadas.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    config,
    isLoading,
    saveConfig: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
