import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createMercadoPagoCardToken } from "@/features/payments/lib/mercadoPagoCardToken";

interface PaymentCustomer {
  name: string;
  email: string;
  document: string;
  phone?: string;
}

interface CreditCardData {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
}

interface BillingAddress {
  line_1: string;
  line_2?: string;
  zip_code: string;
  neighborhood?: string;
  city: string;
  state: string;
  country: string;
}

interface ProcessPaymentParams {
  storeId: string;
  orderId: string;
  paymentMethod: "pix" | "boleto" | "credit_card";
  amount: number;
  description: string;
  customer: PaymentCustomer;
  card?: CreditCardData;
  /** Optional pre-tokenized card (Mercado Pago) — skips tokenization in the processor */
  preTokenizedCard?: string;
  installments?: number;
  billingAddress?: BillingAddress;
  /** If provided, skips the gateway config lookup */
  gatewayType?: "pagarme" | "mercadopago" | "mercado_pago";
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  externalId?: string;
  status?: string;
  statusDetail?: string;
  error?: string;
  errorCode?: string;
  pix?: {
    qrCode: string;
    qrCodeBase64: string;
    expirationDate: string;
  };
  boleto?: {
    barcode: string;
    barcodeUrl: string;
    expirationDate: string;
  };
}

export interface GatewayInfo {
  type: "pagarme" | "mercadopago" | "mercado_pago" | null;
  isActive: boolean;
  displayName?: string;
}

