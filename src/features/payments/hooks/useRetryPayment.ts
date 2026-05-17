import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentProcessor, PaymentResult } from "./usePaymentProcessor";
import { useToast } from "@/hooks/use-toast";

interface OrderForRetry {
  id: string;
  order_number?: number;
  store_id: string;
  total: number;
  subtotal: number;
  frete: number;
  desconto: number;
  status_pagamento: string;
  forma_pagamento: string | null;
  products: any[];
  customer_id: string | null;
  endereco_entrega: any;
  customer?: {
    id: string;
    nome: string;
    email: string | null;
    telefone: string | null;
    cpf: string | null;
  };
  store?: {
    slug: string;
    name: string;
    order_prefix: string | null;
  };
}

interface RetryPaymentParams {
  orderId: string;
  paymentMethod: "pix" | "boleto" | "credit_card";
  card?: {
    number: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
  };
  installments?: number;
}

export function useRetryPayment(orderId: string | undefined) {
  const { toast } = useToast();
  const { processPayment, isProcessing } = usePaymentProcessor();

  // Fetch order data for retry
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order-for-retry", orderId],
    queryFn: async (): Promise<OrderForRetry | null> => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          store:stores(slug, name, order_prefix)
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching order:", error);
        throw error;
      }

      if (!data) return null;

      const storeData = Array.isArray(data.store) ? data.store[0] : data.store;

      // Fetch customer separately since there's no FK between orders and customers
      let customerData = null;
      if (data.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id, nome, email, telefone, cpf")
          .eq("id", data.customer_id)
          .maybeSingle();
        customerData = customer;
      }

      return {
        ...data,
        customer: customerData,
        store: storeData,
      } as OrderForRetry;
    },
    enabled: !!orderId,
  });

  // Check if order can be retried
  const canRetry = order && 
    ["pendente", "expirado", "recusado", "rejeitado", "falhou"].includes(order.status_pagamento);

  // Retry payment mutation
  const retryMutation = useMutation({
    mutationFn: async (params: RetryPaymentParams): Promise<PaymentResult> => {
      if (!order) {
        throw new Error("Pedido não encontrado");
      }

      if (!order.customer) {
        throw new Error("Dados do cliente não encontrados");
      }

      const billingAddress = order.endereco_entrega ? {
        line_1: `${order.endereco_entrega.rua || order.endereco_entrega.street}, ${order.endereco_entrega.numero || order.endereco_entrega.number}`,
        line_2: order.endereco_entrega.complemento || order.endereco_entrega.complement,
        zip_code: (order.endereco_entrega.cep || order.endereco_entrega.zip_code || "").replace(/\D/g, ""),
        neighborhood: order.endereco_entrega.bairro || order.endereco_entrega.neighborhood || "",
        city: order.endereco_entrega.cidade || order.endereco_entrega.city,
        state: order.endereco_entrega.estado || order.endereco_entrega.state,
        country: "BR",
      } : undefined;

      const result = await processPayment({
        storeId: order.store_id,
        orderId: order.id,
        paymentMethod: params.paymentMethod,
        amount: Number(Number(order.total).toFixed(2)),
        description: `Pedido ${order.id}`,
        customer: {
          name: order.customer.nome,
          email: order.customer.email || "",
          document: order.customer.cpf || "",
          phone: order.customer.telefone || undefined,
        },
        card: params.card,
        installments: params.installments,
        billingAddress,
      });

      if (result.success) {
        // Always update order payment status and method on successful retry
        const updateData: Record<string, any> = {
          status_pagamento: result.status === "paid" ? "aprovado" : "pendente",
          updated_at: new Date().toISOString(),
        };
        // Update payment method if changed
        if (params.paymentMethod !== order.forma_pagamento) {
          updateData.forma_pagamento = params.paymentMethod;
        }
        await supabase
          .from("orders")
          .update(updateData)
          .eq("id", order.id);
      }

      return result;
    },
    onError: (error) => {
      console.error("Retry payment error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar pagamento",
      });
    },
  });

  // Generate order number using sequential number
  const orderNumber = order?.order_number 
    ? `${order.order_number}`
    : order?.id.substring(0, 8).toUpperCase();

  return {
    order,
    orderNumber,
    isLoading,
    error,
    canRetry,
    retryPayment: retryMutation.mutateAsync,
    isRetrying: retryMutation.isPending || isProcessing,
  };
}
