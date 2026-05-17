import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProductVariant {
  id?: string;
  product_id?: string;
  name: string;
  type: "color" | "size" | "style";
  value: string;
  image_url?: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

export const useProductVariantsMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saveVariants = useMutation({
    mutationFn: async ({
      productId,
      variants,
    }: {
      productId: string;
      variants: ProductVariant[];
    }) => {
      // Primeiro, deletar variantes antigas
      const { error: deleteError } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId);

      if (deleteError) throw deleteError;

      // Depois, inserir novas variantes
      if (variants.length > 0) {
        const variantsToInsert = variants.map((v) => ({
          product_id: productId,
          name: v.name,
          type: v.type,
          value: v.value,
          image_url: v.image_url,
          price_adjustment: v.price_adjustment,
          stock_quantity: v.stock_quantity,
          is_active: v.is_active,
        }));

        const { error: insertError } = await supabase
          .from("product_variants")
          .insert(variantsToInsert);

        if (insertError) throw insertError;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["product-variants", variables.productId],
      });
      toast({
        title: "Variantes salvas",
        description: "As variantes do produto foram atualizadas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar variantes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { saveVariants: saveVariants.mutateAsync, loading: saveVariants.isPending };
};

export const useLoadProductVariants = (productId?: string) => {
  return useQuery({
    queryKey: ["product-variants-edit", productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
};
