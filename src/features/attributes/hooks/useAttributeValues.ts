import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AttributeValue } from "../types";

export const useAttributeValues = (attributeId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attributeValues, isLoading } = useQuery({
    queryKey: ["attribute-values", attributeId],
    queryFn: async () => {
      if (!attributeId) return [];

      const { data, error } = await supabase
        .from("attribute_values")
        .select("*")
        .eq("attribute_id", attributeId)
        .order("value", { ascending: true });

      if (error) throw error;
      return data as AttributeValue[];
    },
    enabled: !!attributeId,
  });

  const createValue = useMutation({
    mutationFn: async (newValue: Omit<AttributeValue, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("attribute_values")
        .insert([newValue])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attribute-values", attributeId] });
      toast({
        title: "Valor adicionado",
        description: "O valor foi adicionado ao atributo com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar valor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    attributeValues,
    isLoading,
    createValue: createValue.mutateAsync,
  };
};