export function usePaymentProcessor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Check which gateway is active for the store
  // NOTE: This must work for anonymous checkout, so we use the checkout-safe RPC
  // that bypasses RLS and exposes only non-sensitive config.
  const getActiveGateway = async (storeId: string): Promise<GatewayInfo> => {
    const { data, error } = await supabase.rpc("get_gateway_checkout_config", {
      store_id_param: storeId,
    });

    if (error || !data) {
      console.error("Error fetching gateway config via RPC:", error);
      return { type: null, isActive: false };
    }

    const gatewayType = (data as any)?.gateway_type as GatewayInfo["type"];
    const isActive = Boolean((data as any)?.is_active);

    if (!isActive || (gatewayType !== "pagarme" && gatewayType !== "mercadopago" && gatewayType !== "mercado_pago")) {
      return { type: null, isActive: false };
    }

    return {
      type: gatewayType,
      isActive: true,
      displayName: gatewayType === "pagarme" ? "Pagar.me" : "Mercado Pago",
    };
  };

  // Process payment with Pagar.me
  const processWithPagarme = async (
    params: ProcessPaymentParams
  ): Promise<PaymentResult> => {
    const { data, error } = await supabase.functions.invoke(
      "pagarme-create-payment",
      {
        body: {
          storeId: params.storeId,
          orderId: params.orderId,
          paymentMethod: params.paymentMethod,
          amount: params.amount,
          description: params.description,
          customer: {
            name: params.customer.name,
            email: params.customer.email,
            document: params.customer.document,
            phones: params.customer.phone
              ? {
                  mobile_phone: parsePhone(params.customer.phone),
                }
              : undefined,
          },
          card: params.card,
          installments: params.installments,
          billingAddress: params.billingAddress,
        },
      }
    );

     if (error) {
       // supabase-js returns FunctionsHttpError for non-2xx responses.
       // Try to extract the JSON error body from the response for a user-friendly message.
       let message = "Erro ao processar pagamento";
       let code: string | undefined;

       try {
         // Try the context.response approach (supabase-js v2)
         const context = (error as any)?.context;
         const response = context?.response ?? context;
         if (response && typeof response.json === "function") {
           const parsed = await response.json();
           message = parsed?.error || parsed?.message || message;
           code = parsed?.code || code;
         } else if (error.message && !error.message.includes("non-2xx")) {
           message = error.message;
         }
       } catch {
         // If parsing fails, use the error message if it's meaningful
         if (error.message && !error.message.includes("non-2xx")) {
           message = error.message;
         }
       }

       console.error("Error calling pagarme-create-payment:", error);
       return {
         success: false,
         error: message,
         errorCode: code,
       };
     }

    if (data?.error) {
      return {
        success: false,
        error: data.error,
        errorCode: data.code,
      };
    }

    return {
      success: true,
      transactionId: data.transactionId,
      externalId: data.externalId,
      status: data.status,
      statusDetail: data.statusDetail,
      pix: data.pix,
      boleto: data.boleto,
    };
  };

  // Process payment with Mercado Pago
  const processWithMercadoPago = async (
    params: ProcessPaymentParams
  ): Promise<PaymentResult> => {
    // Mercado Pago requires the card to be tokenized in the browser using their public key.
    // Raw card data must NEVER reach the backend (PCI compliance).
    let cardToken: string | undefined = params.preTokenizedCard;
    if (params.paymentMethod === "credit_card" && !cardToken) {
      if (!params.card) {
        return {
          success: false,
          error: "Dados do cartão não fornecidos",
          errorCode: "MISSING_CARD",
        };
      }
      try {
        cardToken = await createMercadoPagoCardToken({
          storeId: params.storeId,
          cardNumber: params.card.number,
          holderName: params.card.holder_name,
          expMonth: params.card.exp_month,
          expYear: params.card.exp_year,
          cvv: params.card.cvv,
          document: params.customer.document,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao validar cartão";
        console.error("MP card tokenization failed:", e);
        return {
          success: false,
          error: msg,
          errorCode: "CARD_TOKENIZATION_FAILED",
        };
      }
    }

    const { data, error } = await supabase.functions.invoke(
      "mercadopago-create-payment",
      {
        body: {
          storeId: params.storeId,
          orderId: params.orderId,
          paymentMethod: params.paymentMethod,
          amount: params.amount,
          description: params.description,
          customer: {
            name: params.customer.name,
            email: params.customer.email,
            document: params.customer.document,
            phone: params.customer.phone,
          },
          // Send the tokenized card (NOT raw card data) for credit card payments
          cardToken,
          installments: params.installments,
          billingAddress: params.billingAddress,
        },
      }
    );

    if (error) {
      let message = "Erro ao processar pagamento";
      let code: string | undefined;

      try {
        const context = (error as any)?.context;
        const response = context?.response ?? context;
        if (response && typeof response.json === "function") {
          const parsed = await response.json();
          message = parsed?.error || parsed?.message || message;
          code = parsed?.code || code;
        } else if (error.message && !error.message.includes("non-2xx")) {
          message = error.message;
        }
      } catch {
        if (error.message && !error.message.includes("non-2xx")) {
          message = error.message;
        }
      }

      console.error("Error calling mercadopago-create-payment:", error);
      return {
        success: false,
        error: message,
        errorCode: code,
      };
    }

    if (data?.error) {
      return {
        success: false,
        error: data.error,
        errorCode: data.code,
      };
    }

    return {
      success: true,
      transactionId: data.transactionId,
      externalId: data.externalId,
      status: data.status,
      statusDetail: data.statusDetail,
      pix: data.pix,
      boleto: data.boleto,
    };
  };

  // Main function to process payment
  const processPayment = async (
    params: ProcessPaymentParams
  ): Promise<PaymentResult> => {
    setIsProcessing(true);

    try {
      // Use provided gateway type or fetch it
      let gatewayType = params.gatewayType;
      if (!gatewayType) {
        const gateway = await getActiveGateway(params.storeId);
        if (!gateway.isActive || !gateway.type) {
          return {
            success: false,
            error: "Nenhum gateway de pagamento configurado para esta loja",
            errorCode: "NO_GATEWAY",
          };
        }
        gatewayType = gateway.type;
      }

      let result: PaymentResult;

      if (gatewayType === "pagarme") {
        result = await processWithPagarme(params);
      } else if (gatewayType === "mercadopago" || gatewayType === "mercado_pago") {
        // Mercado Pago uses the same edge function pattern
        result = await processWithMercadoPago(params);
      } else {
        return {
          success: false,
          error: "Gateway não suportado",
          errorCode: "UNSUPPORTED_GATEWAY",
        };
      }

      if (!result.success && result.error) {
        // Error will be handled inline by the UI component via paymentErrorMapping
        // No toast here to avoid duplicate notifications
      }

      return result;
    } catch (error) {
      console.error("Payment processing error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        variant: "destructive",
        title: "Erro ao processar pagamento",
        description: errorMessage,
      });
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processPayment,
    getActiveGateway,
    isProcessing,
  };
}

// Helper to parse Brazilian phone number
function parsePhone(phone: string): {
  country_code: string;
  area_code: string;
  number: string;
} {
  const cleaned = phone.replace(/\D/g, "");

  // Brazilian phone: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
  if (cleaned.length >= 10) {
    return {
      country_code: "55",
      area_code: cleaned.substring(0, 2),
      number: cleaned.substring(2),
    };
  }

  return {
    country_code: "55",
    area_code: "11",
    number: cleaned,
  };
}
