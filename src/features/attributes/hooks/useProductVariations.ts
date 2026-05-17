import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProductVariation } from "../types";

export const useProductVariations = (productId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: variations = [], isLoading } = useQuery({
    queryKey: ["product-variations-v2", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_variations_v2")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        images: v.images as any as Array<{ url: string; is_primary: boolean }> || []
      })) as ProductVariation[];
    },
    enabled: !!productId,
  });

  const saveVariations = useMutation({
    mutationFn: async ({
      productId,
      variations,
    }: {
      productId: string;
      variations: ProductVariation[];
    }) => {
      // Deletar variações antigas
      const { error: deleteError } = await supabase
        .from("product_variations_v2")
        .delete()
        .eq("product_id", productId);

      if (deleteError) throw deleteError;

      // Inserir novas variações
      if (variations.length > 0) {
        const { error: insertError } = await supabase
          .from("product_variations_v2")
          .insert(
            variations.map((v) => ({
              product_id: productId,
              sku: v.sku,
              price: v.price,
              stock_quantity: v.stock_quantity,
              image_url: v.image_url,
              attributes: v.attributes,
              is_active: v.is_active,
            }))
          );

        if (insertError) throw insertError;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["product-variations-v2", variables.productId],
      });
      toast({
        title: "Variações salvas",
        description: "As variações do produto foram atualizadas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar variações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    variations,
    isLoading,
    saveVariations: saveVariations.mutateAsync,
  };
};
