import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckoutFormData } from "../components/CheckoutForm";

export const useCheckout = () => {
  const { toast } = useToast();

  const createOrderMutation = useMutation({
    mutationFn: async ({
      storeId,
      items,
      formData,
    }: {
      storeId: string;
      items: Array<{
        productId: string;
        name: string;
        quantity: number;
        price: number;
      }>;
      formData: CheckoutFormData;
    }) => {
      // Calcular totais
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const frete = 0; // Por enquanto sem cálculo de frete
      const desconto = 0;
      const total = subtotal + frete - desconto;

      // Primeiro, criar ou buscar o cliente
      let customerId: string | null = null;

      if (formData.email) {
        // Tentar buscar cliente existente por email
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("store_id", storeId)
          .eq("email", formData.email)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;

          // Atualizar dados do cliente
          await supabase
            .from("customers")
            .update({
              nome: formData.nome,
              telefone: formData.telefone,
              cpf: formData.cpf,
            })
            .eq("id", customerId);
        }
      }

      // Se não encontrou cliente existente, criar novo
      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            store_id: storeId,
            nome: formData.nome,
            email: formData.email || undefined,
            telefone: formData.telefone,
            cpf: formData.cpf || undefined,
          })
          .select("id")
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;

        // Criar endereço do cliente
        await supabase.from("customer_addresses").insert({
          customer_id: customerId,
          tipo: "entrega",
          rua: formData.rua,
          numero: formData.numero,
          complemento: formData.complemento || undefined,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
          cep: formData.cep,
          is_default: true,
        });
      }

      // Preparar produtos para o pedido
      const orderProducts = items.map((item) => ({
        id: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      }));

      // Criar o pedido
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          store_id: storeId,
          customer_id: customerId,
          products: orderProducts,
          subtotal,
          frete,
          desconto,
          total,
          forma_pagamento: formData.forma_pagamento,
          status_pagamento: "pendente",
          status_pedido: "novo",
          endereco_entrega: {
            rua: formData.rua,
            numero: formData.numero,
            complemento: formData.complemento,
            bairro: formData.bairro,
            cidade: formData.cidade,
            estado: formData.estado,
            cep: formData.cep,
          },
          observacao_cliente: formData.observacao_cliente || undefined,
        })
        .select()
        .single();

      if (orderError) throw orderError;
      return order;
    },
    onSuccess: (order) => {
      toast({
        title: "Pedido realizado com sucesso!",
        description: `Número do pedido: #${order.order_number || order.id.slice(0, 8)}`,
      });
    },
    onError: (error) => {
      console.error("Erro ao criar pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro ao finalizar pedido",
        description: "Ocorreu um erro ao processar seu pedido. Tente novamente.",
      });
    },
  });

  return {
    createOrder: createOrderMutation.mutate,
    isCreatingOrder: createOrderMutation.isPending,
  };
};
