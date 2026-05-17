import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the store's configured ISO currency code (default 'BRL').
 * Cached for 30 min — currency rarely changes.
 */
export function useStoreCurrency(storeId?: string | null): string {
  const { data } = useQuery({
    queryKey: ["store-currency", storeId],
    queryFn: async () => {
      if (!storeId) return "BRL";
      const { data } = await supabase
        .from("stores")
        .select("currency")
        .eq("id", storeId)
        .maybeSingle();
      return (data as any)?.currency || "BRL";
    },
    enabled: !!storeId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  return data || "BRL";
}
