import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InstallmentConfig {
  maxInstallments: number;
  interestRate: number;
  freeInstallments: number;
  minInstallmentValue: number;
}

export interface GatewayCheckoutConfig {
  gatewayType: "pagarme" | "mercadopago" | null;
  isActive: boolean;
  installmentConfig: InstallmentConfig;
  pixDiscount: number;
  boletoDiscount: number;
  acceptCreditCard: boolean;
  acceptPix: boolean;
  acceptBoleto: boolean;
}

// Type for the RPC response
interface GatewayRpcResponse {
  gateway_type: string;
  is_active: boolean;
  pix_discount: number;
  boleto_discount: number;
  installment_config: InstallmentConfig;
  accept_credit_card: boolean;
  accept_pix: boolean;
  accept_boleto: boolean;
}

const defaultInstallmentConfig: InstallmentConfig = {
  maxInstallments: 12,
  interestRate: 2.99,
  freeInstallments: 1,
  minInstallmentValue: 5,
};

export function useGatewayConfig(storeId: string | undefined) {
  const [config, setConfig] = useState<GatewayCheckoutConfig>({
    gatewayType: null,
    isActive: false,
    installmentConfig: defaultInstallmentConfig,
    pixDiscount: 0,
    boletoDiscount: 0,
    acceptCreditCard: true,
    acceptPix: true,
    acceptBoleto: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Keep loading true while we don't have a storeId yet
    if (!storeId) {
      setIsLoading(true);
      return;
    }

    const fetchConfig = async () => {
      try {
        // Use the public RPC function that bypasses RLS and returns only checkout-safe config
        const { data, error } = await supabase.rpc("get_gateway_checkout_config", {
          store_id_param: storeId,
        });

        if (error) {
          console.error("Error fetching gateway config via RPC:", error);
          throw error;
        }

        console.log("Gateway config fetched:", data);

        // Cast the response to our expected type
        const gatewayData = data as unknown as GatewayRpcResponse | null;

        if (gatewayData && gatewayData.is_active) {
          setConfig({
            gatewayType: gatewayData.gateway_type as "pagarme" | "mercadopago",
            isActive: true,
            installmentConfig: gatewayData.installment_config || defaultInstallmentConfig,
            pixDiscount: gatewayData.pix_discount ?? 0,
            boletoDiscount: gatewayData.boleto_discount ?? 0,
            acceptCreditCard: gatewayData.accept_credit_card ?? true,
            acceptPix: gatewayData.accept_pix ?? true,
            acceptBoleto: gatewayData.accept_boleto ?? true,
          });
        } else {
          setConfig({
            gatewayType: null,
            isActive: false,
            installmentConfig: defaultInstallmentConfig,
            pixDiscount: 0,
            boletoDiscount: 0,
            acceptCreditCard: true,
            acceptPix: true,
            acceptBoleto: true,
          });
        }
      } catch (error) {
        console.error("Error fetching gateway config:", error);
        // Keep default config on error
        setConfig({
          gatewayType: null,
          isActive: false,
          installmentConfig: defaultInstallmentConfig,
          pixDiscount: 0,
          boletoDiscount: 0,
          acceptCreditCard: true,
          acceptPix: true,
          acceptBoleto: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [storeId]);

  // Calculate installment options with interest
  const calculateInstallments = (total: number) => {
    const { maxInstallments, interestRate, freeInstallments, minInstallmentValue } = config.installmentConfig;
    const options: Array<{
      quantity: number;
      value: number;
      interest: boolean;
      totalWithInterest: number;
    }> = [];

    for (let i = 1; i <= maxInstallments; i++) {
      let installmentValue: number;
      let totalWithInterest: number;
      const isInterestFree = i <= freeInstallments;

      if (isInterestFree) {
        installmentValue = total / i;
        totalWithInterest = total;
      } else {
        // Compound interest formula (Price system)
        const monthlyRate = interestRate / 100;
        const factor = (monthlyRate * Math.pow(1 + monthlyRate, i)) / 
                       (Math.pow(1 + monthlyRate, i) - 1);
        installmentValue = total * factor;
        totalWithInterest = installmentValue * i;
      }

      // Only add if installment value is above minimum
      if (installmentValue >= minInstallmentValue) {
        options.push({
          quantity: i,
          value: installmentValue,
          interest: !isInterestFree,
          totalWithInterest,
        });
      }
    }

    return options;
  };

  return {
    config,
    isLoading,
    calculateInstallments,
  };
}
