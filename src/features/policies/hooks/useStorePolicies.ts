import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { toast } from "sonner";

export interface StorePolicy {
  id: string;
  store_id: string;
  policy_type: string;
  title: string;
  slug: string;
  content: string | null;
  summary: string | null;
  is_published: boolean;
  is_auto_generated: boolean;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useStorePolicies = () => {
  const { store } = useActiveStore();
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["store-policies", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data, error } = await supabase
        .from("store_policies")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as StorePolicy[];
    },
    enabled: !!store?.id,
  });

  const generatePolicies = useMutation({
    mutationFn: async (policyTypes?: string[]) => {
      if (!store?.id) throw new Error("Store not found");

      const { data, error } = await supabase.functions.invoke("generate-policies", {
        body: { storeId: store.id, policyTypes },
      });

      if (error) throw error;
      if (data.error) {
        if (data.missingFields) {
          throw new Error(`Preencha os campos obrigatórios: ${data.missingFields.join(", ")}`);
        }
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["store-policies", store?.id] });
      toast.success(`${data.count} política(s) gerada(s) com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, content, summary, is_published }: { id: string; content?: string; summary?: string; is_published?: boolean }) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (content !== undefined) {
        updateData.content = content;
        updateData.is_auto_generated = false;
      }
      if (summary !== undefined) {
        updateData.summary = summary;
      }
      if (is_published !== undefined) {
        updateData.is_published = is_published;
      }

      const { data, error } = await supabase
        .from("store_policies")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-policies", store?.id] });
      toast.success("Política atualizada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_policies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-policies", store?.id] });
      toast.success("Política removida!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    policies,
    isLoading,
    generatePolicies,
    updatePolicy,
    deletePolicy,
    hasGeneratedPolicies: policies.length > 0,
  };
};
