import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Order, StatusPedido } from "../types";
import { useToast } from "@/hooks/use-toast";
import { sendTransactionalEmail, buildOrderDataFromOrder, EmailType } from "@/features/emails";

export const useOrders = (storeId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const query = supabase
        .from("orders")
        .select("*")
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Fetch customer info separately since there's no FK
      const ordersWithCustomers = await Promise.all(
        (data || []).map(async (order) => {
          if (order.customer_id) {
            const { data: customer } = await supabase
              .from("customers")
              .select("nome, email")
              .eq("id", order.customer_id)
              .maybeSingle();

            return { ...order, customers: customer };
          }
          return { ...order, customers: null };
        })
      );

      return ordersWithCustomers as unknown as Order[];
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
      notifyCustomer = true,
    }: {
      orderId: string;
      status: StatusPedido;
      notifyCustomer?: boolean;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status_pedido: status })
        .eq("id", orderId);

      if (error) throw error;

      if (!notifyCustomer) {
        console.log(`[useOrders] Status updated without notification for order ${orderId}`);
        return;
      }

      // Send status update email
      try {
        // Get order with customer info using separate queries since there's no FK
        const { data: order } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (order && order.customer_id) {
          const { data: customer } = await supabase
            .from("customers")
            .select("nome, email")
            .eq("id", order.customer_id)
            .single();

          if (customer?.email) {
            const statusEmailMap: Record<string, EmailType | null> = {
              novo: null,
              em_preparo: "order_preparing",
              enviado: "order_shipped",
              entregue: "order_delivered",
              cancelado: "order_cancelled",
              devolvido: null,
            };

            const emailType = statusEmailMap[status];
            
            if (emailType) {
              const orderData = buildOrderDataFromOrder(order);
              
              await sendTransactionalEmail({
                store_id: order.store_id,
                order_id: orderId,
                email_type: emailType,
                recipient_email: customer.email,
                recipient_name: customer.nome,
                order_data: orderData,
              });

              console.log(`[useOrders] Status email (${emailType}) sent for order ${orderId}`);
            }
          }
        }
      } catch (emailError) {
        console.error("[useOrders] Failed to send status email:", emailError);
        // Don't throw - email failure shouldn't block status update
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      toast({
        title: "Status atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    },
  });

  return {
    orders,
    isLoading,
    updateOrderStatus: updateOrderStatusMutation.mutate,
  };
};

export const useOrder = (orderId: string) => {
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return data as unknown as Order;
    },
    enabled: !!orderId,
  });

  return { order, isLoading };
};
