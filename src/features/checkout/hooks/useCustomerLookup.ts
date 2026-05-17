import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStoredCustomerSession } from "@/features/auth/hooks/useCustomerAuth";

interface CustomerAddress {
  id: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  is_default: boolean | null;
}

interface CustomerData {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  addresses: CustomerAddress[];
}

export function useCustomerLookup(storeId: string | undefined, cpf: string | undefined) {
  // Clean CPF for comparison (only digits)
  const cleanCpf = cpf?.replace(/\D/g, "") || "";
  const isValidCpf = cleanCpf.length === 11;

  return useQuery({
    queryKey: ["customer-lookup", storeId, cleanCpf, "auth-fallback"],
    queryFn: async (): Promise<CustomerData | null> => {
      if (!storeId) return null;

      const customerSelect = `
        id,
        nome,
        email,
        telefone,
        cpf,
        customer_addresses (
          id,
          cep,
          rua,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          is_default
        )
      `;

      // 1) Prioridade: busca por CPF quando válido
      if (isValidCpf) {
        const { data: customerByCpf, error: cpfError } = await supabase
          .from("customers")
          .select(customerSelect)
          .eq("store_id", storeId)
          .eq("cpf", cleanCpf)
          .maybeSingle();

        if (cpfError) {
          console.error("[useCustomerLookup] Error (CPF):", cpfError);
          return null;
        }

        if (customerByCpf) {
          return {
            id: customerByCpf.id,
            nome: customerByCpf.nome,
            email: customerByCpf.email,
            telefone: customerByCpf.telefone,
            cpf: customerByCpf.cpf,
            addresses: customerByCpf.customer_addresses || [],
          };
        }

        // CPF válido informado, mas cliente não encontrado
        return null;
      }

      // 2) Fallback: cliente logado via JWT customizado da loja
      const session = getStoredCustomerSession();
      if (!session || session.store_id !== storeId) return null;

      const { data: customerById, error: idError } = await supabase
        .from("customers")
        .select(customerSelect)
        .eq("store_id", storeId)
        .eq("id", session.customer_id)
        .maybeSingle();

      if (idError) {
        console.error("[useCustomerLookup] Error (customer_id):", idError);
        return null;
      }

      if (customerById) {
        return {
          id: customerById.id,
          nome: customerById.nome,
          email: customerById.email,
          telefone: customerById.telefone,
          cpf: customerById.cpf,
          addresses: customerById.customer_addresses || [],
        };
      }

      return null;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
