import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DynamicInstallmentOption {
  quantity: number;
  value: number;
  interest: boolean;
  totalWithInterest: number;
  rate?: number;
}

interface UseDynamicInstallmentsProps {
  storeId: string | undefined;
  amount: number;
  gatewayType: "pagarme" | "mercadopago" | "mercado_pago" | null;
  isActive: boolean;
}

/**
 * Fetches dynamic installment options from Mercado Pago API.
 * Falls back to null if the gateway is Pagar.me or if the fetch fails.
 */
export function useDynamicInstallments({
  storeId,
  amount,
  gatewayType,
  isActive,
}: UseDynamicInstallmentsProps) {
  const [dynamicInstallments, setDynamicInstallments] = useState<DynamicInstallmentOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDynamic, setIsDynamic] = useState(false);

  useEffect(() => {
    // Only fetch for Mercado Pago
    if (!storeId || !isActive || (gatewayType !== "mercadopago" && gatewayType !== "mercado_pago") || amount <= 0) {
      setDynamicInstallments(null);
      setIsDynamic(false);
      return;
    }

    const fetchInstallments = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("mercadopago-installments", {
          body: { storeId, amount },
        });

        if (error) {
          console.error("Error fetching dynamic installments:", error);
          setDynamicInstallments(null);
          setIsDynamic(false);
          return;
        }

        if (data?.dynamic && data?.installments?.length > 0) {
          setDynamicInstallments(data.installments);
          setIsDynamic(true);
        } else {
          setDynamicInstallments(null);
          setIsDynamic(false);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic installments:", err);
        setDynamicInstallments(null);
        setIsDynamic(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce to avoid rapid calls when amount changes
    const timer = setTimeout(fetchInstallments, 300);
    return () => clearTimeout(timer);
  }, [storeId, amount, gatewayType, isActive]);

  return { dynamicInstallments, isLoading, isDynamic };
}
