import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ShippingQuote {
  service_code: string;
  service_name: string;
  carrier: string;
  price: number;
  original_price?: number;
  delivery_time: number;
  is_free: boolean;
}

export interface ShippingItem {
  weight?: number;
  length?: number;
  height?: number;
  width?: number;
  quantity: number;
  price: number;
}

export function useShippingCalculator() {
  const [isLoading, setIsLoading] = useState(false);
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [error, setError] = useState<string | null>(null);

  const calculateShipping = async (
    storeId: string,
    destinationCep: string,
    items: ShippingItem[]
  ) => {
    setIsLoading(true);
    setError(null);
    setQuotes([]);

    try {
      const cleanCep = destinationCep.replace(/\D/g, "");
      
      if (cleanCep.length !== 8) {
        setError("CEP inválido");
        return [];
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "frenet-calculate-shipping",
        {
          body: {
            storeId,
            destinationCep: cleanCep,
            items,
          },
        }
      );

      if (fnError) {
        console.error("Shipping calculation error:", fnError);
        setError("Erro ao calcular frete");
        return [];
      }

      if (!data?.success) {
        setError(data?.error || "Não foi possível calcular o frete");
        return [];
      }

      setQuotes(data.quotes || []);
      return data.quotes || [];
    } catch (err) {
      console.error("Error calculating shipping:", err);
      setError("Erro ao calcular frete");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const clearQuotes = () => {
    setQuotes([]);
    setError(null);
  };

  return {
    calculateShipping,
    clearQuotes,
    quotes,
    isLoading,
    error,
  };
}
