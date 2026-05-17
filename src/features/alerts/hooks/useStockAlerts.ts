import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StockAlert {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "new" | "acknowledged" | "resolved" | "ignored";
  metadata: {
    product_id?: string;
    variation_id?: string;
    current_stock?: number;
    threshold?: number;
  };
  created_at: string;
  last_occurrence: string;
}

export function useStockAlerts(storeId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["stock-alerts", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from("system_alerts")
        .select("*")
        .eq("store_id", storeId)
        .in("status", ["new", "acknowledged"])
        .or("title.ilike.%estoque%,title.ilike.%esgotado%")
        .order("severity", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as StockAlert[];
    },
    enabled: !!storeId,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("system_alerts")
        .update({ 
          status: "acknowledged",
          acknowledged_at: new Date().toISOString()
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-alerts", storeId] });
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("system_alerts")
        .update({ 
          status: "resolved",
          resolved_at: new Date().toISOString()
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-alerts", storeId] });
      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido.",
      });
    },
  });

  const newAlertsCount = alerts.filter(a => a.status === "new").length;
  const criticalAlerts = alerts.filter(a => a.severity === "high" || a.severity === "critical");

  return {
    alerts,
    isLoading,
    newAlertsCount,
    criticalAlerts,
    acknowledgeAlert: acknowledgeAlert.mutate,
    resolveAlert: resolveAlert.mutate,
  };
}
