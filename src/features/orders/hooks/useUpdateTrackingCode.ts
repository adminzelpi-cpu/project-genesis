import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendTransactionalEmail, buildOrderDataFromOrder } from "@/features/emails";

interface UpdateTrackingCodeParams {
  orderId: string;
  trackingCode: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  autoSendEmail?: boolean;
}

export function useUpdateTrackingCode() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, trackingCode, trackingCarrier, trackingUrl, autoSendEmail = false }: UpdateTrackingCodeParams) => {
      // Update tracking code, carrier and url
      const { error } = await supabase
        .from("orders")
        .update({ 
          tracking_code: trackingCode,
          tracking_carrier: trackingCarrier || null,
          tracking_url: trackingUrl || null,
          tracking_code_sent_at: autoSendEmail ? new Date().toISOString() : null,
          status_pedido: "enviado",
        })
        .eq("id", orderId);

      if (error) throw error;

      // Send email if auto-send is enabled
      if (autoSendEmail && trackingCode) {
        const { data: order } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (order?.customer_id) {
          const { data: customer } = await supabase
            .from("customers")
            .select("nome, email")
            .eq("id", order.customer_id)
            .single();

          if (customer?.email) {
            const orderData = {
              ...buildOrderDataFromOrder(order),
              tracking_code: trackingCode,
              tracking_carrier: trackingCarrier,
              tracking_url: trackingUrl,
            };

            await sendTransactionalEmail({
              store_id: order.store_id,
              order_id: orderId,
              email_type: "tracking_code",
              recipient_email: customer.email,
              recipient_name: customer.nome,
              order_data: orderData,
            });
          }
        }
      }

      return { orderId, trackingCode, emailSent: autoSendEmail };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      
      toast({
        title: "Código de rastreio atualizado",
        description: data.emailSent 
          ? "O código foi salvo e o e-mail foi enviado ao cliente."
          : "O código foi salvo com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Error updating tracking code:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o código de rastreio.",
      });
    },
  });
}

export function useSendTrackingEmail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (!order) throw new Error("Pedido não encontrado");
      if (!order.tracking_code) throw new Error("Código de rastreio não preenchido");

      if (order.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("nome, email")
          .eq("id", order.customer_id)
          .single();

        if (!customer?.email) throw new Error("Cliente sem e-mail cadastrado");

        const orderData = {
          ...buildOrderDataFromOrder(order),
          tracking_code: order.tracking_code,
          tracking_carrier: order.tracking_carrier,
          tracking_url: order.tracking_url,
        };

        await sendTransactionalEmail({
          store_id: order.store_id,
          order_id: orderId,
          email_type: "tracking_code",
          recipient_email: customer.email,
          recipient_name: customer.nome,
          order_data: orderData,
        });

        // Update sent timestamp
        await supabase
          .from("orders")
          .update({ tracking_code_sent_at: new Date().toISOString() })
          .eq("id", orderId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order"] });
      toast({
        title: "E-mail enviado",
        description: "O código de rastreio foi enviado ao cliente.",
      });
    },
    onError: (error: Error) => {
      console.error("Error sending tracking email:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar e-mail",
        description: error.message,
      });
    },
  });
}