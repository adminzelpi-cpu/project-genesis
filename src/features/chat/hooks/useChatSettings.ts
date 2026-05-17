import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChatSettings {
  is_enabled: boolean;
  assistant_name: string;
  welcome_message: string | null;
  primary_color: string | null;
  tone: string;
  proactivity_level: string;
  proactive_delay_seconds: number;
  whatsapp_fallback: string | null;
  avatar_url: string | null;
}

export function useChatSettings(storeId: string | undefined) {
  return useQuery({
    queryKey: ["chat-settings", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const { data, error } = await supabase
        .from("store_chat_settings")
        .select("is_enabled, assistant_name, welcome_message, primary_color, tone, proactivity_level, proactive_delay_seconds, whatsapp_fallback, avatar_url")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data as ChatSettings | null;
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}
