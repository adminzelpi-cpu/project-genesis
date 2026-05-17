import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { toast } from "@/hooks/use-toast";

export interface EmailSettings {
  id?: string;
  store_id: string;
  order_confirmed_enabled: boolean;
  order_preparing_enabled: boolean;
  order_shipped_enabled: boolean;
  order_delivered_enabled: boolean;
  order_cancelled_enabled: boolean;
  payment_confirmed_enabled: boolean;
  payment_failed_enabled: boolean;
  boleto_generated_enabled: boolean;
  pix_generated_enabled: boolean;
  pix_expired_enabled: boolean;
  welcome_enabled: boolean;
  tracking_code_enabled: boolean;
  tracking_code_auto_send_enabled: boolean;
  refund_processed_enabled: boolean;
  invoice_generated_enabled: boolean;
  abandoned_cart_enabled: boolean;
  abandoned_cart_delay_1: number;
  abandoned_cart_delay_2: number;
  abandoned_cart_delay_3: number;
  abandoned_cart_subject_1: string;
  abandoned_cart_preheader_1: string;
  abandoned_cart_body_1: string;
  abandoned_cart_enabled_1: boolean;
  abandoned_cart_subject_2: string;
  abandoned_cart_preheader_2: string;
  abandoned_cart_body_2: string;
  abandoned_cart_enabled_2: boolean;
  abandoned_cart_subject_3: string;
  abandoned_cart_preheader_3: string;
  abandoned_cart_body_3: string;
  abandoned_cart_enabled_3: boolean;
  sender_name: string | null;
  reply_to_email: string | null;
}

const defaultSettings: Omit<EmailSettings, "store_id"> = {
  order_confirmed_enabled: true,
  order_preparing_enabled: true,
  order_shipped_enabled: true,
  order_delivered_enabled: true,
  order_cancelled_enabled: true,
  payment_confirmed_enabled: true,
  payment_failed_enabled: true,
  boleto_generated_enabled: true,
  pix_generated_enabled: true,
  pix_expired_enabled: true,
  welcome_enabled: true,
  tracking_code_enabled: true,
  tracking_code_auto_send_enabled: true,
  refund_processed_enabled: true,
  invoice_generated_enabled: true,
  abandoned_cart_enabled: true,
  abandoned_cart_delay_1: 60,
  abandoned_cart_delay_2: 1440,
  abandoned_cart_delay_3: 4320,
  abandoned_cart_subject_1: "🛒 Você esqueceu algo no carrinho, {{customer_name}}!",
  abandoned_cart_preheader_1: "Os itens que você escolheu ainda estão aqui esperando por você.",
  abandoned_cart_body_1: "Olá {{customer_name}}, notamos que você deixou alguns itens no seu carrinho. Sabemos que às vezes a vida acontece - por isso guardamos tudo pra você!",
  abandoned_cart_enabled_1: true,
  abandoned_cart_subject_2: "⏰ Seus produtos ainda estão esperando por você",
  abandoned_cart_preheader_2: "Não deixe escapar! Seus itens estão reservados por tempo limitado.",
  abandoned_cart_body_2: "Ei {{customer_name}}, os produtos que você selecionou continuam disponíveis. Muitos clientes estão de olho nesses mesmos itens - garanta o seu antes que acabe!",
  abandoned_cart_enabled_2: true,
  abandoned_cart_subject_3: "🔥 Última chance! Seu carrinho vai expirar",
  abandoned_cart_preheader_3: "Esta é sua última chance de garantir os produtos do seu carrinho.",
  abandoned_cart_body_3: "{{customer_name}}, esta é nossa última tentativa de te lembrar. Os itens do seu carrinho estão prestes a expirar. Finalize agora e receba em poucos dias!",
  abandoned_cart_enabled_3: true,
  sender_name: null,
  reply_to_email: null,
};

export function useEmailSettings() {
  const { store: activeStore } = useActiveStore();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["email-settings", activeStore?.id],
    queryFn: async () => {
      if (!activeStore?.id) return null;

      const { data, error } = await supabase
        .from("store_email_settings")
        .select("*")
        .eq("store_id", activeStore.id)
        .maybeSingle();

      if (error) throw error;

      // Return existing settings or default values
      return data || { ...defaultSettings, store_id: activeStore.id };
    },
    enabled: !!activeStore?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<EmailSettings>) => {
      if (!activeStore?.id) throw new Error("No active store");

      // Check if settings exist
      const { data: existing } = await supabase
        .from("store_email_settings")
        .select("id")
        .eq("store_id", activeStore.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("store_email_settings")
          .update(updates)
          .eq("store_id", activeStore.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("store_email_settings")
          .insert({ ...defaultSettings, ...updates, store_id: activeStore.id });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings", activeStore?.id] });
      toast({
        title: "Configurações salvas",
        description: "As configurações de e-mail foram atualizadas.",
      });
    },
    onError: (error) => {
      console.error("Error updating email settings:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}
