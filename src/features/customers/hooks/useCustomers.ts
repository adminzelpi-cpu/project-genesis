import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Customer, CustomerFormData } from "../types";
import { useToast } from "@/hooks/use-toast";

export const useCustomers = (storeId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", storeId],
    queryFn: async () => {
      const query = supabase
        .from("customers")
        .select(`
          *,
          customer_addresses(*)
        `)
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as Customer[];
    },
    enabled: !!storeId,
  });

  const createCustomerMutation = useMutation({
    mutationFn: async ({ storeId, data }: { storeId: string; data: CustomerFormData }) => {
      const { rua, numero, complemento, bairro, cidade, estado, cep, ...customerData } = data;

      // Inserir cliente
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          store_id: storeId,
          ...customerData,
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // Se houver dados de endereço, inserir endereço
      if (rua && numero && bairro && cidade && estado && cep) {
        const { error: addressError } = await supabase
          .from("customer_addresses")
          .insert({
            customer_id: customer.id,
            tipo: "principal",
            rua,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            cep,
            is_default: true,
          });

        if (addressError) throw addressError;
      }

      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Cliente criado",
        description: "O cliente foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar cliente",
        description: error.message,
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: CustomerFormData }) => {
      const { rua, numero, complemento, bairro, cidade, estado, cep, ...customerData } = data;

      // Atualizar cliente
      const { error: customerError } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", customerId);

      if (customerError) throw customerError;

      // Se houver dados de endereço, atualizar ou criar endereço padrão
      if (rua && numero && bairro && cidade && estado && cep) {
        // Verificar se existe endereço padrão
        const { data: existingAddress } = await supabase
          .from("customer_addresses")
          .select("id")
          .eq("customer_id", customerId)
          .eq("is_default", true)
          .maybeSingle();

        if (existingAddress) {
          // Atualizar endereço existente
          const { error: addressError } = await supabase
            .from("customer_addresses")
            .update({
              rua,
              numero,
              complemento,
              bairro,
              cidade,
              estado,
              cep,
            })
            .eq("id", existingAddress.id);

          if (addressError) throw addressError;
        } else {
          // Criar novo endereço
          const { error: addressError } = await supabase
            .from("customer_addresses")
            .insert({
              customer_id: customerId,
              tipo: "principal",
              rua,
              numero,
              complemento,
              bairro,
              cidade,
              estado,
              cep,
              is_default: true,
            });

          if (addressError) throw addressError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
      toast({
        title: "Cliente atualizado",
        description: "Os dados do cliente foram atualizados com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar cliente",
        description: error.message,
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir cliente",
        description: error.message,
      });
    },
  });

  return {
    customers,
    isLoading,
    createCustomer: createCustomerMutation.mutate,
    updateCustomer: updateCustomerMutation.mutate,
    deleteCustomer: deleteCustomerMutation.mutate,
  };
};

export const useCustomer = (customerId: string) => {
  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(`
          *,
          customer_addresses(*)
        `)
        .eq("id", customerId)
        .single();

      if (error) throw error;
      return data as unknown as Customer;
    },
    enabled: !!customerId,
  });

  return { customer, isLoading };
};
