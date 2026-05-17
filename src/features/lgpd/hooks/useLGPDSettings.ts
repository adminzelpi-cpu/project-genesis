import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LGPDSettings {
  id: string;
  store_id: string;
  is_enabled: boolean;
  style_variant: 'dark_transparent' | 'light' | 'minimal';
  title: string;
  description: string;
  accept_button_text: string;
  reject_button_text: string;
  privacy_policy_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useLGPDSettings = (storeId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['lgpd-settings', storeId],
    queryFn: async () => {
      if (!storeId) return null;
      
      const { data, error } = await supabase
        .from('store_lgpd_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();
      
      if (error) throw error;
      return data as LGPDSettings | null;
    },
    enabled: !!storeId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<LGPDSettings>) => {
      if (!storeId) throw new Error("Store ID is required");

      // Check if settings exist
      const { data: existing } = await supabase
        .from('store_lgpd_settings')
        .select('id')
        .eq('store_id', storeId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('store_lgpd_settings')
          .update(updates)
          .eq('store_id', storeId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('store_lgpd_settings')
          .insert({ store_id: storeId, ...updates })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lgpd-settings', storeId] });
      toast.success("Configurações de LGPD salvas!");
    },
    onError: (error) => {
      console.error("Error updating LGPD settings:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
};

// Hook for public storefront access
export const usePublicLGPDSettings = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ['public-lgpd-settings', storeId],
    queryFn: async () => {
      if (!storeId) return null;
      
      const { data, error } = await supabase
        .from('store_lgpd_settings')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();
      
      if (error) throw error;
      return data as LGPDSettings | null;
    },
    enabled: !!storeId,
  });
};
