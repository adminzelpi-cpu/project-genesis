import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";

export interface AbandonedCartAnalytics {
  total_abandoned_carts: number;
  total_emails_sent: number;
  total_opened: number;
  total_clicked: number;
  total_recovered: number;
  revenue_recovered: number;
  revenue_abandoned: number;
  daily_stats: Array<{
    date: string;
    abandoned: number;
    recovered: number;
  }>;
  by_email_sequence: Array<{
    email_type: string;
    sent: number;
    opened: number;
    clicked: number;
  }>;
}

export function useAbandonedCartAnalytics(daysBack: number = 30) {
  const { store } = useActiveStore();

  return useQuery({
    queryKey: ["abandoned-cart-analytics", store?.id, daysBack],
    queryFn: async (): Promise<AbandonedCartAnalytics> => {
      if (!store?.id) throw new Error("Store not found");

      const { data, error } = await supabase.rpc("get_abandoned_cart_analytics", {
        store_id_param: store.id,
        days_back: daysBack,
      });

      if (error) throw error;
      return data as unknown as AbandonedCartAnalytics;
    },
    enabled: !!store?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
