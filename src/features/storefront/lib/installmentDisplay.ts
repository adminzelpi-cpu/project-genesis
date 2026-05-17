import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { formatCurrency } from "@/lib/utils";

const MIN_DISPLAY_INSTALLMENT_VALUE = 20; // R$ 20 minimum for display

interface InstallmentConfig {
  freeInstallments: number;
  maxInstallments: number;
}

const defaultConfig: InstallmentConfig = {
  freeInstallments: 4,
  maxInstallments: 12,
};

/**
 * Hook to fetch installment config for the current store.
 * Uses react-query for caching — safe to call from multiple components.
 */
export function useStoreInstallmentConfig(storeSlugOverride?: string) {
  const contextSlug = useStoreSlug();
  const storeSlug = storeSlugOverride || contextSlug;

  // Step 1: Get store ID from slug (cached)
  const { data: storeId } = useQuery({
    queryKey: ["store-id", storeSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", storeSlug)
        .eq("is_active", true)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: !!storeSlug,
    staleTime: 1000 * 60 * 30, // 30 min cache
  });

  // Step 2: Get gateway config (cached)
  const { data: config } = useQuery({
    queryKey: ["store-gateway-installment-config", storeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gateway_checkout_config", {
        store_id_param: storeId!,
      });
      if (error) throw error;

      const gw = data as any;
      if (gw && gw.is_active && gw.installment_config) {
        return {
          freeInstallments: gw.installment_config.freeInstallments ?? 1,
          maxInstallments: gw.installment_config.maxInstallments ?? 12,
        } as InstallmentConfig;
      }
      return defaultConfig;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 10, // 10 min cache
  });

  return config || defaultConfig;
}

/**
 * Calculate the installment display text for product cards and quick buy dialogs.
 * 
 * Logic:
 * - If free installments > 1: show max free installments respecting R$20 min → "Até Nx de R$ X sem juros"
 * - If no free installments: show max installments respecting R$20 min → "Até Nx de R$ X"
 * - Returns null if price is too low for any installments (< R$40)
 */
export function getInstallmentDisplayText(
  price: number,
  config?: InstallmentConfig | null
): string | null {
  const { freeInstallments, maxInstallments } = config || defaultConfig;

  // Max installments possible with R$20 minimum
  const maxPossible = Math.floor(price / MIN_DISPLAY_INSTALLMENT_VALUE);

  if (maxPossible < 2) return null;

  // Try free installments first
  if (freeInstallments > 1) {
    const freeCount = Math.min(freeInstallments, maxPossible);
    if (freeCount >= 2) {
      return `Até ${freeCount}x de ${formatCurrency(price / freeCount)} sem juros`;
    }
  }

  // Fallback: regular installments (no "sem juros")
  const regularCount = Math.min(maxInstallments, maxPossible);
  if (regularCount >= 2) {
    return `Até ${regularCount}x de ${formatCurrency(price / regularCount)}`;
  }

  return null;
}
