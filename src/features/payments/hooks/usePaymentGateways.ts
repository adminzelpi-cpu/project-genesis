import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PaymentGateway {
  id: string;
  store_id: string;
  gateway_type: string;
  is_active: boolean;
  is_sandbox: boolean;
  display_name: string | null;
  verification_status: string | null;
  last_verified_at: string | null;
  oauth_user_id: string | null;
  oauth_expires_at: string | null;
  credentials: Record<string, unknown> | null;
  accept_credit_card: boolean;
  accept_pix: boolean;
  accept_boleto: boolean;
  created_at: string;
  updated_at: string;
}

export function usePaymentGateways(storeId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: gateways, isLoading } = useQuery({
    queryKey: ["payment-gateways", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from("store_payment_gateways")
        .select("*")
        .eq("store_id", storeId);

      if (error) throw error;
      return data as PaymentGateway[];
    },
    enabled: !!storeId,
  });

  const toggleGateway = useMutation({
    mutationFn: async ({ gatewayId, isActive }: { gatewayId: string; isActive: boolean }) => {
      // If activating, deactivate all other gateways for this store first
      if (isActive && storeId) {
        const { error: deactivateError } = await supabase
          .from("store_payment_gateways")
          .update({ is_active: false })
          .eq("store_id", storeId)
          .neq("id", gatewayId);

        if (deactivateError) throw deactivateError;
      }

      const { error } = await supabase
        .from("store_payment_gateways")
        .update({ is_active: isActive })
        .eq("id", gatewayId);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["payment-gateways", storeId] });
      toast({
        title: "Gateway atualizado",
        description: isActive
          ? "Gateway ativado. Os outros gateways foram desativados automaticamente."
          : "Gateway desativado.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    },
  });

  const disconnectGateway = useMutation({
    mutationFn: async (gatewayId: string) => {
      const { error } = await supabase
        .from("store_payment_gateways")
        .delete()
        .eq("id", gatewayId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-gateways", storeId] });
      toast({
        title: "Gateway desconectado",
        description: "O gateway foi removido da sua loja.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    },
  });

  const getGatewayByType = (type: string) => {
    return gateways?.find((g) => g.gateway_type === type);
  };

  return {
    gateways,
    isLoading,
    toggleGateway,
    disconnectGateway,
    getGatewayByType,
  };
}
