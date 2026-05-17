import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RefundParams {
  orderId: string;
  amount?: number;
  reason?: string;
}

export function useRefundOrder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RefundParams) => {
      const { data, error } = await supabase.functions.invoke("refund-payment", {
        body: params,
      });

      if (error) {
        let message = "Erro ao processar reembolso";
        try {
          const ctx = (error as any)?.context;
          const resp = ctx?.response ?? ctx;
          if (resp && typeof resp.json === "function") {
            const parsed = await resp.json();
            message = parsed?.error || message;
          } else if (error.message && !error.message.includes("non-2xx")) {
            message = error.message;
          }
        } catch {
          if (error.message && !error.message.includes("non-2xx")) {
            message = error.message;
          }
        }
        throw new Error(message);
      }

      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Reembolso processado",
        description: `Valor de R$ ${Number(data?.refundAmount || 0).toFixed(2)} reembolsado com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Falha no reembolso",
        description: error.message,
      });
    },
  });
}
