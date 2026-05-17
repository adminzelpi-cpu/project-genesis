import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Attribute, AttributeValue } from "../types";

export const useAttributes = (storeId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ["attributes", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from("attributes")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Attribute[];
    },
    enabled: !!storeId,
  });

  const createAttribute = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: string }) => {
      if (!storeId) throw new Error("Store ID is required");

      const { data, error } = await supabase
        .from("attributes")
        .insert({ store_id: storeId, name, type })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes", storeId] });
      toast({
        title: "Atributo criado",
        description: "O atributo foi criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar atributo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAttribute = useMutation({
    mutationFn: async (attributeId: string) => {
      const { error } = await supabase
        .from("attributes")
        .delete()
        .eq("id", attributeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes", storeId] });
      toast({
        title: "Atributo excluído",
        description: "O atributo foi excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir atributo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    attributes,
    isLoading,
    createAttribute: createAttribute.mutateAsync,
    deleteAttribute: deleteAttribute.mutateAsync,
  };
};

export const useAttributeValues = (attributeId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: values = [], isLoading } = useQuery({
    queryKey: ["attribute-values", attributeId],
    queryFn: async () => {
      if (!attributeId) return [];
      
      const { data, error } = await supabase
        .from("attribute_values")
        .select("*")
        .eq("attribute_id", attributeId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as AttributeValue[];
    },
    enabled: !!attributeId,
  });

  const createValue = useMutation({
    mutationFn: async ({ value, color_hex, size_category }: { value: string; color_hex?: string; size_category?: string }) => {
      if (!attributeId) throw new Error("Attribute ID is required");

      const insertData: Record<string, any> = { attribute_id: attributeId, value };
      if (color_hex) insertData.color_hex = color_hex;
      if (size_category) insertData.size_category = size_category;

      const { data, error } = await supabase
        .from("attribute_values")
        .insert({ attribute_id: attributeId, value, color_hex: color_hex || null, size_category: size_category || null })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attribute-values", attributeId] });
      toast({
        title: "Valor adicionado",
        description: "O valor foi adicionado ao atributo",
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

  const updateValue = useMutation({
    mutationFn: async ({ id, value, color_hex, size_category }: { id: string; value: string; color_hex?: string | null; size_category?: string | null }) => {
      const updateData: Record<string, any> = { value };
      if (color_hex !== undefined) updateData.color_hex = color_hex;
      if (size_category !== undefined) updateData.size_category = size_category;

      const { data, error } = await supabase
        .from("attribute_values")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attribute-values", attributeId] });
      toast({
        title: "Valor atualizado",
        description: "O valor foi atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar valor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteValue = useMutation({
    mutationFn: async (valueId: string) => {
      const { error } = await supabase
        .from("attribute_values")
        .delete()
        .eq("id", valueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attribute-values", attributeId] });
      toast({
        title: "Valor excluído",
        description: "O valor foi excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir valor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    values,
    isLoading,
    createValue: createValue.mutateAsync,
    updateValue: updateValue.mutateAsync,
    deleteValue: deleteValue.mutateAsync,
  };
};
