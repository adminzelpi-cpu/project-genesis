import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { formatCurrency } from "@/lib/utils";

interface PaymentDisplayConfig {
  isActive: boolean;
  acceptCreditCard: boolean;
  acceptPix: boolean;
  acceptBoleto: boolean;
  pixDiscount: number;
  boletoDiscount: number;
}

const defaultConfig: PaymentDisplayConfig = {
  isActive: false,
  acceptCreditCard: true,
  acceptPix: true,
  acceptBoleto: true,
  pixDiscount: 0,
  boletoDiscount: 0,
};

/**
 * Hook to fetch payment display config (discounts + active methods) for the storefront.
 */
export function useStorePaymentConfig(storeSlugOverride?: string) {
  const contextSlug = useStoreSlug();
  const storeSlug = storeSlugOverride || contextSlug;

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
    staleTime: 1000 * 60 * 30,
  });

  const { data: config } = useQuery({
    queryKey: ["store-gateway-payment-config", storeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gateway_checkout_config", {
        store_id_param: storeId!,
      });
      if (error) throw error;

      const gw = data as any;
      if (gw && gw.is_active) {
        return {
          isActive: true,
          acceptCreditCard: gw.accept_credit_card ?? true,
          acceptPix: gw.accept_pix ?? true,
          acceptBoleto: gw.accept_boleto ?? true,
          pixDiscount: gw.pix_discount ?? 0,
          boletoDiscount: gw.boleto_discount ?? 0,
        } as PaymentDisplayConfig;
      }
      return defaultConfig;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 10,
  });

  return config || defaultConfig;
}

/**
 * Build the discount display text for Pix/Boleto on product pages.
 * 
 * Rules:
 * 1. Only show methods that are active AND have discount > 0
 * 2. If both active with same discount → "no Pix e Boleto"
 * 3. If different discounts → show only Pix (priority)
 * 4. If only Boleto has discount → "no Boleto"
 * 5. No discount → return null
 */
/**
 * Format discount percentage for display using Brazilian format (comma separator).
 * E.g. 5 → "5%", 5.5 → "5,5%", 10 → "10%"
 */
function formatDiscountPercent(value: number): string {
  // Remove trailing zeros: 5.0 → "5", 5.5 → "5,5"
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1).replace('.', ',');
  return `${formatted}%`;
}

export function getDiscountDisplayInfo(
  price: number,
  config: PaymentDisplayConfig
): { text: string; icon: "pix" | "boleto" } | null {
  if (!config.isActive || price <= 0) return null;

  // Values are stored as decimals (0.05 = 5%), convert to percentage for display
  const pixPercent = config.pixDiscount * 100;
  const boletoPercent = config.boletoDiscount * 100;

  const pixActive = config.acceptPix && config.pixDiscount > 0;
  const boletoActive = config.acceptBoleto && config.boletoDiscount > 0;

  if (!pixActive && !boletoActive) return null;

  // Both active with same discount
  if (pixActive && boletoActive && config.pixDiscount === config.boletoDiscount) {
    const discountedPrice = price * (1 - config.pixDiscount);
    return {
      text: `${formatCurrency(discountedPrice)} (${formatDiscountPercent(pixPercent)} OFF) no Pix e Boleto`,
      icon: "pix",
    };
  }

  // Both active with different discounts → prioritize Pix
  if (pixActive) {
    const discountedPrice = price * (1 - config.pixDiscount);
    return {
      text: `${formatCurrency(discountedPrice)} (${formatDiscountPercent(pixPercent)} OFF) no Pix`,
      icon: "pix",
    };
  }

  // Only Boleto
  if (boletoActive) {
    const discountedPrice = price * (1 - config.boletoDiscount);
    return {
      text: `${formatCurrency(discountedPrice)} (${formatDiscountPercent(boletoPercent)} OFF) no Boleto`,
      icon: "boleto",
    };
  }

  return null;
}
